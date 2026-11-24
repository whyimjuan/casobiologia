import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import { tableSurface } from './textures';
import { sceneFx } from './cameraRig';

/** Superficie de trabajo oscura. En calidad alta añade un reflejo muy tenue. */
export function DeskSurface({ reflective, receiveShadow }: { reflective: boolean; receiveShadow: boolean }) {
  const map = useMemo(() => tableSurface(1024), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map, roughness: 0.58, metalness: 0.05 }), [map]);
  const base = useMemo(() => new THREE.Color('#ffffff'), []);

  useFrame(() => {
    if (!reflective) mat.color.copy(base).multiplyScalar(1 - sceneFx.dim.value * 0.5);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={receiveShadow}>
      <planeGeometry args={[90, 90]} />
      {reflective ? (
        <MeshReflectorMaterial
          map={map}
          resolution={512}
          blur={[400, 120]}
          mixBlur={1}
          mixStrength={0.55}
          mixContrast={1}
          mirror={0}
          roughness={0.62}
          metalness={0.05}
          depthScale={0.6}
          minDepthThreshold={0.6}
          maxDepthThreshold={1.2}
        />
      ) : (
        <primitive object={mat} attach="material" />
      )}
    </mesh>
  );
}
