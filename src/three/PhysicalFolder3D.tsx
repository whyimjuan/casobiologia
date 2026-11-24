import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import type { EvidenceFolder } from '../data/types';
import { FOLDER, FLAP_ANGLES, folderGeometries } from './folderGeometry';
import { bodyMaterial, edgeMaterial, emblemFoilMaterial, goldMaterial, labelMaterial, liningMaterial } from './materials';
import { folderLabel, spineLabel } from './textures';
import { folderRigs, type FolderRig } from './rigRegistry';
import { sceneFx } from './cameraRig';

export interface PhysicalFolder3DProps {
  folder: EvidenceFolder;
  caseId: string;
  homePosition: [number, number, number];
  homeYaw: number;
  textureSize: number;
  shadows: boolean;
  /** Si la carpeta responde al cursor (sólo en el conjunto). */
  interactive: boolean;
  /** Carpeta en primer plano: no se oscurece ni vuelve sola a la mesa. */
  active: boolean;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  /** Contenido del bolsillo (DocumentStack3D). */
  children?: ReactNode;
}

const { W, H, T, P, FLAP } = FOLDER;
const HOVER = { lift: 0.34, tilt: 0.2, scale: 1.045 };

/** Orientación "tumbada sobre la mesa": cara frontal hacia arriba, solapa hacia el fondo. */
export function tableQuaternion(yaw: number) {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, yaw, 'XYZ'));
}

/**
 * Carpeta física: cuerpo de dos paneles rígidos, lomo, fuelle, base,
 * solapa articulada en dos tramos (bisagra trasera + pliegue frontal),
 * etiqueta en portaetiquetas metálico, broche y esquineras doradas.
 */
