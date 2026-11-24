import * as THREE from 'three';

/**
 * Dimensiones físicas de la carpeta (unidades de escena ≈ decímetros).
 * Marco local: X = ancho, Y = alto (Y+ es el borde superior, donde está la
 * solapa), Z = grosor (Z+ es la cara frontal).
 */
export const FOLDER = {
  W: 2.2,
  H: 3.0,
  T: 0.32,
  /** Grosor de los paneles rígidos */
  P: 0.034,
  /** Longitud de la parte de la solapa que cae sobre la cara frontal */
  FLAP: 1.02,
  CORNER: 0.07,
} as const;

export const SHEET = {
  W: 2.0,
  H: 2.75,
  THICK: 0.004,
} as const;

/** Fracción superior de la hoja que queda a la vista cuando la carpeta está abierta. */
export const SHEET_HEADER_FRACTION = 0.145;
/** Altura de la hoja apoyada en el fondo del bolsillo. */
export const SHEET_REST_Y = -FOLDER.H / 2 + FOLDER.P + 0.012 + SHEET.H / 2;
/** Separación vertical entre cabeceras cuando asoman escalonadas. */
export const SHEET_STEP = SHEET.H * SHEET_HEADER_FRACTION;
/** Elevación de la hoja delantera para que asome su cabecera completa. */
export const SHEET_FRONT_LIFT = FOLDER.H / 2 + SHEET_STEP - (SHEET_REST_Y + SHEET.H / 2);

/** Posición de la hoja k (0 = primera, al fondo y la que más asoma). */
export function sheetLayout(count: number, k: number) {
  const s = count - 1 - k;
  const zFront = FOLDER.T / 2 - FOLDER.P - 0.03;
  const zBack = -FOLDER.T / 2 + FOLDER.P + 0.03;
  const z = count > 1 ? zFront - ((zFront - zBack) * s) / (count - 1) : 0;
  return { z, raisedY: SHEET_REST_Y + SHEET_FRONT_LIFT + s * SHEET_STEP };
}

/** Altura local del borde superior de la hoja más alta con la carpeta abierta. */
export function openStackTop(count: number) {
  return SHEET_REST_Y + SHEET.H / 2 + SHEET_FRONT_LIFT + (Math.max(count, 1) - 1) * SHEET_STEP;
}

/** Ángulos de la articulación de la solapa (radianes). */
export const FLAP_ANGLES = {
  /** Bisagra trasera (puente sobre el grosor): cerrada / abierta */
  hingeClosed: 0,
  hingeOpen: -(Math.PI / 2 + 0.5),
  /** Pliegue delantero (cae sobre la cara): cerrado / desplegado */
  foldClosed: 0,
  foldOpen: -Math.PI / 2 + 0.06,
} as const;

function roundedRect(w: number, h: number, r: number, x = -w / 2, y = -h / 2) {
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Panel con cantos redondeados y biselados. Centrado en XY, de z=0 a z=depth. */
function panel(w: number, h: number, depth: number, r: number) {
  const bevel = Math.min(0.008, depth * 0.3);
  const g = new THREE.ExtrudeGeometry(roundedRect(w, h, r), {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments: 5,
  });
  g.translate(0, 0, bevel);
  return g;
}

/** Forma de la solapa frontal: borde superior recto, esquinas inferiores redondeadas. */
function flapShape(w: number, len: number) {
  const r = 0.16;
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, -len + r);
  s.quadraticCurveTo(w / 2, -len, w / 2 - r, -len);
  s.lineTo(-w / 2 + r, -len);
  s.quadraticCurveTo(-w / 2, -len, -w / 2, -len + r);
  s.closePath();
  return s;
}

function cornerShape(size: number) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(size, 0);
  s.quadraticCurveTo(size * 0.35, size * 0.35, 0, size);
  s.closePath();
  return s;
}

let shared: ReturnType<typeof build> | null = null;

