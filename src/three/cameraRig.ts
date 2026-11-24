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

export function collectionCameraPose(aspect: number) {
  const { width, depth } = collectionLayout(aspect);
  const dir = new THREE.Vector3(0, 1.08, 1).normalize();
  const t = tanHalf(CAMERA_FOV);
  const fitW = (width * 0.56) / (t * aspect);
  const fitH = (depth * 0.62) / t;
  const d = Math.max(fitW, fitH, 12);
  const target = new THREE.Vector3(0, 0, 0.35);
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

/** Encuadre de la carpeta abierta con sus documentos asomando. */
export function stageCameraPose(aspect: number, docCount: number) {
  const top = openStackTop(docCount) + 0.15;
  const bottom = -FOLDER.H / 2;
  const s = STAGE.scale;
  const centerLocalY = (top + bottom) / 2;
  const height = (top - bottom) * s * 1.3;
  const wide = aspect > 1.25;
  const width = FOLDER.W * s * (wide ? 2.3 : 1.25);

  const t = tanHalf(CAMERA_FOV);
  const d = Math.max(height / (2 * t), width / (2 * t * aspect));
  const center = STAGE.position.clone().add(new THREE.Vector3(0, centerLocalY * s, -centerLocalY * s * Math.sin(-STAGE.lean)));
  // En pantallas anchas se reserva la mitad derecha para el panel de metadatos.
  const target = center.clone().add(new THREE.Vector3(wide ? FOLDER.W * s * 0.55 : 0, 0, 0));
  const dir = new THREE.Vector3(0, 0.2, 1).normalize();
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
