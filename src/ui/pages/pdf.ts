import type { PDFDocumentProxy } from 'pdfjs-dist';

let lib: Promise<typeof import('pdfjs-dist')> | null = null;
const docs = new Map<string, Promise<PDFDocumentProxy>>();

/** pdf.js se carga bajo demanda: no pesa en la carga inicial de la experiencia. */
function pdfjs() {
  if (!lib) {
    lib = Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([m, worker]) => {
      m.GlobalWorkerOptions.workerSrc = worker.default;
      return m;
    });
  }
  return lib;
}

export function loadPdf(url: string) {
  if (!docs.has(url)) {
    docs.set(url, pdfjs().then((m) => m.getDocument({ url }).promise));
  }
  return docs.get(url)!;
}