function build() {
  const { W, H, T, P, FLAP, CORNER } = FOLDER;

  const front = panel(W, H, P, CORNER);
  const back = panel(W, H, P, CORNER);

  // Lomo rígido (lado izquierdo) y fuelle plegado (lado derecho)
  const spine = new THREE.BoxGeometry(P, H - 0.02, T - P * 0.5);
  const gusset = new THREE.BoxGeometry(P * 0.6, H - 0.06, T - P * 2);
  const bottom = new THREE.BoxGeometry(W - 0.04, P, T - P * 0.5);

  // Solapa: puente sobre el grosor + caída frontal
  const bridge = new THREE.BoxGeometry(W, P * 0.8, T + P * 0.4);
  bridge.translate(0, (P * 0.8) / 2, (T + P * 0.4) / 2 - P * 0.2);
  const flapGeo = new THREE.ExtrudeGeometry(flapShape(W, FLAP), {
    depth: P * 0.6,
    bevelEnabled: true,
    bevelSize: 0.006,
    bevelThickness: 0.006,
    bevelSegments: 2,
    curveSegments: 8,
  });
  flapGeo.translate(0, 0, 0.006);
  const flapLining = new THREE.ShapeGeometry(flapShape(W - 0.03, FLAP - 0.03), 8);
  flapLining.rotateY(Math.PI);
  flapLining.translate(0, -0.005, -0.0008);
  const bridgeLining = new THREE.PlaneGeometry(W - 0.03, T);
  bridgeLining.rotateX(Math.PI / 2);
  bridgeLining.translate(0, -0.0008, T / 2);
  // Interior del bolsillo (visible al abrir): forro sobre la cara interna trasera
  const pocketLining = new THREE.PlaneGeometry(W - P * 2.2, H - P * 1.5);

  // Ribete dorado siguiendo el contorno inferior de la solapa
  const pts = flapShape(W - 0.08, FLAP - 0.04).getPoints(10).filter((p) => p.y < -0.001);
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x, p.y, 0)), false, 'centripetal');
  const piping = new THREE.TubeGeometry(curve, 96, 0.0075, 6, false);

  const corner = new THREE.ExtrudeGeometry(cornerShape(0.2), {
    depth: 0.006,
    bevelEnabled: true,
    bevelSize: 0.004,
    bevelThickness: 0.004,
    bevelSegments: 1,
    curveSegments: 6,
  });

  // Broche: botón en la solapa y placa en la cara frontal
  const buttonGeo = new THREE.CylinderGeometry(0.075, 0.082, 0.026, 32);
  buttonGeo.rotateX(Math.PI / 2);
  const buttonRing = new THREE.TorusGeometry(0.052, 0.006, 8, 32);
  // Botón hembra del broche, fijo en la cara frontal bajo la solapa
  const claspStud = new THREE.CylinderGeometry(0.05, 0.056, 0.016, 28);
  claspStud.rotateX(Math.PI / 2);
  claspStud.translate(0, 0, 0.008);

  // Portaetiquetas metálico
  const LABEL_W = 1.62;
  const LABEL_H = LABEL_W / 2;
  const frameBar = (w: number, h: number) => new THREE.BoxGeometry(w, h, 0.016);
  const labelFrame = [
    { g: frameBar(LABEL_W + 0.08, 0.04), p: [0, LABEL_H / 2 + 0.02, 0] },
    { g: frameBar(LABEL_W + 0.08, 0.04), p: [0, -LABEL_H / 2 - 0.02, 0] },
    { g: frameBar(0.04, LABEL_H), p: [-LABEL_W / 2 - 0.02, 0, 0] },
    { g: frameBar(0.04, LABEL_H), p: [LABEL_W / 2 + 0.02, 0, 0] },
  ];
  const labelPlane = new THREE.PlaneGeometry(LABEL_W, LABEL_H);
  const spineLabelPlane = new THREE.PlaneGeometry(2.1, T * 0.72);
  const emblemPlane = new THREE.PlaneGeometry(0.34, 0.34);
  const hitbox = new THREE.BoxGeometry(W, H, T + 0.08);
  const sheet = new THREE.BoxGeometry(SHEET.W, SHEET.H, SHEET.THICK);
  const shadowPlane = new THREE.PlaneGeometry(W * 1.35, H * 1.3);

  return {
    front, back, spine, gusset, bottom, bridge, flapGeo, flapLining, bridgeLining, pocketLining, piping, corner,
    buttonGeo, buttonRing, claspStud, labelFrame, labelPlane, spineLabelPlane,
    emblemPlane, hitbox, sheet, shadowPlane,
    LABEL_W, LABEL_H,
  };
}

/** Geometrías compartidas por todas las carpetas (se crean una sola vez). */
export function folderGeometries() {
  if (!shared) shared = build();
  return shared;
}
