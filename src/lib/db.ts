import { DatabaseSync } from "node:sqlite";
import LibsqlDatabase from "libsql";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Base de datos de VXCore Admin.
 *
 * Dos modos:
 * - LOCAL (por defecto): SQLite en `VXCORE_DATA_DIR` (la carpeta data de la
 *   web) usando node:sqlite. Misma base de datos que la web.
 * - REMOTO (Vercel): si existe `TURSO_DATABASE_URL`, usa Turso/libSQL
 *   (SQLite en la nube). El SQL es idéntico.
 */

type Row = Record<string, unknown>;

type Stmt = {
  run(...params: unknown[]): { lastInsertRowid: number | bigint };
  get(...params: unknown[]): Row | undefined;
  all(...params: unknown[]): Row[];
};

type Driver = {
  exec(sql: string): void;
  prepare(sql: string): Stmt;
};

/**
 * Errores de configuración de la base de datos. En producción (Vercel) la
 * app NO debe crashear si falta Turso: degrada a una base en memoria y
 * expone el error para que la interfaz muestre un aviso de configuración.
 */
let dbError: string | null = null;

/**
 * Mensaje de error de configuración, si lo hay (null = todo OK).
 * Fuerza la inicialización: en la primera llamada del proceso (p. ej. un
 * webhook o una ruta API) la BD todavía no se ha creado, y sin esto un fallo
 * de configuración pasaría desapercibido en la primera petición.
 */
