/**
 * Instaladores alojados como assets de release en GitHub.
 *
 * El .exe pesa cientos de MB y una función de Vercel rechaza cualquier petición
 * de más de 4.5 MB (`FUNCTION_PAYLOAD_TOO_LARGE`), así que el binario nunca
 * pasa por aquí: se sube a una release del repo privado y en la base de datos
 * solo guardamos el id del asset. Para descargarlo le pedimos a GitHub una URL
 * firmada temporal y redirigimos al navegador.
 *
 * El repo es privado, así que el asset no es accesible sin token: la descarga
 * sigue protegida por sesión y pago.
 */

const API = "https://api.github.com";

export const DEFAULT_RELEASES_REPO = "Reysel1/VXCore-App";

/** Repo `owner/nombre` donde viven las releases del instalador. */
export function getReleasesRepo(): string {
  return process.env.VXCORE_RELEASES_REPO || DEFAULT_RELEASES_REPO;
}

/** Token de GitHub con permiso de lectura de contenido sobre ese repo. */
export function getGithubToken(): string | undefined {
  return (
    process.env.VXCORE_GITHUB_TOKEN || process.env.GITHUB_TOKEN || undefined
  );
}

export type ReleaseAsset = {
  id: number;
  name: string;
  sizeBytes: number;
  releaseTag: string;
  releaseName: string;
  isDraft: boolean;
  isPrerelease: boolean;
};

/** Error con mensaje legible para enseñar tal cual en el panel. */
export class GithubError extends Error {}

function headers(token: string, accept: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function requireToken(): string {
  const token = getGithubToken();
  if (!token) {
    throw new GithubError(
      "Falta VXCORE_GITHUB_TOKEN. Crea un token de GitHub con permiso de lectura sobre el repo de releases y añádelo a las variables de entorno."
    );
  }
  return token;
}

type ApiAsset = { id: number; name: string; size: number };
type ApiRelease = {
  tag_name: string;
  name: string | null;
  draft: boolean;
  prerelease: boolean;
  assets: ApiAsset[];
};

/**
 * Todos los assets de todas las releases del repo, los más recientes primero.
 * Incluye borradores: son útiles para preparar una versión antes de anunciarla.
 */
export async function listReleaseAssets(): Promise<ReleaseAsset[]> {
  const token = requireToken();
  const repo = getReleasesRepo();

  const res = await fetch(`${API}/repos/${repo}/releases?per_page=50`, {
    headers: headers(token, "application/vnd.github+json"),
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new GithubError(
      `No se encuentra el repo ${repo}, o el token no tiene acceso. Revisa VXCORE_RELEASES_REPO y los permisos del token.`
    );
  }
  if (!res.ok) {
    throw new GithubError(
      `GitHub respondió ${res.status} al listar las releases de ${repo}.`
    );
  }

  const releases = (await res.json()) as ApiRelease[];

  return releases.flatMap((release) =>
    release.assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      sizeBytes: asset.size,
      releaseTag: release.tag_name,
      releaseName: release.name || release.tag_name,
      isDraft: release.draft,
      isPrerelease: release.prerelease,
    }))
  );
}

/** Un asset concreto, para validar que existe y leer nombre y tamaño reales. */
export async function getReleaseAsset(
  assetId: number
): Promise<ReleaseAsset | null> {
  const assets = await listReleaseAssets();
  return assets.find((asset) => asset.id === assetId) ?? null;
}

/**
 * URL firmada y temporal para descargar el asset sin credenciales.
 *
 * GitHub responde 302 con la URL en la cabecera `Location`; devolvemos esa URL
 * en lugar de seguir la redirección para no llegar a descargar los bytes aquí.
 */
export async function getAssetDownloadUrl(
  assetId: number
): Promise<string | null> {
  const token = requireToken();
  const repo = getReleasesRepo();

  const res = await fetch(`${API}/repos/${repo}/releases/assets/${assetId}`, {
    headers: headers(token, "application/octet-stream"),
    redirect: "manual",
    cache: "no-store",
  });

  if (res.status === 302 || res.status === 307) {
    return res.headers.get("location");
  }
  if (res.status === 404) return null;

  throw new GithubError(
    `GitHub respondió ${res.status} al pedir el enlace de descarga del asset ${assetId}.`
  );
}
