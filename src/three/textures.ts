import * as THREE from 'three';
import { SHEET_HEADER_FRACTION } from './folderGeometry';

/**
 * Texturas procedurales generadas en <canvas>. No se descargan imágenes: las
 * superficies (cuero, cartón, mesa) se comparten entre todas las carpetas y
 * sólo las etiquetas y hojas son específicas de cada elemento.
 */

const cache = new Map<string, THREE.Texture>();

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruido de valor tileable en una rejilla de `cells` celdas. */
function valueNoise(size: number, cells: number, seed: number) {
  const r = rng(seed);
  const grid = new Float32Array(cells * cells).map(() => r());
  const out = new Float32Array(size * size);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) {
    const gy = (y / size) * cells;
    const y0 = Math.floor(gy);
    const fy = smooth(gy - y0);
    const y1 = (y0 + 1) % cells;
    for (let x = 0; x < size; x++) {
      const gx = (x / size) * cells;
      const x0 = Math.floor(gx);
      const fx = smooth(gx - x0);
      const x1 = (x0 + 1) % cells;
      const a = grid[y0 * cells + x0];
      const b = grid[y0 * cells + x1];
      const c = grid[y1 * cells + x0];
      const d = grid[y1 * cells + x1];
      out[y * size + x] = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }
  }
  return out;
}

function fbm(size: number, base: number, octaves: number, seed: number) {
  const out = new Float32Array(size * size);
  let amp = 0.5;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = valueNoise(size, base << o, seed + o * 101);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function canvasOf(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function toTexture(canvas: HTMLCanvasElement, opts: { srgb?: boolean; repeat?: number; anisotropy?: number } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  if (opts.srgb) tex.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(opts.repeat, opts.repeat);
  }
  tex.anisotropy = opts.anisotropy ?? 4;
  tex.needsUpdate = true;
  return tex;
}

function writeGray(ctx: CanvasRenderingContext2D, size: number, values: Float32Array, lo: number, hi: number) {
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < values.length; i++) {
    const v = Math.max(0, Math.min(255, (lo + (hi - lo) * values[i]) * 255));
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

/** Grano de cuero: celdas pequeñas con pliegues suaves (bump + rugosidad). */
export function leatherGrain(size = 512) {
  const key = `leather-${size}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, ctx] = canvasOf(size, size);
  const fine = fbm(size, 48, 2, 7);
  const coarse = fbm(size, 4, 2, 19);
  const mix = new Float32Array(size * size);
  for (let i = 0; i < mix.length; i++) {
    // Pliegues: crestas del ruido fino (|n-0.5|) moduladas por el ruido grueso.
    const ridge = 1 - Math.abs(fine[i] - 0.5) * 2;
    mix[i] = Math.pow(ridge, 2.2) * 0.6 + coarse[i] * 0.4;
  }
  writeGray(ctx, size, mix, 0.42, 0.78);
  const tex = toTexture(c, { repeat: 1.4 });
  cache.set(key, tex);
  return tex;
}

/** Cartón prensado: fibras alargadas en una dirección. */
export function cardboardFiber(size = 512) {
  const key = `card-${size}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, ctx] = canvasOf(size, size);
  const base = fbm(size, 8, 4, 3);
  writeGray(ctx, size, base, 0.45, 0.75);
  const r = rng(11);
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < size * 3; i++) {
    const x = r() * size;
    const y = r() * size;
    const len = 4 + r() * 18;
    ctx.strokeStyle = r() > 0.5 ? '#fff' : '#000';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + (r() - 0.5) * 2);
    ctx.stroke();
  }
  const tex = toTexture(c, { repeat: 2 });
  cache.set(key, tex);
  return tex;
}

/** Variación de color (multiplicativa) para que el azul marino no sea plano. */
export function toneVariation(size = 256) {
  const key = `tone-${size}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, ctx] = canvasOf(size, size);
  const n = fbm(size, 3, 3, 29);
  writeGray(ctx, size, n, 0.82, 1.0);
  const tex = toTexture(c, { srgb: true, repeat: 1 });
  cache.set(key, tex);
  return tex;
}

/** Superficie de la mesa: madera oscura con vetas muy sutiles. */
export function tableSurface(size = 1024) {
  const key = `table-${size}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, ctx] = canvasOf(size, size);
  const warp = fbm(size, 4, 3, 41);
  const fine = fbm(size, 64, 2, 43);
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const grain = Math.sin((y / size) * 90 + warp[i] * 14) * 0.5 + 0.5;
      const v = 0.6 + grain * 0.25 + fine[i] * 0.15;
      img.data[i * 4] = 22 * v;
      img.data[i * 4 + 1] = 18 * v;
      img.data[i * 4 + 2] = 17 * v;
      img.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = toTexture(c, { srgb: true, repeat: 3, anisotropy: 8 });
  cache.set(key, tex);
  return tex;
}

