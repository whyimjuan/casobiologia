/**
 * Geometría de la superficie de lectura en píxeles CSS. La usan tanto el
 * visor 2D (para el encuadre inicial de la hoja) como la animación 3D de
 * extracción (para que la hoja aterrice exactamente donde aparece el visor).
 */
export const VIEWER_TOPBAR = 64;
export const VIEWER_TOOLBAR = 60;
export const VIEWER_PANEL = 360;
export const PAGE_ASPECT = 1 / 1.4142; // A4 vertical
export const PAGE_BASE_WIDTH = 794; // A4 a 96 dpi

export function viewerHasSidePanel(vw: number) {
  return vw >= 1024;
}

export function readingLayout(vw: number, vh: number) {
  const panel = viewerHasSidePanel(vw) ? VIEWER_PANEL : 0;
  const areaW = vw - panel;
  const areaH = vh - VIEWER_TOPBAR - VIEWER_TOOLBAR;
  let pageH = areaH * 0.94;
  let pageW = pageH * PAGE_ASPECT;
  if (pageW > areaW * 0.94) {
    pageW = areaW * 0.94;
    pageH = pageW / PAGE_ASPECT;
  }
  return {
    centerX: areaW / 2,
    centerY: VIEWER_TOPBAR + areaH / 2,
    pageW,
    pageH,
    /** Zoom que encaja la página completa en la superficie de lectura */
    fitZoom: pageW / PAGE_BASE_WIDTH,
  };
}
