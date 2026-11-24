import gsap from 'gsap';
import * as THREE from 'three';
import { FLAP_ANGLES } from './folderGeometry';
import { cameraRig, sceneFx, STAGE, stageQuaternion, stageCameraPose, collectionCameraPose } from './cameraRig';
import type { DocRig, FolderRig } from './rigRegistry';

/**
 * Secuencias cinematográficas de apertura y cierre de una carpeta.
 *
 * Apertura:
 *  A · la cámara se aproxima a la carpeta sobre la mesa
 *  B · la carpeta se despega, crece y ocupa el centro
 *  C · gira ligeramente para mostrar lomo y grosor
 *  D · la solapa se abre por su bisagra (dos tramos articulados)
 *  E · los documentos emergen escalonados del bolsillo
 */

function slerpTween(target: THREE.Quaternion, to: THREE.Quaternion, vars: gsap.TweenVars) {
  const from = new THREE.Quaternion();
  const p = { t: 0 };
  return gsap.to(p, {
    t: 1,
    ...vars,
    onStart: () => {
      from.copy(target);
    },
    onUpdate: () => {
      target.slerpQuaternions(from, to, p.t);
    },
  });
}

const vec = (v: THREE.Vector3) => ({ x: v.x, y: v.y, z: v.z });

export interface SequenceContext {
  width: number;
  height: number;
  docs: DocRig[];
}

export function createOpenTimeline(rig: FolderRig, ctx: SequenceContext) {
  const home = rig.home.position;
  const finalCam = stageCameraPose(ctx.width, ctx.height, ctx.docs.length);
  const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });

  // Estado de partida limpio (por si una secuencia anterior se interrumpió)
  rig.turn.rotation.y = 0;

  // ── A · aproximación de cámara ──────────────────────────────────────
  tl.addLabel('A', 0);
  tl.to(rig.glow, { value: 1, duration: 0.35, ease: 'power1.out' }, 'A');
  tl.to(cameraRig.target, { x: home.x * 0.7, y: 0.2, z: home.z * 0.7 + 0.4, duration: 1.15 }, 'A');
  tl.to(cameraRig.position, { x: home.x * 0.6, y: 8.4, z: home.z + 8.6, duration: 1.15 }, 'A');
  tl.to(sceneFx.dim, { value: 1, duration: 1.6, ease: 'power1.inOut' }, 'A+=0.25');

  // ── B · la carpeta se despega de la mesa y viene al centro ───────────
  tl.addLabel('B', 0.6);
  tl.to(rig.root.position, { y: home.y + 0.7, duration: 0.55, ease: 'power2.out' }, 'B');
  tl.to(rig.root.position, { ...vec(STAGE.position), duration: 1.3, ease: 'power3.inOut' }, 'B+=0.4');
  tl.add(slerpTween(rig.root.quaternion, stageQuaternion(), { duration: 1.4, ease: 'power2.inOut' }), 'B+=0.3');
  tl.to(rig.root.scale, { x: STAGE.scale, y: STAGE.scale, z: STAGE.scale, duration: 1.3 }, 'B+=0.4');
  tl.to(cameraRig.position, { ...vec(finalCam.position), duration: 1.6 }, 'B+=0.35');
  tl.to(cameraRig.target, { ...vec(finalCam.target), duration: 1.6 }, 'B+=0.35');

  // ── C · giro para mostrar el volumen ────────────────────────────────
  tl.addLabel('C', 2.15);
  tl.to(rig.turn.rotation, { y: 0.52, duration: 0.85, ease: 'sine.inOut' }, 'C');
  tl.to(rig.turn.rotation, { y: 0.1, duration: 0.85, ease: 'sine.inOut' }, 'C+=0.85');

  // ── D · apertura física de la solapa ────────────────────────────────
  tl.addLabel('D', 3.35);
  tl.to(rig.hinge.rotation, { x: FLAP_ANGLES.hingeOpen, duration: 1.15, ease: 'power2.inOut' }, 'D');
  tl.to(rig.fold.rotation, { x: FLAP_ANGLES.foldOpen, duration: 0.95, ease: 'power2.inOut' }, 'D+=0.12');

  // ── E · los documentos aparecen progresivamente ─────────────────────
  tl.addLabel('E', 4.25);
  [...ctx.docs].reverse().forEach((d, i) => {
    tl.to(d.slot.position, { y: d.raisedY, duration: 0.75, ease: 'power3.out' }, `E+=${i * 0.14}`);
  });
  tl.to(rig.glow, { value: 0.25, duration: 0.8 }, 'E');
  return tl;
}

export function createCloseTimeline(rig: FolderRig, ctx: SequenceContext) {
  const home = rig.home.position;
  const cam = collectionCameraPose(ctx.width, ctx.height);
  const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });

  // 1 · los documentos vuelven al fondo del bolsillo
  ctx.docs.forEach((d, i) => {
    tl.to(d.slot.position, { y: d.restY, duration: 0.55, ease: 'power2.in' }, i * 0.07);
  });
  // 2 · la solapa se cierra: primero el pliegue se recoge, luego baja la bisagra
  const tFlap = 0.45 + ctx.docs.length * 0.07;
  tl.to(rig.hinge.rotation, { x: FLAP_ANGLES.hingeClosed, duration: 0.95 }, tFlap);
  tl.to(rig.fold.rotation, { x: FLAP_ANGLES.foldClosed, duration: 0.85, ease: 'power2.in' }, tFlap + 0.2);
  tl.to(rig.turn.rotation, { y: 0, duration: 0.8 }, tFlap + 0.6);

  // 3 · la cámara retrocede y la carpeta vuelve a su sitio en la mesa
  const tBack = tFlap + 1.05;
  tl.to(cameraRig.position, { ...vec(cam.position), duration: 1.5 }, tBack);
  tl.to(cameraRig.target, { ...vec(cam.target), duration: 1.5 }, tBack);
  tl.to(rig.root.position, { x: home.x, y: home.y + 0.6, z: home.z, duration: 1.15, ease: 'power3.inOut' }, tBack);
  tl.add(slerpTween(rig.root.quaternion, rig.home.quaternion, { duration: 1.15, ease: 'power2.inOut' }), tBack);
  tl.to(rig.root.scale, { x: 1, y: 1, z: 1, duration: 1.1 }, tBack);
  tl.to(rig.root.position, { y: home.y, duration: 0.45, ease: 'power2.out' }, tBack + 1.15);
  tl.to(sceneFx.dim, { value: 0, duration: 1.2 }, tBack + 0.3);
  tl.to(rig.glow, { value: 0, duration: 0.8 }, tBack + 0.8);
  return tl;
}

/** Coloca una carpeta directamente en su estado abierto (cambio de tamaño de ventana, recarga). */
export function snapCameraToStage(w: number, h: number, docCount: number) {
  const p = stageCameraPose(w, h, docCount);
  cameraRig.position.copy(p.position);
  cameraRig.target.copy(p.target);
}

export function snapCameraToCollection(w: number, h: number) {
  const p = collectionCameraPose(w, h);
  cameraRig.position.copy(p.position);
  cameraRig.target.copy(p.target);
}
