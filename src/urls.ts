export function joinUrlPaths(...paths: string[]): string {
  return (
    "/" +
    paths
      .map((path) => path.replace(/^\/+/, "").replace(/\/+$/, ""))
      .filter((path) => path.length > 0)
      .join("/")
  );
}
