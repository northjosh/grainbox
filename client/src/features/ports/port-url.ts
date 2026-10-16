/** The server stores bare hostnames, e.g. `5001-msb-abc-7123.grainboxapps.northjosh.com`. */
export function portHref(url: string | null): string | null {
  if (!url) return null;
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}