export function PhysicalFolder3D({
  folder, caseId, homePosition, homeYaw, textureSize, shadows,
  interactive, active, hovered, onHover, onSelect, children,
}: PhysicalFolder3DProps) {
  const g = folderGeometries();
  const root = useRef<THREE.Group>(null!);
  const hover = useRef<THREE.Group>(null!);
  const turn = useRef<THREE.Group>(null!);
  const hinge = useRef<THREE.Group>(null!);
  const fold = useRef<THREE.Group>(null!);
  const docs = useRef<THREE.Group>(null!);
  const glow = useRef({ value: 0 });

  const mats = useMemo(() => {
    const info = {
      index: folder.index, code: folder.code, title: folder.title, subtitle: folder.subtitle,
      caseId, count: folder.documents.length,
    };
    return {
      body: bodyMaterial(folder.tone, folder.finish, textureSize),
      edge: edgeMaterial(folder.tone, folder.finish, textureSize),
      lining: liningMaterial(),
      gold: goldMaterial(),
      foil: emblemFoilMaterial(),
      label: labelMaterial(folderLabel(info, textureSize)),
      spine: labelMaterial(spineLabel(info, textureSize)),
    };
  }, [folder, caseId, textureSize]);

  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const homeQuat = useMemo(() => tableQuaternion(homeYaw), [homeYaw]);

  const activeRef = useRef(active);
  activeRef.current = active;
  const base = useMemo(
    () => ({ body: mats.body.color.clone(), edge: mats.edge.color.clone(), gold: mats.gold.color.clone() }),
    [mats],
  );

  useEffect(() => {
    // Una carpeta en primer plano no se recoloca al cambiar la distribución de la mesa:
    // la secuencia de cierre la devolverá a su nuevo sitio.
    if (!activeRef.current) {
      root.current.position.set(...homePosition);
      root.current.quaternion.copy(homeQuat);
      root.current.scale.setScalar(1);
    }
    const rig: FolderRig = {
      id: folder.id,
      root: root.current,
      hover: hover.current,
      turn: turn.current,
      hinge: hinge.current,
      fold: fold.current,
      docs: docs.current,
      home: { position: new THREE.Vector3(...homePosition), quaternion: homeQuat.clone() },
      glow: glow.current,
    };
    folderRigs.set(folder.id, rig);
    return () => {
      folderRigs.delete(folder.id);
    };
  }, [folder.id, homePosition, homeQuat]);

  // Hover amortiguado: interrumpible y sin saltos, a diferencia de un tween fijo.
  useFrame((_, dt) => {
    const k = Math.min(dt, 1 / 30);
    const target = hovered && interactive ? 1 : 0;
    const h = hover.current;
    const t = THREE.MathUtils.damp(h.userData.t ?? 0, target, 7, k);
    h.userData.t = t;
    const e = t * t * (3 - 2 * t);
    h.position.z = HOVER.lift * e;
    h.rotation.x = HOVER.tilt * e;
    h.scale.setScalar(1 + (HOVER.scale - 1) * e);

    const gl = Math.max(e, glow.current.value);
    mats.gold.emissiveIntensity = gl * 0.32;
    mats.foil.emissiveIntensity = gl * 0.3;
    mats.label.emissiveIntensity = 0.02 + gl * 0.22;
    mats.spine.emissiveIntensity = 0.02 + gl * 0.12;

    // Atenuación del resto del conjunto cuando una carpeta pasa a primer plano
    const dim = active ? 0 : sceneFx.dim.value;
    const f = 1 - dim * 0.62;
    mats.body.color.copy(base.body).multiplyScalar(f);
    mats.edge.color.copy(base.edge).multiplyScalar(f);
    mats.gold.color.copy(base.gold).multiplyScalar(f);
    mats.label.color.setScalar(f);
    mats.spine.color.setScalar(f);
    mats.foil.opacity = f;
  });

  const handlers = interactive
    ? {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(folder.id);
          document.body.style.cursor = 'pointer';
        },
        onPointerOut: () => {
          onHover(null);
          document.body.style.cursor = '';
        },
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          document.body.style.cursor = '';
          onSelect(folder.id);
        },
      }
    : {};

  const cs = shadows;
  const front = T / 2;
  const claspY = H / 2 + P * 0.8 - FLAP + 0.1;

  return (
    <group ref={root} name={`folder-${folder.id}`}>
      <group ref={hover}>
        <group ref={turn}>
          {/* Zona de interacción única: raycast barato y estable */}
          <mesh geometry={g.hitbox} {...handlers}>
            <meshBasicMaterial visible={false} />
          </mesh>

          {/* Cuerpo */}
          <mesh geometry={g.back} material={mats.body} position={[0, 0, -T / 2]} castShadow={cs} receiveShadow={cs} />
          <mesh geometry={g.pocketLining} material={mats.lining} position={[0, 0.01, -T / 2 + P + 0.001]} />
          <mesh geometry={g.front} material={mats.body} position={[0, 0, front - P]} castShadow={cs} receiveShadow={cs} />
          <mesh geometry={g.spine} material={mats.edge} position={[-W / 2 + P / 2, 0, 0]} castShadow={cs} />
          <mesh geometry={g.gusset} material={mats.edge} position={[W / 2 - 0.05, 0, 0]} />
          <mesh geometry={g.bottom} material={mats.edge} position={[0, -H / 2 + P / 2 + 0.01, 0]} />

          {/* Lomo con etiqueta */}
          <mesh geometry={g.spineLabelPlane} material={mats.spine} position={[-W / 2 - 0.002, 0, 0]} rotation={[0, -Math.PI / 2, Math.PI / 2]} />

          {/* Etiqueta frontal en portaetiquetas metálico */}
          <group position={[0, -0.42, front]}>
            <mesh geometry={g.labelPlane} material={mats.label} position={[0, 0, 0.003]} receiveShadow={cs} />
            {g.labelFrame.map((b, i) => (
              <mesh key={i} geometry={b.g} material={mats.gold} position={b.p as [number, number, number]} castShadow={cs} />
            ))}
            {[-1, 1].map((sx) =>
              [-1, 1].map((sy) => (
                <mesh key={`${sx}${sy}`} geometry={g.buttonRing} material={mats.gold} scale={0.22}
                  position={[sx * (g.LABEL_W / 2 + 0.02), sy * (g.LABEL_H / 2 + 0.02), 0.01]} />
              )),
            )}
          </group>

          {/* Broche: pieza hembra sobre la cara frontal (queda bajo el botón de la solapa) */}
          <mesh geometry={g.claspStud} material={mats.gold} position={[0, claspY, front]} />
          <mesh geometry={g.buttonRing} material={mats.gold} position={[0, claspY, front + 0.004]} scale={0.95} />

          {/* Esquineras doradas inferiores */}
          <mesh geometry={g.corner} material={mats.gold} position={[-W / 2 - 0.003, -H / 2 - 0.003, front + 0.001]} castShadow={cs} />
          <mesh geometry={g.corner} material={mats.gold} position={[W / 2 + 0.003, -H / 2 - 0.003, front + 0.001]} scale={[-1, 1, 1]} castShadow={cs} />

          {/* Documentos dentro del bolsillo */}
          <group ref={docs}>{children}</group>

          {/* Solapa articulada: bisagra en el canto superior trasero */}
          <group ref={hinge} position={[0, H / 2, -T / 2]} rotation={[FLAP_ANGLES.hingeClosed, 0, 0]}>
            <mesh geometry={g.bridge} material={mats.body} castShadow={cs} receiveShadow={cs} />
            <mesh geometry={g.bridgeLining} material={mats.lining} />
            {/* Pliegue delantero: cae sobre la cara frontal */}
            <group ref={fold} position={[0, P * 0.8, T]} rotation={[FLAP_ANGLES.foldClosed, 0, 0]}>
              <mesh geometry={g.flapGeo} material={mats.body} castShadow={cs} receiveShadow={cs} />
              <mesh geometry={g.flapLining} material={mats.lining} />
              <mesh geometry={g.piping} material={mats.gold} position={[0, -0.0, P * 0.6 + 0.012]} />
              <mesh geometry={g.emblemPlane} material={mats.foil} position={[0, -0.44, P * 0.6 + 0.0135]} />
              <group position={[0, -FLAP + 0.1, P * 0.6 + 0.024]}>
                <mesh geometry={g.buttonGeo} material={mats.gold} castShadow={cs} />
                <mesh geometry={g.buttonRing} material={mats.gold} position={[0, 0, 0.014]} />
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
