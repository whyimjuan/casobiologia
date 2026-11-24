import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useCaseStore, type Phase } from '../state/caseStore';
import { folderRigs, docRigs, docRigsOf, onRigsChanged } from './rigRegistry';
import { cameraRig, readingSheetPose } from './cameraRig';
import { createCloseTimeline, createOpenTimeline, snapCameraToCollection, snapCameraToStage } from './FolderOpeningAnimation';
import { createExtractTimeline, createReturnTimeline, snapToPose } from './DocumentExtractionAnimation';

const PARALLAX_TARGET: Partial<Record<Phase, number>> = { collection: 1, open: 0.3, opening: 0.15, closing: 0.15 };

/**
 * Director de la experiencia: traduce los cambios de fase del estado en
 * secuencias GSAP sobre los nodos registrados, y aplica la cámara cada frame.
 */
export function SceneDirector({ layer, timeScale = 1 }: { layer: React.RefObject<THREE.Group>; timeScale?: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const phase = useCaseStore((s) => s.phase);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const parallax = useRef(new THREE.Vector2());

  // Encuadre inicial
  useEffect(() => {
    snapCameraToCollection(size.width / size.height);
    camera.position.copy(cameraRig.position);
    camera.lookAt(cameraRig.target);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fases → secuencias
  useEffect(() => {
    const { activeFolderId, activeDocId, caseFile, completePhase } = useCaseStore.getState();
    const aspect = size.width / size.height;
    const run = (make: () => gsap.core.Timeline) => {
      tl.current?.progress(1).kill();
      const t = make();
      t.timeScale(timeScale);
      t.eventCallback('onComplete', () => completePhase(phase));
      tl.current = t;
    };

    if (phase === 'opening' && activeFolderId) {
      const expected = caseFile?.folders.find((f) => f.id === activeFolderId)?.documents.length ?? 0;
      const start = () => {
        const rig = folderRigs.get(activeFolderId);
        const docs = docRigsOf(activeFolderId);
        if (!rig || docs.length < expected) return false;
        run(() => createOpenTimeline(rig, { aspect, docs }));
        return true;
      };
      if (!start()) {
        const off = onRigsChanged(() => {
          if (start()) off();
        });
        return () => {
          off();
        };
      }
    }

    if (phase === 'closing' && activeFolderId) {
      const rig = folderRigs.get(activeFolderId);
      if (rig) run(() => createCloseTimeline(rig, { aspect, docs: docRigsOf(activeFolderId) }));
    }

    if (phase === 'extracting' && activeDocId && activeFolderId && layer.current) {
      const doc = docRigs.get(activeDocId);
      const lyr = layer.current;
      if (doc) {
        run(() =>
          createExtractTimeline(doc, docRigsOf(activeFolderId), lyr, () =>
            readingSheetPose(camera, size.width, size.height),
          ),
        );
      }
    }

    if (phase === 'returning' && activeDocId && activeFolderId) {
      const doc = docRigs.get(activeDocId);
      if (doc) run(() => createReturnTimeline(doc, docRigsOf(activeFolderId)));
    }
    return undefined;
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cambio de tamaño de la ventana en estados estables: reencuadrar sin animación.
  useEffect(() => {
    const { activeFolderId, activeDocId, caseFile } = useCaseStore.getState();
    const aspect = size.width / size.height;
    if (phase === 'collection') snapCameraToCollection(aspect);
    if ((phase === 'open' || phase === 'reading') && activeFolderId) {
      const n = caseFile?.folders.find((f) => f.id === activeFolderId)?.documents.length ?? 1;
      snapCameraToStage(aspect, n);
    }
    if (phase === 'reading' && activeDocId) {
      const doc = docRigs.get(activeDocId);
      if (doc) snapToPose(doc.slot, readingSheetPose(camera, size.width, size.height));
    }
  }, [size.width, size.height]); // eslint-disable-line react-hooks/exhaustive-deps

  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const look = new THREE.Vector3();
  useFrame((state, dt) => {
    const k = Math.min(dt, 1 / 20);
    const p = useCaseStore.getState().phase;
    cameraRig.parallax.value = THREE.MathUtils.damp(cameraRig.parallax.value, PARALLAX_TARGET[p] ?? 0, 4, k);
    parallax.current.x = THREE.MathUtils.damp(parallax.current.x, state.pointer.x, 2.5, k);
    parallax.current.y = THREE.MathUtils.damp(parallax.current.y, state.pointer.y, 2.5, k);

    camera.position.copy(cameraRig.position);
    camera.lookAt(cameraRig.target);
    const a = cameraRig.parallax.value;
    if (a > 0.0001) {
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(right, parallax.current.x * 0.45 * a).addScaledVector(up, parallax.current.y * 0.25 * a);
      look.copy(cameraRig.target).addScaledVector(right, parallax.current.x * 0.12 * a);
      camera.lookAt(look);
    }
  });

  useEffect(() => () => void tl.current?.kill(), []);
  return null;
}
