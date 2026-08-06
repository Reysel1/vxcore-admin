# VXCore Admin

Panel de administración de VXCore. Gestiona usuarios, pedidos, licencias,
instaladores, los mensajes de contacto de la web y el chat con usuarios.

- **Web pública:** `C:\Users\nene\Desktop\VXCore Web` (puerto 3000)
- **Este panel:** puerto **3100**

## Arrancar en local

```bash
npm install
npm run dev
# Abre http://localhost:3100
```

## Configuración (.env.local)

| Variable             | Qué es                                                          |
| -------------------- | --------------------------------------------------------------- |
| `ADMIN_PASSWORD`     | Contraseña para entrar al panel (cámbiala)                      |
| `ADMIN_SECRET`       | Secreto que firma la sesión (genera: `openssl rand -base64 32`) |
| `VXCORE_DATA_DIR`    | Carpeta con la base de datos e instaladores (la de la web)      |
| `TURSO_DATABASE_URL` | (Opcional) URL de Turso para usar SQLite en la nube             |
| `TURSO_AUTH_TOKEN`   | (Opcional) Token de Turso                                       |
| `NEXT_PUBLIC_APP_URL`| URL de la web pública (enlace «Ver la web»)                     |

## Cómo funciona

- **Dos modos de base de datos:**
  - **Local** (por defecto): SQLite en `data/vxcore.db` de la web (modo WAL).
    Web y admin pueden estar encendidos a la vez compartiendo los datos.
  - **Remoto** (Vercel): si defines `TURSO_DATABASE_URL`, usa **Turso**
    (SQLite en la nube). El SQL es idéntico. **La web debe apuntar a la misma
    base Turso** para que ambos compartan los datos.
- **Sesión propia**: login con `ADMIN_PASSWORD` → cookie firmada con HMAC
  (7 días).
- **Licencias**: se generan solas cuando Stripe confirma un pago. También
  puedes crearlas a mano desde *Licencias* o desde *Usuarios*.
- **Instaladores**: sube el `.exe` y marca la versión como «última». Eso es lo
  que se descarga desde `/dashboard` de la web. *(En Vercel la subida de
  ficheros está desactivada — falta almacenamiento de objetos; usa el admin
  local para eso.)*
- **Chat**: responde aquí a los usuarios del chat del panel de la web.

## Desplegar en Vercel

1. Sube este repo a GitHub y conéctalo en
   [vercel.com/new](https://vercel.com/new) (framework: **Next.js**, se
   detecta solo).
2. Añade las variables de entorno en Vercel (Settings → Environment Variables):
   `ADMIN_PASSWORD`, `ADMIN_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
   `NEXT_PUBLIC_APP_URL`.
3. Crea la base en [turso.tech](https://turso.tech) (plan gratis):
   ```bash
   npm i -g turso
   turso auth login
   turso db create vxcore
   turso db show vxcore --url      # → TURSO_DATABASE_URL
   turso db tokens create vxcore   # → TURSO_AUTH_TOKEN
   ```
4. El panel arranca en `https://tu-app.vercel.app` y los datos viven en Turso.

> ⚠️ El modo remoto requiere que **la web** también use la misma base Turso
> (mismo `TURSO_DATABASE_URL` en su entorno). Hasta entonces, el admin en
> Vercel funcionará pero con datos vacíos.

## Notas

- Los datos NO viven en este proyecto; viven en `VXCORE_DATA_DIR` o en Turso.
- No subas `.env.local` a git (ya está en `.gitignore`).
