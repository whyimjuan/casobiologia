import * as THREE from 'three';
import { FOLDER, SHEET, openStackTop } from './folderGeometry';
import { readingLayout } from '../lib/readingLayout';

export const CAMERA_FOV = 30;

/**
 * Pose base de la cámara. GSAP anima estos vectores; el director los aplica
 * en cada frame y añade un leve paralaje que sigue al cursor.
 */
export const cameraRig = {
  position: new THREE.Vector3(0, 11, 10),
  target: new THREE.Vector3(0, 0, 0.4),
  /** 0..1, amplitud del paralaje (se apaga durante la lectura). */
  parallax: { value: 1 },
};

/** Efectos globales de escena controlados por las secuencias. */
export const sceneFx = {
  /** Oscurece el conjunto cuando una carpeta pasa a primer plano. */
  dim: { value: 0 },
};

const tanHalf = (fovDeg: number) => Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2);

export function collectionLayout(aspect: number) {
  const columns = aspect < 0.95 ? 2 : 4;
  const rows = 8 / columns;
  const gapX = FOLDER.W + 0.62;
  const gapZ = FOLDER.H + 0.7;
  return { columns, rows, gapX, gapZ, width: columns * gapX, depth: rows * gapZ };
}

const probe = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 200);

/**
 * Busca la distancia mínima a la que todos los puntos caben dentro del
 * rectángulo NDC indicado (descontando barra superior y paneles).
 */
function fitDistance(points: THREE.Vector3[], target: THREE.Vector3, dir: THREE.Vector3, aspect: number, box: { x: number; top: number; bottom: number }) {
  probe.aspect = aspect;
  probe.updateProjectionMatrix();
  const v = new THREE.Vector3();
  const fits = (d: number) => {
    probe.position.copy(target).addScaledVector(dir, d);
    probe.lookAt(target);
    probe.updateMatrixWorld();
    return points.every((p) => {
      v.copy(p).project(probe);
      return Math.abs(v.x) <= box.x && v.y <= box.top && v.y >= box.bottom && v.z < 1;
    });
  };
  let lo = 4;
  let hi = 120;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

export function collectionCameraPose(w: number, h: number) {
  const aspect = w / h;
  const { width, depth } = collectionLayout(aspect);
  const portrait = aspect < 0.95;
  // En vertical la cámara se eleva más para que las filas no se escorcen.
  const dir = new THREE.Vector3(0, portrait ? 1.9 : 1.08, 1).normalize();
  const target = new THREE.Vector3(0, 0, portrait ? 0.2 : 0.35);
  const hw = width / 2 - 0.25;
  const hd = depth / 2 - 0.2;
  const pts: THREE.Vector3[] = [];
  for (const x of [-hw, hw]) for (const z of [-hd, hd]) for (const y of [0, 0.5]) pts.push(new THREE.Vector3(x, y, z));
  const top = 1 - (2 * (64 + 24)) / h;
  const bottom = -1 + (2 * 96) / h;
  const d = fitDistance(pts, target, dir, aspect, { x: 0.94, top, bottom });
  return { position: target.clone().addScaledVector(dir, d), target };
}

/** Punto de presentación de la carpeta seleccionada, delante de la mesa. */
export const STAGE = {
  position: new THREE.Vector3(0, 2.3, 4.4),
  lean: -0.1,
  scale: 1.12,
};

export function stageQuaternion() {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(STAGE.lean, 0, 0));
}

/** Área de pantalla libre (NDC) cuando la carpeta está abierta, según los paneles 2D. */
function openViewport(w: number, h: number) {
  const top = 1 - (2 * (64 + 18)) / h;
  if (w >= 1024) {
    // Panel lateral a la derecha y pestañas de carpetas abajo
    return { left: -1 + (2 * 24) / w, right: 1 - (2 * (360 + 24)) / w, top, bottom: -1 + (2 * 96) / h };
  }
  // Panel inferior (hasta un 38 % + pestañas)
  return { left: -0.96, right: 0.96, top, bottom: -1 + (2 * (h * 0.38 + 96)) / h };
}

/** Encuadre de la carpeta abierta con sus documentos asomando. */
export function stageCameraPose(w: number, h: number, docCount: number) {
  const aspect = w / h;
  const s = STAGE.scale;
  const top = (openStackTop(docCount) + 0.12) * s;
  const bottom = (-FOLDER.H / 2 - 0.08) * s;
  const half = (FOLDER.W / 2 + 0.08) * s;
  const q = stageQuaternion();
  const local = [
    new THREE.Vector3(-half, top, 0), new THREE.Vector3(half, top, 0),
    new THREE.Vector3(-half, bottom, FOLDER.T), new THREE.Vector3(half, bottom, FOLDER.T),
  ].map((p) => p.applyQuaternion(q).add(STAGE.position));
  const center = local.reduce((acc, p) => acc.add(p), new THREE.Vector3()).multiplyScalar(1 / local.length);

  const vp = openViewport(w, h);
  const dir = new THREE.Vector3(0, 0.2, 1).normalize();
  const t = tanHalf(CAMERA_FOV);
  const halfH = (vp.top - vp.bottom) / 2;
  const halfW = (vp.right - vp.left) / 2;
  const contentH = Math.abs(local[0].y - local[2].y);
  const contentW = half * 2;
  const d = Math.max(contentH / 2 / (t * halfH * 0.94), contentW / 2 / (t * aspect * halfW * 0.94));

  // Desplazar el objetivo para que el contenido quede centrado en el área libre.
  const xc = (vp.left + vp.right) / 2;
  const yc = (vp.top + vp.bottom) / 2;
  const right = new THREE.Vector3(1, 0, 0);
  const up = new THREE.Vector3().crossVectors(right, dir.clone().negate()).normalize();
  const target = center.clone()
    .addScaledVector(right, -xc * d * t * aspect)
    .addScaledVector(up, -yc * d * t);
  return { position: target.clone().addScaledVector(dir, d), target };
}

/**
 * Pose mundial de una hoja en la superficie de lectura, alineada con el
 * rectángulo que ocupará el visor 2D.
 */
export function readingSheetPose(camera: THREE.PerspectiveCamera, vw: number, vh: number) {
  const L = readingLayout(vw, vh);
  const dist = 3;
  const worldPerPx = (2 * dist * tanHalf(camera.fov)) / vh;
  const m = new THREE.Matrix4().lookAt(cameraRig.position, cameraRig.target, new THREE.Vector3(0, 1, 0));
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(m);
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);
  const position = cameraRig.position.clone()
    .addScaledVector(forward, dist)
    .addScaledVector(right, (L.centerX - vw / 2) * worldPerPx)
    .addScaledVector(up, -(L.centerY - vh / 2) * worldPerPx);
  // Se ajusta por el ancho: la hoja 3D queda oculta justo detrás de la página del visor.
  const scale = (L.pageW * worldPerPx) / SHEET.W;
  return { position, quaternion, scale };
}
