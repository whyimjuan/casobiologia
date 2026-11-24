import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CaseFile } from '../data/types';
import { resolveAsset } from '../data/loadCaseFile';
import { useCaseStore } from '../state/caseStore';
import { PAGE_BASE_WIDTH, readingLayout, viewerHasSidePanel, VIEWER_PANEL, VIEWER_TOOLBAR, VIEWER_TOPBAR } from '../lib/readingLayout';
import { useActiveDocument, useActiveFolder } from './selectors';
import { EvidenceDetails, EvidenceObservations, StatusChip } from './EvidenceMetadataPanel';
import { SimulatedPageView } from './pages/SimulatedPageView';
import { PdfPageView } from './pages/PdfPageView';
import { ImagePageView } from './pages/ImagePageView';
import { Watermark } from './pages/Watermark';
import { loadPdf } from './pages/pdf';

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 4;
const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

function fitZoomFor(vw: number, vh: number, aspect: number, mode: 'page' | 'width') {
  const panel = viewerHasSidePanel(vw) ? VIEWER_PANEL : 0;
  const areaW = (vw - panel) * 0.94;
  const areaH = (vh - VIEWER_TOPBAR - VIEWER_TOOLBAR) * 0.94;
  const byW = areaW / PAGE_BASE_WIDTH;
  if (mode === 'width') return byW;
  return Math.min(byW, areaH / (PAGE_BASE_WIDTH * aspect));
}

/**
 * Visor de lectura. Aparece exactamente donde aterriza la hoja 3D y permite
 * zoom (botones, Ctrl+rueda, pellizco), desplazamiento (arrastre, rueda,
 * táctil), cambio de página, metadatos, observaciones y regreso.
 */