/* ------------------------------------------------------------------ */
/* Tipografía y piezas impresas                                        */
/* ------------------------------------------------------------------ */

export const FONT_SERIF = '"EB Garamond", Garamond, "Times New Roman", serif';
export const FONT_SANS = '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif';
export const FONT_MONO = '"IBM Plex Mono", Menlo, monospace';

const GOLD = '#b8963e';
const INK = '#1a2132';

/** Emblema del sistema: roseta de agave estilizada dentro de un doble círculo. */
export function drawEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = r * 0.05;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = r * 0.02;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
  ctx.stroke();
  // Hojas de agave
  const leaves = 7;
  for (let i = 0; i < leaves; i++) {
    const a = -Math.PI / 2 + (i - (leaves - 1) / 2) * 0.32;
    const len = r * (0.66 - Math.abs(i - (leaves - 1) / 2) * 0.05);
    ctx.save();
    ctx.translate(0, r * 0.42);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-r * 0.06, 0);
    ctx.quadraticCurveTo(-r * 0.05, -len * 0.6, 0, -len);
    ctx.quadraticCurveTo(r * 0.05, -len * 0.6, r * 0.06, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.fillRect(-r * 0.4, r * 0.44, r * 0.8, r * 0.04);
  ctx.restore();
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: 'left' | 'center' | 'right' = 'left') {
  const chars = [...text];
  const width = chars.reduce((w, ch) => w + ctx.measureText(ch).width + spacing, -spacing);
  let cx = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const ch of chars) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = prev;
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, family: string, weight: number, max: number, maxWidth: number) {
  let size = max;
  do {
    ctx.font = `${weight} ${size}px ${family}`;
    size -= 2;
  } while (ctx.measureText(text).width > maxWidth && size > 10);
}

function paperFill(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, base = '#ece4d2') {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const r = rng(seed);
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < (w * h) / 260; i++) {
    ctx.fillStyle = r() > 0.5 ? '#6b5a3a' : '#ffffff';
    ctx.fillRect(r() * w, r() * h, 1.3, 1.3);
  }
  ctx.globalAlpha = 1;
  // Ligera viñeta de envejecimiento en los bordes
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(90,70,30,0.16)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export interface LabelInfo {
  index: number;
  code: string;
  title: string;
  subtitle: string;
  caseId: string;
  count: number;
}

