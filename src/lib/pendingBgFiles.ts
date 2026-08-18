const files = new Map<string, File>();

export function stashPendingBgFile(id: string, file: File): void {
  files.set(id, file);
}

export function takePendingBgFile(id: string): File | null {
  const file = files.get(id) ?? null;
  if (file) files.delete(id);
  return file;
}