export function getDbError(): string | null {
  getDb();
  return dbError;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    image TEXT,
    provider TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    user_name TEXT,
    stripe_session_id TEXT,
    stripe_customer_id TEXT,
    payment_intent TEXT,
    amount_cents INTEGER,
    currency TEXT DEFAULT 'eur',
    plan_name TEXT DEFAULT 'Pro',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    paid_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(user_email);

  CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_key TEXT NOT NULL UNIQUE,
    user_email TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(user_email);

  CREATE TABLE IF NOT EXISTS installers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL,
    filename TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    is_latest INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    asset_id INTEGER,
    asset_repo TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    sender TEXT NOT NULL DEFAULT 'user',
    body TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    ticket_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_email);

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    subject TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    rating INTEGER,
    rating_comment TEXT,
    closed_at TEXT,
    rated_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_tickets_email ON tickets(user_email);

  -- Equipos donde está instalada la app de escritorio. La escribe la web al
  -- validar la licencia (el agente valida cada 10 min); aquí sólo se lee.
  -- Definida también en este esquema porque admin y web comparten base y
  -- cualquiera de las dos puede crearla primero.
  CREATE TABLE IF NOT EXISTS installations (
    id TEXT PRIMARY KEY,
    license_key TEXT NOT NULL,
    name TEXT,
    first_seen TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_installations_license ON installations(license_key);

  -- Túnel de Cloudflare de cada equipo: es lo que le da al cliente su enlace
  -- público. La escribe la web al aprovisionar; aquí sólo se lee.
  --
  -- Igual que installations, se declara también aquí porque admin y web
  -- comparten base y cualquiera de las dos puede arrancar primero.
  CREATE TABLE IF NOT EXISTS tunnels (
    installation_id TEXT PRIMARY KEY,
    installation_name TEXT NOT NULL DEFAULT '',
    license_key TEXT NOT NULL,
    hostname TEXT NOT NULL,
    tunnel_id TEXT NOT NULL,
    tunnel_secret TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_tunnels_license ON tunnels(license_key);
`;

/**
 * Columnas añadidas después de la primera versión del esquema.
 *
 * `CREATE TABLE IF NOT EXISTS` no toca una tabla que ya existe, así que las
 * bases creadas antes se quedarían sin estas columnas. SQLite no tiene
 * `ADD COLUMN IF NOT EXISTS`, de ahí la comprobación con PRAGMA.
 */
const MIGRATIONS: { table: string; column: string; type: string }[] = [
  { table: "installers", column: "asset_id", type: "INTEGER" },
  { table: "installers", column: "asset_repo", type: "TEXT" },
  { table: "messages", column: "ticket_id", type: "INTEGER" },
];

function migrate(driver: Driver): void {
  const columnsByTable = new Map<string, Set<string>>();

  for (const { table, column, type } of MIGRATIONS) {
    let existing = columnsByTable.get(table);
    if (!existing) {
      const info = driver.prepare(`PRAGMA table_info(${table})`).all();
      existing = new Set(info.map((row) => String(row.name)));
      columnsByTable.set(table, existing);
    }
    if (existing.has(column)) continue;
    driver.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    existing.add(column);
  }
}

/** ¿Modo remoto (Turso)? Se activa configurando TURSO_DATABASE_URL. */
export function isRemote(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL);
}

export function getDataDir(): string {
  if (process.env.VXCORE_DATA_DIR) {
    return process.env.VXCORE_DATA_DIR;
  }
  // Por defecto: la carpeta "data" de la web, que vive al lado de esta app.
  return path.join(path.dirname(process.cwd()), "VXCore Web", "data");
}

let db: Driver | null = null;

function makeMemoryDriver(): Driver {
  const raw = new DatabaseSync(":memory:", {});
  raw.exec(SCHEMA);
  return {
    exec: (sql) => raw.exec(sql),
    prepare: (sql) => raw.prepare(sql) as unknown as Stmt,
  };
}

/** El driver nativo de libsql añade `_metadata` a cada fila; la limpiamos. */
function stripMeta(row: Row | undefined): Row | undefined {
  if (row && "_metadata" in row) {
    const rest: Row = { ...row };
    delete rest._metadata;
    return rest;
  }
  return row;
}

function makeLocalDriver(): Driver {
  const dir = getDataDir();
  mkdirSync(dir, { recursive: true });
  mkdirSync(path.join(dir, "installers"), { recursive: true });

  const raw = new DatabaseSync(path.join(dir, "vxcore.db"));
  raw.exec("PRAGMA journal_mode = WAL;");
  raw.exec("PRAGMA busy_timeout = 5000;");
  raw.exec(SCHEMA);

  return {
    exec: (sql) => raw.exec(sql),
    prepare: (sql) => raw.prepare(sql) as unknown as Stmt,
  };
}

function makeRemoteDriver(): Driver {
  const url = process.env.TURSO_DATABASE_URL!;
  // Para URLs file: (pruebas locales del modo remoto) creamos el directorio
  // padre del fichero si no existe.
  if (url.startsWith("file:")) {
    const filePath = url.replace(/^file:/, "");
    const dir = path.dirname(filePath);
    if (dir && dir !== ".") {
      mkdirSync(dir, { recursive: true });
    }
  }
  // El tipo de libsql no declara authToken aunque el runtime lo acepta.
  const options = {
    authToken: process.env.TURSO_AUTH_TOKEN,
  } as unknown as ConstructorParameters<typeof LibsqlDatabase>[1];
  const raw = new LibsqlDatabase(url, options);
  raw.exec(SCHEMA);

  return {
    exec: (sql) => raw.exec(sql),
    prepare: (sql) => {
      const stmt = raw.prepare(sql);
      return {
        run: (...params) =>
          stmt.run(...params) as { lastInsertRowid: number | bigint },
        get: (...params) => stripMeta(stmt.get(...params) as Row | undefined),
        all: (...params) =>
          (stmt.all(...params) as Row[]).map((r) => stripMeta(r) ?? r),
      };
    },
  };
}

export function getDb(): Driver {
  if (db) return db;
  try {
    db = isRemote() ? makeRemoteDriver() : makeLocalDriver();
    migrate(db);
  } catch (err) {
    // Nunca crashear: degrada a memoria y expón el error para la UI.
    const message =
      err instanceof Error ? err.message : "Error desconocido al iniciar la base de datos";
    console.error("[VXCore Admin] Error al iniciar la base de datos:", err);
    dbError = message;
    db = makeMemoryDriver();
  }
  return db;
}

/**
 * Devuelve el driver si la base de datos funciona, o lanza un error con
 * instrucciones claras si no (para rutas de mutación que no pueden
 * degradar silenciosamente).
 */
export function requireHealthyDb(): Driver {
  const error = getDbError();
  if (error) {
    throw new Error(
      `Base de datos no disponible: ${error}. Configura TURSO_DATABASE_URL y TURSO_AUTH_TOKEN en Vercel.`
    );
  }
  return getDb();
}

/* ------------------------------------------------------------------ */
/* Usuarios                                                            */
/* ------------------------------------------------------------------ */

export function listUsers(): Row[] {
  return getDb()
    .prepare(
      `SELECT u.*,
         (SELECT COUNT(*) FROM orders o WHERE o.user_email = u.email AND o.status = 'paid') AS orders_paid,
         (SELECT COUNT(*) FROM licenses l WHERE l.user_email = u.email AND l.status = 'active') AS licenses_active
       FROM users u ORDER BY u.created_at DESC`
    )
    .all() as Row[];
}

export function getUserByEmail(email: string): Row | undefined {
  return getDb().prepare("SELECT * FROM users WHERE email = ?").get(email) as
    | Row
    | undefined;
}

/* ------------------------------------------------------------------ */
/* Pedidos                                                             */
/* ------------------------------------------------------------------ */

export function listOrders(): Row[] {
  return getDb()
    .prepare("SELECT * FROM orders ORDER BY created_at DESC")
    .all() as Row[];
}

export function markOrderPaid(
  orderId: number,
  input: {
    sessionId?: string | null;
    customerId?: string | null;
    paymentIntent?: string | null;
    amountCents?: number | null;
    currency?: string | null;
  }
): void {
  const db = getDb();
  db.prepare(
    `UPDATE orders SET
       stripe_session_id = COALESCE(?, stripe_session_id),
       stripe_customer_id = COALESCE(?, stripe_customer_id),
       payment_intent = COALESCE(?, payment_intent),
       amount_cents = COALESCE(?, amount_cents),
       currency = COALESCE(?, currency),
       status = 'paid',
       paid_at = datetime('now')
     WHERE id = ?`
  ).run(
    input.sessionId ?? null,
    input.customerId ?? null,
    input.paymentIntent ?? null,
    input.amountCents ?? null,
    input.currency ?? null,
    orderId
  );
}

export function deleteOrder(id: number): void {
  getDb().prepare("DELETE FROM orders WHERE id = ?").run(id);
}

/* ------------------------------------------------------------------ */
/* Licencias                                                           */
/* ------------------------------------------------------------------ */

const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateKey(): string {
  const groups: string[] = [];
  for (let g = 0; g < 4; g++) {
    const bytes = randomBytes(4);
    let group = "";
    for (let i = 0; i < 4; i++) {
      group += KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length];
    }
    groups.push(group);
  }
  return `VX-${groups.join("-")}`;
}

export function createLicense(input: {
  userEmail: string;
  note?: string | null;
}): Row {
  const db = getDb();
  let key = generateKey();
  while (db.prepare("SELECT 1 FROM licenses WHERE license_key = ?").get(key)) {
    key = generateKey();
  }
  const info = db
    .prepare(
      "INSERT INTO licenses (license_key, user_email, note) VALUES (?, ?, ?)"
    )
    .run(key, input.userEmail, input.note ?? null);
  return db
    .prepare("SELECT * FROM licenses WHERE id = ?")
    .get(Number(info.lastInsertRowid)) as Row;
}

export function listLicenses(): Row[] {
  return getDb()
    .prepare("SELECT * FROM licenses ORDER BY created_at DESC")
    .all() as Row[];
}

export function setLicenseStatus(id: number, status: "active" | "revoked"): void {
  getDb().prepare("UPDATE licenses SET status = ? WHERE id = ?").run(status, id);
}

/* ------------------------------------------------------------------ */
/* Instalaciones (equipos con la app)                                  */
/* ------------------------------------------------------------------ */

/**
 * Equipos con la app instalada, con el estado VIVO de su licencia.
 *
 * El `LEFT JOIN` con `licenses` es deliberado: revocar una licencia cambia lo
 * que se ve aquí en la siguiente consulta, sin tocar la tabla `installations`
 * ni ejecutar borrados en cascada. `license_status` queda a NULL si la
 * licencia se borró del todo, que también es «sin acceso».
 *
 * El segundo `LEFT JOIN`, con `tunnels`, trae el enlace público del equipo
 * cuando lo tiene. Es LEFT y no INNER porque tener túnel es opcional: el
 * cliente decide si publica su panel, y la mayoría no lo hará.
 *
 * `tunnel_secret` no se selecciona a propósito: es una credencial y aquí sólo
 * se está pintando una tabla. Lo que no sale de la base de datos no se puede
 * filtrar en una respuesta.
 */
export function listInstallations(): Row[] {
  return getDb()
    .prepare(
      `SELECT i.*,
         l.status AS license_status,
         l.user_email AS license_email,
         t.hostname AS tunnel_hostname,
         t.created_at AS tunnel_created_at
       FROM installations i
       LEFT JOIN licenses l ON LOWER(l.license_key) = LOWER(i.license_key)
       LEFT JOIN tunnels t ON t.installation_id = i.id
       ORDER BY i.last_seen DESC`
    )
    .all() as Row[];
}

/* ------------------------------------------------------------------ */
/* Instaladores                                                        */
/* ------------------------------------------------------------------ */

export function addInstaller(input: {
  version: string;
  filename: string;
  sizeBytes: number;
  isLatest: boolean;
  note?: string | null;
  /** Asset de release de GitHub donde vive el binario. */
  assetId: number;
  assetRepo: string;
}): void {
  const db = getDb();
  if (input.isLatest) {
    db.prepare("UPDATE installers SET is_latest = 0").run();
  }
  db.prepare(
    "INSERT INTO installers (version, filename, size_bytes, is_latest, note, asset_id, asset_repo) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    input.version,
    input.filename,
    input.sizeBytes,
    input.isLatest ? 1 : 0,
    input.note ?? null,
    input.assetId,
    input.assetRepo
  );
}

export function getLatestInstaller(): Row | undefined {
  return getDb()
    .prepare(
      "SELECT * FROM installers WHERE is_latest = 1 ORDER BY created_at DESC LIMIT 1"
    )
    .get() as Row | undefined;
}

export function listInstallers(): Row[] {
  return getDb()
    .prepare("SELECT * FROM installers ORDER BY created_at DESC")
    .all() as Row[];
}

/* ------------------------------------------------------------------ */
/* Contactos                                                           */
/* ------------------------------------------------------------------ */

export function listContacts(): Row[] {
  return getDb()
    .prepare("SELECT * FROM contacts ORDER BY created_at DESC")
    .all() as Row[];
}

export function setContactStatus(id: number, status: "new" | "read"): void {
  getDb().prepare("UPDATE contacts SET status = ? WHERE id = ?").run(status, id);
}

export function deleteContact(id: number): void {
  getDb().prepare("DELETE FROM contacts WHERE id = ?").run(id);
}

/* ------------------------------------------------------------------ */
/* Chat con usuarios                                                   */
/* ------------------------------------------------------------------ */

export function addMessage(input: {
  userEmail: string;
  sender: "user" | "staff";
  body: string;
  ticketId?: number | null;
}): Row {
  const db = getDb();
  const info = db
    .prepare(
      "INSERT INTO messages (user_email, sender, body, ticket_id) VALUES (?, ?, ?, ?)"
    )
    .run(input.userEmail, input.sender, input.body, input.ticketId ?? null);
  return db
    .prepare("SELECT * FROM messages WHERE id = ?")
    .get(Number(info.lastInsertRowid)) as Row;
}

export function listMessages(userEmail: string): Row[] {
  return getDb()
    .prepare("SELECT * FROM messages WHERE user_email = ? ORDER BY id ASC")
    .all(userEmail) as Row[];
}

export function markMessagesRead(
  userEmail: string,
  sender: "user" | "staff"
): void {
  getDb()
    .prepare(
      "UPDATE messages SET read = 1 WHERE user_email = ? AND sender = ? AND read = 0"
    )
    .run(userEmail, sender);
}

export function totalUnreadForStaff(): number {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS n FROM messages WHERE sender = 'user' AND read = 0"
    )
    .get() as Row;
  return Number(row.n);
}

/** Una fila por usuario con el último mensaje, fecha, no leídos y su ticket. */
export function listConversations(): Row[] {
  return getDb()
    .prepare(
      `SELECT m.user_email,
         u.name AS user_name,
         (SELECT body FROM messages WHERE user_email = m.user_email ORDER BY id DESC LIMIT 1) AS last_body,
         (SELECT sender FROM messages WHERE user_email = m.user_email ORDER BY id DESC LIMIT 1) AS last_sender,
         (SELECT created_at FROM messages WHERE user_email = m.user_email ORDER BY id DESC LIMIT 1) AS last_at,
         (SELECT COUNT(*) FROM messages WHERE user_email = m.user_email AND sender = 'user' AND read = 0) AS unread,
         (SELECT status FROM tickets WHERE user_email = m.user_email ORDER BY id DESC LIMIT 1) AS ticket_status,
         (SELECT rating FROM tickets WHERE user_email = m.user_email ORDER BY id DESC LIMIT 1) AS ticket_rating
       FROM messages m
       LEFT JOIN users u ON u.email = m.user_email
       GROUP BY m.user_email
       ORDER BY last_at DESC`
    )
    .all() as Row[];
}

/* ------------------------------------------------------------------ */
/* Tickets de soporte                                                 */
/* ------------------------------------------------------------------ */

/** Último ticket del usuario (abierto o cerrado). */
export function getUserTicket(userEmail: string): Row | undefined {
  return getDb()
    .prepare(
      "SELECT * FROM tickets WHERE user_email = ? ORDER BY id DESC LIMIT 1"
    )
    .get(userEmail) as Row | undefined;
}

/**
 * Lista de tickets para el panel admin, con datos del usuario y del último
 * mensaje. Incluye también las conversaciones sin ticket (legacy) marcadas
 * con status 'none'. Los abiertos van primero.
 */
export function listTicketsAdmin(): Row[] {
  return getDb()
    .prepare(
      `SELECT * FROM (
         SELECT t.id, t.user_email, u.name AS user_name, t.subject, t.status, t.rating,
                t.rating_comment, t.created_at, t.closed_at, t.rated_at,
                (SELECT body FROM messages WHERE user_email = t.user_email ORDER BY id DESC LIMIT 1) AS last_body,
                (SELECT COUNT(*) FROM messages WHERE user_email = t.user_email AND sender = 'user' AND read = 0) AS unread
         FROM tickets t
         LEFT JOIN users u ON u.email = t.user_email

         UNION ALL

         SELECT NULL AS id, m.user_email, u.name AS user_name, NULL AS subject,
                'none' AS status, NULL AS rating, NULL AS rating_comment,
                MIN(m.created_at) AS created_at, NULL AS closed_at, NULL AS rated_at,
                (SELECT body FROM messages WHERE user_email = m.user_email ORDER BY id DESC LIMIT 1) AS last_body,
                (SELECT COUNT(*) FROM messages WHERE user_email = m.user_email AND sender = 'user' AND read = 0) AS unread
         FROM messages m
         LEFT JOIN users u ON u.email = m.user_email
         WHERE NOT EXISTS (SELECT 1 FROM tickets t2 WHERE t2.user_email = m.user_email)
         GROUP BY m.user_email, u.name
       )
       ORDER BY
         CASE WHEN status = 'open' THEN 0 WHEN status = 'none' THEN 1 ELSE 2 END,
         created_at DESC`
    )
    .all() as Row[];
}

/* ------------------------------------------------------------------ */
/* Estadísticas                                                        */
/* ------------------------------------------------------------------ */

export function getStats(): Row {
  const db = getDb();
  const one = (sql: string): number => {
    const row = db.prepare(sql).get() as Row;
    return Number(row.n ?? 0);
  };
  const revenue = db
    .prepare(
      "SELECT COALESCE(SUM(amount_cents), 0) AS total FROM orders WHERE status = 'paid'"
    )
    .get() as Row;

  return {
    users: one("SELECT COUNT(*) AS n FROM users"),
    paidOrders: one("SELECT COUNT(*) AS n FROM orders WHERE status = 'paid'"),
    pendingOrders: one(
      "SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'"
    ),
    revenueCents: Number(revenue.total ?? 0),
    licensesActive: one(
      "SELECT COUNT(*) AS n FROM licenses WHERE status = 'active'"
    ),
    licensesTotal: one("SELECT COUNT(*) AS n FROM licenses"),
    installers: one("SELECT COUNT(*) AS n FROM installers"),
    contactsNew: one("SELECT COUNT(*) AS n FROM contacts WHERE status = 'new'"),
    contactsTotal: one("SELECT COUNT(*) AS n FROM contacts"),
    newUsersWeek: one(
      "SELECT COUNT(*) AS n FROM users WHERE created_at >= datetime('now', '-7 days')"
    ),
  };
}
