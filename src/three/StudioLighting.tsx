import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { useCaseStore } from '../state/caseStore';
import { folderRigs } from './rigRegistry';
import { sceneFx, STAGE } from './cameraRig';
import type { QualitySettings } from '../lib/deviceProfile';

/**
 * Iluminación de estudio: luz principal cálida con sombras suaves, contraluz
 * frío, un foco dorado que sigue a la carpeta bajo el cursor y un foco de
 * presentación para la carpeta abierta. El entorno (reflejos del metal) se
 * genera con Lightformers locales: no se descarga ningún HDRI.
 */
export function StudioLighting({ settings }: { settings: QualitySettings }) {
  const hoverSpot = useRef<THREE.SpotLight>(null!);
  const stageSpot = useRef<THREE.SpotLight>(null!);
  const key = useRef<THREE.DirectionalLight>(null!);
  const hoverTarget = useMemo(() => new THREE.Object3D(), []);
  const stageTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.copy(STAGE.position);
    return o;
  }, []);

  useFrame((_, dt) => {
    const k = Math.min(dt, 1 / 30);
    const { hoveredFolderId } = useCaseStore.getState();
    const rig = hoveredFolderId ? folderRigs.get(hoveredFolderId) : undefined;
    const s = hoverSpot.current;
    if (rig) {
      hoverTarget.position.lerp(rig.root.position, 1 - Math.exp(-12 * k));
      s.position.set(hoverTarget.position.x + 0.6, 5.5, hoverTarget.position.z + 2.6);
    }
    s.intensity = THREE.MathUtils.damp(s.intensity, rig ? 42 : 0, 6, k);
    stageSpot.current.intensity = 70 * sceneFx.dim.value;
    key.current.intensity = 2.1 - sceneFx.dim.value * 0.9;
  });

  return (
    <>
      <hemisphereLight args={['#aeb9d6', '#0b0907', 0.32]} />
      <directionalLight
        ref={key}
        position={[-5.5, 12, 7]}
        intensity={2.1}
        color="#fff1dc"
        castShadow={settings.shadows}
        shadow-mapSize={[settings.shadowMapSize, settings.shadowMapSize]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-radius={6}
      />
      <directionalLight position={[6, 5, -9]} intensity={0.9} color="#8fa6d6" />
      <primitive object={hoverTarget} />
      <spotLight ref={hoverSpot} target={hoverTarget} color="#ffcf80" angle={0.42} penumbra={1} decay={1.6} distance={14} intensity={0} />
      <primitive object={stageTarget} />
      <spotLight ref={stageSpot} target={stageTarget} position={[2.5, 8.5, 10]} color="#ffe6bd" angle={0.38} penumbra={0.9} decay={1.2} distance={30} intensity={0} />
      <Environment resolution={settings.envResolution} frames={1}>
        <Lightformer form="rect" intensity={3.2} color="#fff3df" position={[0, 6, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1.3} color="#c9d6ff" position={[-7, 2, 0]} rotation={[0, Math.PI / 2, 0]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ffd9a0" position={[7, 2.5, 3]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 1.2, 1]} />
        <Lightformer form="ring" intensity={1.2} color="#ffffff" position={[0, 3, 8]} scale={3} />
      </Environment>
    </>
  );
}
