import { useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor, SoftShadows } from '@react-three/drei';
import type { CaseFile } from '../data/types';
import { QUALITY_SETTINGS } from '../lib/deviceProfile';
import { useCaseStore } from '../state/caseStore';
import { FolderCollection3D } from './FolderCollection3D';
import { SceneDirector } from './SceneDirector';
import { StudioLighting } from './StudioLighting';
import { DeskSurface } from './DeskSurface';
import { CAMERA_FOV } from './cameraRig';

export function Experience3D({ caseFile, quality }: { caseFile: CaseFile; quality: 'high' | 'balanced' | 'low' }) {
  const settings = QUALITY_SETTINGS[quality];
  const layer = useRef<THREE.Group>(null);
  const [dpr, setDpr] = useState(settings.dpr[1]);
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <Canvas
      className="stage-canvas"
      shadows={settings.shadows ? 'soft' : false}
      dpr={dpr}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 80, position: [0, 11, 10] }}
      gl={{ antialias: settings.antialias, powerPreference: 'high-performance', alpha: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      onPointerMissed={() => {
        useCaseStore.getState().hoverFolder(null);
        document.body.style.cursor = '';
      }}
    >
      <color attach="background" args={['#06080d']} />
      <fog attach="fog" args={['#06080d', 24, 58]} />
      {settings.softShadows && <SoftShadows size={18} samples={10} focus={0.6} />}
      <PerformanceMonitor
        bounds={() => [40, 60]}
        onDecline={() => setDpr((d) => Math.max(1, d - 0.25))}
        onIncline={() => setDpr((d) => Math.min(settings.dpr[1], d + 0.25))}
        flipflops={3}
      />
      <StudioLighting settings={settings} />
      <DeskSurface reflective={quality === 'high'} receiveShadow={settings.shadows} />
      <FolderCollection3D caseFile={caseFile} settings={settings} />
      {/* Capa a la que se trasladan las hojas mientras viajan hacia la cámara */}
      <group ref={layer} name="extraction-layer" />
      <SceneDirector layer={layer} timeScale={reducedMotion ? 2.2 : 1} />
    </Canvas>
  );
}