export function DocumentViewer({ caseFile }: { caseFile: CaseFile }) {
  const folder = useActiveFolder(caseFile)!;
  const doc = useActiveDocument(caseFile)!;
  const { backToFolder, backToCollection } = useCaseStore.getState();
  const vp = useViewport();
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);
  const [aspect, setAspect] = useState(1.4142);
  const [zoom, setZoom] = useState(() => readingLayout(window.innerWidth, window.innerHeight).fitZoom);
  const [tab, setTab] = useState<'meta' | 'obs'>('meta');
  const [drawer, setDrawer] = useState(false);
  const [pdfPages, setPdfPages] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const anchor = useRef<{ x: number; y: number; px: number; py: number; ratio: number } | null>(null);

  const src = doc.source;
  const total = src.kind === 'simulated' ? src.pages.length : src.kind === 'image' ? src.urls.length : pdfPages ?? 1;

  useEffect(() => {
    if (src.kind === 'pdf') loadPdf(resolveAsset(src.url)).then((p) => setPdfPages(p.numPages)).catch(() => setPdfPages(1));
  }, [src]);

  const hasPanel = viewerHasSidePanel(vp.w);

  /** Cambia el zoom manteniendo fijo el punto (x, y) del área de lectura. */
  const zoomTo = useCallback((next: number, x?: number, y?: number) => {
    setZoom((z) => {
      const nz = clampZoom(next);
      const el = scroller.current;
      if (el) {
        const px = x ?? el.clientWidth / 2;
        const py = y ?? el.clientHeight / 2;
        anchor.current = { x: el.scrollLeft + px, y: el.scrollTop + py, px, py, ratio: nz / z };
      }
      return nz;
    });
  }, []);

  useLayoutEffect(() => {
    const el = scroller.current;
    const a = anchor.current;
    if (!el || !a) return;
    el.scrollLeft = a.x * a.ratio - a.px;
    el.scrollTop = a.y * a.ratio - a.py;
    anchor.current = null;
  }, [zoom]);

  const goPage = useCallback(
    (n: number) => {
      const p = Math.max(0, Math.min(total - 1, n));
      if (p === page) return;
      setDir(p > page ? 1 : -1);
      setPage(p);
      scroller.current?.scrollTo({ top: 0 });
    },
    [page, total],
  );

  // Teclado: ←/→ páginas, +/− zoom, 0 ajustar
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') goPage(page + 1);
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') goPage(page - 1);
      if (e.key === '+' || e.key === '=') zoomTo(zoom * 1.2);
      if (e.key === '-') zoomTo(zoom / 1.2);
      if (e.key === '0') setZoom(fitZoomFor(vp.w, vp.h, aspect, 'page'));
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [goPage, page, zoom, zoomTo, vp, aspect]);

  // Rueda: desplazamiento normal; con Ctrl/⌘ (o gesto de trackpad) hace zoom.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const on = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomTo(zoom * Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', on, { passive: false });
    return () => el.removeEventListener('wheel', on);
  }, [zoom, zoomTo]);

  // Arrastre para desplazar (ratón y un dedo) y pellizco para zoom (dos dedos).
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    const el = scroller.current;
    if (!prev || !el) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const r = el.getBoundingClientRect();
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomTo(pinch.current.zoom * (d / pinch.current.dist), (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
    } else if (pointers.current.size === 1) {
      el.scrollLeft -= e.clientX - prev.x;
      el.scrollTop -= e.clientY - prev.y;
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const baseH = PAGE_BASE_WIDTH * aspect;
  const pageUrl = src.kind === 'image' ? resolveAsset(src.urls[page]) : '';

  const details = (
    <>
      <div className="viewer-doc-head">
        <div className="panel-kicker">{doc.type}</div>
        <h2 className="panel-title">{doc.title}</h2>
        <div className="viewer-doc-code"><span className="mono">{doc.code}</span><StatusChip status={doc.status} /></div>
      </div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'meta'} className={tab === 'meta' ? 'is-active' : ''} onClick={() => setTab('meta')}>Metadatos</button>
        <button role="tab" aria-selected={tab === 'obs'} className={tab === 'obs' ? 'is-active' : ''} onClick={() => setTab('obs')}>
          Observaciones <span className="tab-count">{doc.observations.length}</span>
        </button>
      </div>
      <div className="tab-body">
        {tab === 'meta' ? <EvidenceDetails doc={doc} folder={folder} pages={total} /> : <EvidenceObservations doc={doc} />}
      </div>
    </>
  );

  return (
    <motion.div
      className="viewer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.22 } }}
      transition={{ duration: 0.35 }}
      role="dialog"
      aria-label={`Lectura: ${doc.title}`}
    >
      <div className="viewer-backdrop" />

      <div className="viewer-main" style={{ right: hasPanel ? VIEWER_PANEL : 0 }}>
        <div
          ref={scroller}
          className="viewer-scroll"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={page}
              className="page-surface"
              custom={dir}
              style={{ width: PAGE_BASE_WIDTH * zoom, height: baseH * zoom }}
              initial={{ opacity: 0, x: dir * 40, rotateY: dir * -8 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              exit={{ opacity: 0, x: dir * -40, rotateY: dir * 8 }}
              transition={{ duration: 0.38, ease: [0.25, 0.7, 0.2, 1] }}
            >
              <motion.div
                className="page-paper"
                style={{ width: PAGE_BASE_WIDTH, height: baseH, transform: `scale(${zoom})` }}
                initial={{ scale: 0.985 }}
              >
                {src.kind === 'simulated' && (
                  <SimulatedPageView doc={doc} letterhead={src.letterhead} page={src.pages[page]} index={page} total={total} />
                )}
                {src.kind === 'pdf' && <PdfPageView url={resolveAsset(src.url)} page={page} zoom={zoom} onAspect={setAspect} />}
                {src.kind === 'image' && <ImagePageView url={pageUrl} alt={`${doc.title}, imagen ${page + 1}`} onAspect={setAspect} />}
                <Watermark />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {hasPanel ? (
        <motion.aside className="viewer-panel" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.4 }}>
          {details}
        </motion.aside>
      ) : (
        <AnimatePresence>
          {drawer && (
            <motion.aside className="viewer-drawer" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}>
              <button className="drawer-close" onClick={() => setDrawer(false)} aria-label="Cerrar ficha">×</button>
              {details}
            </motion.aside>
          )}
        </AnimatePresence>
      )}

      <div className="viewer-toolbar" style={{ right: hasPanel ? VIEWER_PANEL : 0 }}>
        <div className="tool-group">
          <button className="btn-quiet" onClick={backToFolder} title="Devolver el documento a la carpeta (Esc)">
            <span aria-hidden>←</span> Volver a la carpeta
          </button>
          <button className="btn-ghost" onClick={backToCollection} title="Cerrar la carpeta y volver al conjunto">
            Conjunto
          </button>
        </div>
        <div className="tool-group">
          <button className="icon-btn" onClick={() => goPage(page - 1)} disabled={page === 0} aria-label="Página anterior">‹</button>
          <span className="tool-readout">{page + 1} / {total}</span>
          <button className="icon-btn" onClick={() => goPage(page + 1)} disabled={page >= total - 1} aria-label="Página siguiente">›</button>
        </div>
        <div className="tool-group">
          <button className="icon-btn" onClick={() => zoomTo(zoom / 1.2)} aria-label="Reducir">−</button>
          <span className="tool-readout">{Math.round(zoom * 100)}%</span>
          <button className="icon-btn" onClick={() => zoomTo(zoom * 1.2)} aria-label="Ampliar">+</button>
          <button className="btn-ghost" onClick={() => setZoom(fitZoomFor(vp.w, vp.h, aspect, 'page'))}>Página</button>
          <button className="btn-ghost" onClick={() => setZoom(fitZoomFor(vp.w, vp.h, aspect, 'width'))}>Ancho</button>
          {!hasPanel && <button className="btn-ghost" onClick={() => setDrawer((d) => !d)}>Ficha</button>}
        </div>
      </div>
    </motion.div>
  );
}
