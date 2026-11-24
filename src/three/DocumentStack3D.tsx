import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import type { EvidenceFolder } from '../data/types';
import { STATUS_COLOR, STATUS_LABEL } from '../data/types';
import { SHEET_REST_Y, folderGeometries, sheetLayout } from './folderGeometry';
import { documentSheet, sheetBack } from './textures';
import { docRigs, notifyRigsChanged, type DocRig } from './rigRegistry';

interface Props {
  folder: EvidenceFolder;
  textureSize: number;
  interactive: boolean;
  hoveredDocId: string | null;
  activeDocId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

/**
 * Hojas físicas dentro del bolsillo de la carpeta activa. Se monta sólo
 * para la carpeta abierta, de modo que las texturas de las hojas de las
 * otras siete carpetas no ocupan memoria de vídeo.
 */
export function DocumentStack3D({ folder, textureSize, interactive, hoveredDocId, activeDocId, onHover, onSelect }: Props) {
  const g = folderGeometries();
  const slots = useRef<(THREE.Group | null)[]>([]);
  const hovers = useRef<(THREE.Group | null)[]>([]);

  const materials = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ color: '#e4dccb', roughness: 0.9 });
    const back = new THREE.MeshStandardMaterial({ map: sheetBack(256), roughness: 0.92 });
    return folder.documents.map((d, i) => {
      const tex = documentSheet(
        {
          id: d.id, code: d.code, title: d.title, date: d.date, type: d.type,
          statusLabel: STATUS_LABEL[d.status], statusColor: STATUS_COLOR[d.status],
          letterhead: d.source.kind === 'simulated' ? d.source.letterhead : d.type,
          ordinal: folder.index * 10 + i,
        },
        textureSize,
      );
      const front = new THREE.MeshStandardMaterial({
        map: tex, roughness: 0.88,
        emissive: new THREE.Color('#fff4d6'), emissiveMap: tex, emissiveIntensity: 0.04,
      });
      return { list: [edge, edge, edge, edge, front, back], front, tex };
    });
  }, [folder, textureSize]);

  useEffect(
    () => () => {
      materials.forEach((m) => {
        m.tex.dispose();
        m.front.dispose();
      });
      materials[0]?.list[0].dispose();
      materials[0]?.list[5].dispose();
    },
    [materials],
  );

  useEffect(() => {
    const n = folder.documents.length;
    folder.documents.forEach((d, k) => {
      const slot = slots.current[k];
      const hover = hovers.current[k];
      if (!slot || !hover) return;
      const layout = sheetLayout(n, k);
      const rig: DocRig = {
        id: d.id, folderId: folder.id, order: k, slot, hover,
        restY: SHEET_REST_Y, raisedY: layout.raisedY, baseZ: layout.z,
        baseRotZ: (((k * 7919) % 13) / 13 - 0.5) * 0.016,
      };
      const x = (((k * 31) % 7) / 7) * 0.03 - 0.015;
      slot.position.set(x, SHEET_REST_Y, layout.z);
      slot.userData.homeX = x;
      slot.rotation.set(0, 0, rig.baseRotZ);
      docRigs.set(d.id, rig);
    });
    notifyRigsChanged();
    return () => {
      folder.documents.forEach((d) => docRigs.delete(d.id));
    };
  }, [folder]);

  useFrame((_, dt) => {
    const k = Math.min(dt, 1 / 30);
    folder.documents.forEach((d, i) => {
      const h = hovers.current[i];
      if (!h) return;
      const target = interactive && hoveredDocId === d.id && activeDocId !== d.id ? 1 : 0;
      const t = THREE.MathUtils.damp(h.userData.t ?? 0, target, 9, k);
      h.userData.t = t;
      h.position.y = t * 0.1;
      h.position.z = t * 0.012;
      materials[i].front.emissiveIntensity = 0.04 + t * 0.16;
    });
  });

  return (
    <>
      {folder.documents.map((d, k) => (
        <group key={d.id} ref={(el) => (slots.current[k] = el)} name={`doc-${d.id}`}>
          <group ref={(el) => (hovers.current[k] = el)}>
            <mesh
              geometry={g.sheet}
              material={materials[k].list}
              castShadow
              receiveShadow
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                if (!interactive) return;
                e.stopPropagation();
                onHover(d.id);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                if (!interactive) return;
                onHover(null);
                document.body.style.cursor = '';
              }}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                if (!interactive) return;
                e.stopPropagation();
                document.body.style.cursor = '';
                onSelect(d.id);
              }}
            />
          </group>
        </group>
      ))}
    </>
  );
}
