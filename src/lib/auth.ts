import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE = "vx_admin_session";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 días

function secret(): string {
  return (
    process.env.ADMIN_SECRET ??
    process.env.AUTH_SECRET ??
    "vxcore-admin-dev-secret"
  );
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/** Crea el token de sesión a partir de la contraseña correcta. */
export function createSessionToken(password: string): string {
  const payload = String(Date.now());
  return `${payload}.${sign(`${payload}:${password}`)}`;
}

export function verifySessionToken(token: string | undefined, password: string): boolean {
  if (!token || !password) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const ageMs = Date.now() - Number(payload);
  if (Number.isNaN(ageMs) || ageMs < 0 || ageMs > MAX_AGE_SECONDS * 1000) {
    return false;
  }
  const expected = sign(`${payload}:${password}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Para páginas del panel: si no hay sesión válida, redirige a /login. */
export async function requireAdmin(): Promise<void> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!verifySessionToken(token, password)) {
    redirect("/login");
  }
}

/** Para API routes: devuelve si hay sesión válida. */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  return verifySessionToken(token, process.env.ADMIN_PASSWORD ?? "");
}
