/**
 * Helpers de fetch para el panel.
 *
 * El problema que resuelven: `await res.json()` a secas revienta cuando el
 * cuerpo no es JSON (un 413 de la plataforma, un 502 del proxy, una página de
 * error HTML…). Esa excepción caía en el `catch` de los componentes y acababa
 * mostrando «Error de red», que es justo lo contrario de lo que pasó: la red
 * funcionó y el servidor contestó con un error concreto que nos interesa ver.
 */

/** Mensaje de error legible a partir de una respuesta fallida. */
export async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const data = JSON.parse(text) as { error?: string };
    if (data.error) return data.error;
  } catch {
    // Cuerpo no-JSON: caemos al mensaje genérico de abajo.
  }
  return `Error ${res.status}: ${text.slice(0, 140) || res.statusText}`;
}

/** Cuerpo JSON de una respuesta correcta, o `{}` si no es JSON válido. */
export async function readJson<T>(res: Response): Promise<Partial<T>> {
  const text = await res.text().catch(() => "");
  try {
    return JSON.parse(text) as Partial<T>;
  } catch {
    return {};
  }
}

/** Error lanzado por `postJson` cuando la respuesta no es 2xx. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * `fetch` + JSON con errores ya normalizados: resuelve con el cuerpo parseado
 * o lanza `ApiError` con el mensaje real del servidor.
 */
export async function requestJson<T>(
  url: string,
  init?: RequestInit
): Promise<Partial<T>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError("Error de red. Comprueba tu conexión.", 0);
  }
  if (!res.ok) {
    throw new ApiError(await readError(res), res.status);
  }
  return readJson<T>(res);
}

/** Atajo para las mutaciones del panel, que siempre mandan JSON. */
export function sendJson<T>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: unknown
): Promise<Partial<T>> {
  return requestJson<T>(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
