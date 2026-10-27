export function withBasePath(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return `${basePath}${path.startsWith('/') ? path : `/${path}`}`;
}
