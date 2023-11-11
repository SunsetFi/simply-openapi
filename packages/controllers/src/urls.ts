export function joinUrlPaths(...paths: string[]): string {
  return (
    "/" +
    paths
      .map((path) => path.replace(/^\/+/, "").replace(/\/+$/, ""))
      .filter((path) => path.length > 0)
      .join("/")
  );
}

export function expressToOpenAPIPath(path: string): string {
  return path.replace(/:([^/]+)/g, "{$1}");
}

export function openAPIToExpressPath(path: string): string {
  return path.replace(/{([^/]+)}/g, ":$1");
}