/** Etiqueta frontal de papel con marco dorado impreso. Proporción 2:1. */
export function folderLabel(info: LabelInfo, width = 1024) {
  const key = `label-${info.code}-${width}`;
  if (cache.has(key)) return cache.get(key)!;
  const w = width;
  const h = width / 2;
  const s = w / 1024;
  const [c, ctx] = canvasOf(w, h);
  paperFill(ctx, w, h, info.index * 13 + 5);

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 6 * s;
  ctx.strokeRect(22 * s, 22 * s, w - 44 * s, h - 44 * s);
  ctx.lineWidth = 1.5 * s;
  ctx.strokeRect(36 * s, 36 * s, w - 72 * s, h - 72 * s);

  drawEmblem(ctx, 128 * s, 150 * s, 62 * s, INK);

  ctx.fillStyle = INK;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${27 * s}px ${FONT_SANS}`;
  spaced(ctx, 'AGAVE CASE SYSTEM', 220 * s, 120 * s, 6 * s);
  ctx.font = `500 ${23 * s}px ${FONT_MONO}`;
  ctx.fillStyle = '#353d52';
  ctx.fillText(`EXPEDIENTE ${info.caseId}`, 220 * s, 152 * s);

  ctx.textAlign = 'right';
  ctx.fillStyle = GOLD;
  ctx.font = `500 ${118 * s}px ${FONT_SERIF}`;
  ctx.fillText(String(info.index).padStart(2, '0'), w - 70 * s, 190 * s);
  ctx.textAlign = 'left';

  ctx.fillStyle = GOLD;
  ctx.fillRect(70 * s, 236 * s, w - 140 * s, 2 * s);

  ctx.fillStyle = INK;
  fitFont(ctx, info.title, FONT_SERIF, 600, 66 * s, w - 140 * s);
  ctx.fillText(info.title, 70 * s, 318 * s);
  ctx.font = `italic 500 ${34 * s}px ${FONT_SERIF}`;
  ctx.fillStyle = '#2a3247';
  ctx.fillText(info.subtitle, 70 * s, 364 * s);

  ctx.font = `500 ${26 * s}px ${FONT_MONO}`;
  ctx.fillStyle = INK;
  ctx.fillText(info.code, 70 * s, 432 * s);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#353d52';
  ctx.fillText(`${info.count} DOCUMENTOS`, w - 70 * s, 430 * s);
  ctx.textAlign = 'left';

  const tex = toTexture(c, { srgb: true, anisotropy: 8 });
  cache.set(key, tex);
  return tex;
}

/** Etiqueta del lomo. Proporción 8:1 (se dibuja horizontal y se rota en la geometría). */
export function spineLabel(info: LabelInfo, width = 1024) {
  const key = `spine-${info.code}-${width}`;
  if (cache.has(key)) return cache.get(key)!;
  const w = width;
  const h = width / 8;
  const s = w / 1024;
  const [c, ctx] = canvasOf(w, h);
  paperFill(ctx, w, h, info.index * 7 + 2, '#e6dcc6');
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3 * s;
  ctx.strokeRect(8 * s, 8 * s, w - 16 * s, h - 16 * s);
  ctx.fillStyle = GOLD;
  ctx.font = `600 ${62 * s}px ${FONT_SERIF}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(String(info.index).padStart(2, '0'), 26 * s, h / 2 + 3 * s);
  ctx.fillStyle = INK;
  fitFont(ctx, info.title, FONT_SANS, 600, 34 * s, w - 260 * s);
  spaced(ctx, info.title, 120 * s, h / 2 + 2 * s, 2 * s);
  ctx.font = `400 ${20 * s}px ${FONT_MONO}`;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#4a5368';
  ctx.fillText(info.code, w - 24 * s, h / 2 + 2 * s);
  const tex = toTexture(c, { srgb: true });
  cache.set(key, tex);
  return tex;
}

