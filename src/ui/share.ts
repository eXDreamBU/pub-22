/**
 * Hand a file to the user: share sheet where available (iPad: "In Dateien sichern"), else a download.
 * Returns false when the share sheet was cancelled, i.e. nothing was saved.
 */
export async function shareOrDownload(file: File): Promise<boolean> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch {
      return false;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(a.href);
  return true;
}
