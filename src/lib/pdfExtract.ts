import * as pdfjsLib from 'pdfjs-dist';
// Vite-friendly worker URL
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractPdfText(
  file: File,
  onProgress?: (pageDone: number, total: number) => void,
): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const total = pdf.numPages;
  const parts: string[] = [];

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it: any) => ('str' in it ? it.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) parts.push(`--- Page ${i} ---\n${text}`);
    onProgress?.(i, total);
  }

  return parts.join('\n\n');
}

/**
 * Render every PDF page to a base64 JPEG (no data: prefix).
 * Used for scanned / handwritten PDFs where text extraction yields nothing.
 */
export async function extractPdfPagesAsImages(
  file: File,
  onProgress?: (pageDone: number, total: number) => void,
  opts: { maxPages?: number; scale?: number; quality?: number } = {},
): Promise<string[]> {
  const { maxPages = 40, scale = 1.5, quality = 0.7 } = opts;
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const total = Math.min(pdf.numPages, maxPages);
  const images: string[] = [];

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvas, canvasContext: ctx, viewport } as any).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    images.push(dataUrl.split(',')[1]); // strip "data:image/jpeg;base64,"
    onProgress?.(i, total);
  }

  return images;
}