/** Forro interior de la solapa: papel marmolado azul muy sobrio. */
export function liningPattern(size = 512) {
  const key = `lining-${size}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, ctx] = canvasOf(size, size);
  const n = fbm(size, 3, 5, 61);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < n.length; i++) {
    const v = Math.sin(n[i] * 40) * 0.5 + 0.5;
    img.data[i * 4] = 28 + v * 18;
    img.data[i * 4 + 1] = 38 + v * 22;
    img.data[i * 4 + 2] = 62 + v * 30;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = toTexture(c, { srgb: true, repeat: 1 });
  cache.set(key, tex);
  return tex;
}

/* ------------------------------------------------------------------ */
/* Hojas de documento                                                  */
/* ------------------------------------------------------------------ */

export interface SheetInfo {
  id: string;
  code: string;
  title: string;
  date: string;
  type: string;
  statusLabel: string;
  statusColor: string;
  letterhead: string;
  ordinal: number;
}

/** Proporción de las hojas 3D (ancho/alto). */
export const SHEET_ASPECT = 2.0 / 2.75;

/**
 * Cara de una hoja. La franja superior (cabecera) contiene nombre,
 * identificador, fecha, tipo y estado de revisión, porque es lo que se ve
 * cuando los documentos asoman escalonados fuera de la carpeta.
 * No se cachea: la crea y la libera DocumentStack3D.
 */
export function documentSheet(info: SheetInfo, width = 1024) {
  const w = width;
  const h = Math.round(width / SHEET_ASPECT);
  const s = w / 1024;
  const [c, ctx] = canvasOf(w, h);
  paperFill(ctx, w, h, info.ordinal * 31 + info.code.length, '#f1ece0');

  const header = h * SHEET_HEADER_FRACTION;
  const pad = 46 * s;

  // Pestaña de índice: banda superior con borde de estado.
  ctx.fillStyle = 'rgba(26,33,50,0.05)';
  ctx.fillRect(0, 0, w, header);
  ctx.fillStyle = info.statusColor;
  ctx.fillRect(0, 0, 12 * s, header);

  ctx.fillStyle = INK;
  ctx.textBaseline = 'alphabetic';
  fitFont(ctx, info.title, FONT_SERIF, 600, 50 * s, w - pad * 2 - 230 * s);
  ctx.fillText(info.title, pad, 66 * s);

  ctx.font = `500 ${25 * s}px ${FONT_MONO}`;
  ctx.fillStyle = '#2c3550';
  ctx.fillText(info.code, pad, 112 * s);
  ctx.fillStyle = '#5a6278';
  ctx.font = `400 ${25 * s}px ${FONT_SANS}`;
  const codeW = ctx.measureText(info.code).width + 0;
  ctx.fillText(`  ·  ${info.date}  ·  ${info.type}`, pad + codeW + 20 * s, 112 * s);

  // Sello de estado de revisión
  ctx.save();
  ctx.translate(w - pad - 100 * s, 66 * s);
  ctx.rotate(-0.04);
  ctx.strokeStyle = info.statusColor;
  ctx.fillStyle = info.statusColor;
  ctx.lineWidth = 3.5 * s;
  ctx.font = `700 ${21 * s}px ${FONT_SANS}`;
  const label = info.statusLabel.toUpperCase();
  const lw = Math.max(170 * s, ctx.measureText(label).width + 34 * s);
  ctx.strokeRect(-lw / 2, -30 * s, lw, 52 * s);
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, 4 * s);
  ctx.restore();

  ctx.fillStyle = GOLD;
  ctx.fillRect(pad, header - 14 * s, w - pad * 2, 2 * s);

  // Cuerpo: membrete y renglones que sugieren texto (el contenido real se lee en el visor).
  let y = header + 70 * s;
  drawEmblem(ctx, pad + 34 * s, y + 4 * s, 34 * s, '#2c3550');
  ctx.fillStyle = INK;
  ctx.font = `600 ${24 * s}px ${FONT_SANS}`;
  ctx.fillText(info.letterhead.toUpperCase().slice(0, 52), pad + 90 * s, y);
  ctx.font = `400 ${19 * s}px ${FONT_SANS}`;
  ctx.fillStyle = '#5a6278';
  ctx.fillText(`Ref. ${info.code}`, pad + 90 * s, y + 30 * s);
  y += 110 * s;

  const r = rng(info.ordinal * 97 + 3);
  ctx.fillStyle = 'rgba(30,36,52,0.55)';
  for (let para = 0; para < 7 && y < h - 220 * s; para++) {
    const lines = 2 + Math.floor(r() * 4);
    for (let l = 0; l < lines; l++) {
      const lineW = l === lines - 1 ? 0.3 + r() * 0.5 : 0.92 + r() * 0.08;
      ctx.fillRect(pad, y, (w - pad * 2) * lineW, 7 * s);
      y += 26 * s;
    }
    y += 22 * s;
  }

  // Firma y sello
  ctx.strokeStyle = 'rgba(26,40,90,0.7)';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  const sx = w - pad - 300 * s;
  const sy = h - 150 * s;
  ctx.moveTo(sx, sy);
  for (let i = 0; i < 12; i++) ctx.quadraticCurveTo(sx + i * 22 * s + 10 * s, sy - 30 * s * r(), sx + (i + 1) * 22 * s, sy + (r() - 0.5) * 20 * s);
  ctx.stroke();
  ctx.fillStyle = '#8a8f99';
  ctx.fillRect(sx, sy + 20 * s, 260 * s, 2 * s);

  // Marca de agua obligatoria
  ctx.save();
  ctx.translate(w / 2, h * 0.58);
  ctx.rotate(-0.5);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(142,59,59,0.16)';
  ctx.font = `700 ${54 * s}px ${FONT_SANS}`;
  ctx.fillText('MATERIAL FICTICIO', 0, 0);
  ctx.font = `600 ${34 * s}px ${FONT_SANS}`;
  ctx.fillText('SIMULACIÓN ACADÉMICA', 0, 50 * s);
  ctx.restore();

  ctx.fillStyle = '#8e3b3b';
  ctx.font = `600 ${16 * s}px ${FONT_SANS}`;
  ctx.textAlign = 'center';
  spaced(ctx, 'MATERIAL FICTICIO — SIMULACIÓN ACADÉMICA', w / 2, h - 40 * s, 3 * s, 'center');

  return toTexture(c, { srgb: true, anisotropy: 8 });
}

/** Reverso de las hojas (papel liso). Compartido. */
export function sheetBack(size = 256) {
  const key = `sheetback-${size}`;
  if (cache.has(key)) return cache.get(key)!;
  const [c, ctx] = canvasOf(size, Math.round(size / SHEET_ASPECT));
  paperFill(ctx, c.width, c.height, 99, '#e9e3d4');
  const tex = toTexture(c, { srgb: true });
  cache.set(key, tex);
  return tex;
}
