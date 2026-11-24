import type * as THREE from 'three';

/**
 * Registro de los nodos animables. Los componentes 3D se registran aquí al
 * montarse; el director de animaciones (FolderOpeningAnimation /
 * DocumentExtractionAnimation) los manipula con GSAP sin pasar por React.
 */

export interface FolderRig {
  id: string;
  /** Posición/orientación global de la carpeta (GSAP). */
  root: THREE.Group;
  /** Elevación e inclinación de hover (amortiguado por frame). */
  hover: THREE.Group;
  /** Giro de presentación para mostrar el volumen (GSAP). */
  turn: THREE.Group;
  /** Bisagra trasera de la solapa. */
  hinge: THREE.Group;
  /** Pliegue delantero de la solapa. */
  fold: THREE.Group;
  /** Contenedor de documentos dentro del bolsillo. */
  docs: THREE.Group;
  home: { position: THREE.Vector3; quaternion: THREE.Quaternion };
  /** Intensidad del realce dorado (0..1), la usa el hover y la apertura. */
  glow: { value: number };
}

export interface DocRig {
  id: string;
  folderId: string;
  order: number;
  /** Nodo que se extrae de la carpeta. */
  slot: THREE.Group;
  /** Desplazamiento de hover dentro de la carpeta abierta. */
  hover: THREE.Group;
  restY: number;
  raisedY: number;
  baseZ: number;
  baseRotZ: number;
}

export const folderRigs = new Map<string, FolderRig>();
export const docRigs = new Map<string, DocRig>();

export function docRigsOf(folderId: string) {
  return [...docRigs.values()].filter((d) => d.folderId === folderId).sort((a, b) => a.order - b.order);
}

/** Avisos para el director cuando un conjunto de documentos termina de montarse. */
type Listener = () => void;
const listeners = new Set<Listener>();
export function onRigsChanged(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function notifyRigsChanged() {
  listeners.forEach((l) => l());
}
