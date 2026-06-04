// src/lib/api.ts (Ejemplo conceptual para cargar desde el disco)
export async function loadReportFromFile(path: string) {
  const response = await fetch(`/api/read-file?path=${encodeURIComponent(path)}`);
  return await response.json();
}