import gsap from 'gsap';
import * as THREE from 'three';
import { SHEET } from './folderGeometry';
import { cameraRig } from './cameraRig';
import type { DocRig } from './rigRegistry';

/**
 * Extracción de una hoja: se eleva desde el interior del bolsillo, viaja
 * en arco hacia la cámara, gira hasta quedar de frente y se amplía hasta
 * ocupar la superficie de lectura. El regreso recorre el camino inverso y
 * reacomoda el resto de hojas.
 */

const OUT_OF_POCKET = SHEET.H * 0.78;

interface WorldPose {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: number;
}

function worldPoseOf(obj: THREE.Object3D): WorldPose {
  obj.updateWorldMatrix(true, false);
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const s = new THREE.Vector3();
  obj.matrixWorld.decompose(position, quaternion, s);
  return { position, quaternion, scale: s.x };
}

/** Vuelo en arco (Bézier cuadrática) entre dos poses mundiales. */
function flight(obj: THREE.Object3D, getFrom: () => WorldPose, to: () => WorldPose, vars: gsap.TweenVars & { arc?: number }) {
  const p = { t: 0 };
  let a: WorldPose;
  let b: WorldPose;
  const mid = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const { arc = 0.6, ...rest } = vars;
  return gsap.to(p, {
    t: 1,
    ...rest,
    onStart: () => {
      a = getFrom();
      b = to();
      mid.lerpVectors(a.position, b.position, 0.5);
      // El arco sube y se aproxima a la cámara: la hoja "sale" hacia el lector.
      const toCam = tmp.copy(cameraRig.position).sub(mid).normalize();
      mid.addScaledVector(toCam, arc * 0.6).add(new THREE.Vector3(0, arc, 0));
    },
    onUpdate: () => {
      const t = p.t;
      const u = 1 - t;
      obj.position.set(
        u * u * a.position.x + 2 * u * t * mid.x + t * t * b.position.x,
        u * u * a.position.y + 2 * u * t * mid.y + t * t * b.position.y,
        u * u * a.position.z + 2 * u * t * mid.z + t * t * b.position.z,
      );
      // El giro termina un poco antes que el desplazamiento para leerse "de frente" al llegar.
      const tr = Math.min(1, t * 1.15);
      obj.quaternion.slerpQuaternions(a.quaternion, b.quaternion, tr);
      obj.scale.setScalar(a.scale + (b.scale - a.scale) * t * t);
    },
  });
}

export function createExtractTimeline(doc: DocRig, siblings: DocRig[], layer: THREE.Object3D, target: () => WorldPose) {
  const tl = gsap.timeline();
  const origParent = doc.slot.parent!;
  doc.slot.userData.parent = origParent;

  // 1 · la hoja se eleva desde el interior
  tl.to(doc.slot.position, { y: doc.raisedY + OUT_OF_POCKET, duration: 0.6, ease: 'power2.out' }, 0);
  tl.to(doc.slot.rotation, { z: 0, duration: 0.6 }, 0);
  // Las demás hojas ceden un poco de espacio
  siblings.forEach((s, i) => {
    if (s.id === doc.id) return;
    tl.to(s.slot.position, { y: s.raisedY - 0.12, duration: 0.5, ease: 'power2.out' }, 0.1 + i * 0.03);
  });

  // 2 · sale del contenedor y viaja hacia la cámara girando de frente
  tl.add(
    flight(
      doc.slot,
      () => {
        layer.attach(doc.slot);
        return worldPoseOf(doc.slot);
      },
      target,
      { duration: 1.05, ease: 'power3.inOut', arc: 0.7 },
    ),
    0.55,
  );
  return tl;
}

export function createReturnTimeline(doc: DocRig, siblings: DocRig[]) {
  const tl = gsap.timeline();
  const parent = doc.slot.userData.parent as THREE.Object3D;

  const liftedWorld = (): WorldPose => {
    parent.updateWorldMatrix(true, false);
    const local = new THREE.Object3D();
    parent.add(local);
    local.position.set(doc.slot.userData.homeX ?? 0, doc.raisedY + OUT_OF_POCKET, doc.baseZ);
    local.rotation.set(0, 0, 0);
    const pose = worldPoseOf(local);
    parent.remove(local);
    return pose;
  };

  // 1 · el documento vuelve a la carpeta
  const t0 = 0.18; // el visor 2D se desvanece antes de que la hoja empiece a moverse
  tl.add(flight(doc.slot, () => worldPoseOf(doc.slot), liftedWorld, { duration: 1.0, ease: 'power3.inOut', arc: 0.5 }), t0);
  tl.call(() => {
    parent.attach(doc.slot);
  }, undefined, t0 + 1.0);
  tl.to(doc.slot.position, { y: doc.raisedY, duration: 0.6, ease: 'power2.inOut' }, t0 + 1.02);
  tl.to(doc.slot.rotation, { z: doc.baseRotZ, duration: 0.6 }, t0 + 1.02);

  // 2 · los documentos se reorganizan en su orden
  siblings.forEach((s, i) => {
    if (s.id === doc.id) return;
    tl.to(s.slot.position, { y: s.raisedY, duration: 0.55, ease: 'back.out(1.6)' }, t0 + 1.1 + i * 0.05);
  });
  return tl;
}

/** Recoloca la hoja en lectura si cambia el tamaño de la ventana. */
export function snapToPose(obj: THREE.Object3D, pose: WorldPose) {
  obj.position.copy(pose.position);
  obj.quaternion.copy(pose.quaternion);
  obj.scale.setScalar(pose.scale);
}
