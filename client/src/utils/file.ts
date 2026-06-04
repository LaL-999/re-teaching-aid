/** 触发浏览器下载一个 Blob。 */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** 将文本另存为文件。 */
export function saveText(
  text: string,
  filename: string,
  mime = 'text/plain;charset=utf-8',
): void {
  saveBlob(new Blob([text], { type: mime }), filename);
}

/** 人类可读的文件大小。 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
