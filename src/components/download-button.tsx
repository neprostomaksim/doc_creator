'use client';

export function DownloadButton({
  url,
  filename,
  className,
  children,
}: {
  url: string;
  filename: string;
  className?: string;
  children: React.ReactNode;
}) {
  async function handleDownload() {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  return (
    <button type="button" onClick={handleDownload} className={className}>
      {children}
    </button>
  );
}
