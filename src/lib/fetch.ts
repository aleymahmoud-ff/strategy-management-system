/**
 * Wrapper around fetch that adds a cache-busting timestamp.
 * Prevents the CDN from serving cached API responses.
 */
export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const separator = url.includes("?") ? "&" : "?";
  return fetch(`${url}${separator}_t=${Date.now()}`, {
    ...init,
    cache: "no-store",
  });
}
