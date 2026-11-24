import { useEffect, useRef, useState } from 'react';
import { loadPdf } from './pdf';
import { PAGE_BASE_WIDTH } from '../../lib/readingLayout';

interface Props {
  url: string;
  page: number;
  zoom: number;
  onAspect: (heightOverWidth: number) => void;
}

/**
 * Página de un PDF real renderizada con pdf.js. El lienzo se dibuja a la
 * resolución del zoom actual (con retardo) para que el texto sea nítido.
 */
export function PdfPageView({ url, page, zoom, onAspect }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<unknown> } | null = null;
    const timer = setTimeout(async () => {
      try {
        const pdf = await loadPdf(url);
        const p = await pdf.getPage(page + 1);
        if (cancelled || !canvas.current) return;
        const base = p.getViewport({ scale: 1 });
        onAspect(base.height / base.width);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const scale = Math.min((PAGE_BASE_WIDTH * zoom * dpr) / base.width, 4096 / base.width);
        const vp = p.getViewport({ scale });
        const c = canvas.current;
        c.width = Math.floor(vp.width);
        c.height = Math.floor(vp.height);
        task = p.render({ canvasContext: c.getContext('2d')!, viewport: vp });
        await task.promise;
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled && (e as Error).name !== 'RenderingCancelledException') setError((e as Error).message);
      }
    }, ready ? 140 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      task?.cancel();
    };
  }, [url, page, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="page-error">No se pudo abrir el PDF: {error}</div>;
  return (
    <div className="pdf-page">
      <canvas ref={canvas} style={{ opacity: ready ? 1 : 0 }} />
      {!ready && <div className="page-loading">Abriendo PDF…</div>}
    </div>
  );
}
