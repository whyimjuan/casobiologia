import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import type { CaseFile } from '../data/types';
import { useCaseStore } from '../state/caseStore';
import { PhysicalFolder3D } from './PhysicalFolder3D';
import { DocumentStack3D } from './DocumentStack3D';
import { FOLDER, folderGeometries } from './folderGeometry';
import { collectionLayout } from './cameraRig';
import { blobShadowMaterial } from './materials';
import type { QualitySettings } from '../lib/deviceProfile';

interface Props {
  caseFile: CaseFile;
  settings: QualitySettings;
}

/**
 * Las ocho carpetas sobre la mesa. La distribución (4×2 o 2×4 en vertical)
 * y el contenido salen de los datos del expediente; cada carpeta es el mismo
 * componente PhysicalFolder3D con su propio tono, acabado y etiqueta.
 */
export function FolderCollection3D({ caseFile, settings }: Props) {
  const aspect = useThree((s) => s.size.width / s.size.height);
  const layout = collectionLayout(aspect);
  const phase = useCaseStore((s) => s.phase);
  const hoveredFolderId = useCaseStore((s) => s.hoveredFolderId);
  const activeFolderId = useCaseStore((s) => s.activeFolderId);
  const activeDocId = useCaseStore((s) => s.activeDocId);
  const hoveredDocId = useCaseStore((s) => s.hoveredDocId);
  const { hoverFolder, selectFolder, hoverDoc, selectDocument } = useCaseStore.getState();
  const g = folderGeometries();
  const blob = useMemo(() => blobShadowMaterial(), []);

  const homes = useMemo(
    () =>
      caseFile.folders.map((_, i) => {
        const c = i % layout.columns;
        const r = Math.floor(i / layout.columns);
        const x = (c - (layout.columns - 1) / 2) * layout.gapX;
        const z = (r - (layout.rows - 1) / 2) * layout.gapZ;
        // Pequeña irregularidad: objetos colocados a mano, no una cuadrícula perfecta.
        const yaw = (((i * 37) % 11) / 11 - 0.5) * 0.07;
        return { position: [x, FOLDER.T / 2 + 0.004, z] as [number, number, number], yaw };
      }),
    [caseFile, layout.columns, layout.rows, layout.gapX, layout.gapZ],
  );

  return (
    <group>
      {caseFile.folders.map((f, i) => {
        const active = f.id === activeFolderId;
        return (
          <group key={f.id}>
            {!settings.shadows && (
              <mesh geometry={g.shadowPlane} material={blob} position={[homes[i].position[0], 0.003, homes[i].position[2] + 0.12]}
                rotation={[-Math.PI / 2, 0, homes[i].yaw]} visible={!active} />
            )}
            <PhysicalFolder3D
              folder={f}
              caseId={caseFile.caseId}
              homePosition={homes[i].position}
              homeYaw={homes[i].yaw}
              textureSize={settings.textureSize}
              shadows={settings.shadows}
              interactive={phase === 'collection'}
              active={active}
              hovered={hoveredFolderId === f.id}
              onHover={hoverFolder}
              onSelect={selectFolder}
            >
              {active && (
                <DocumentStack3D
                  folder={f}
                  textureSize={settings.textureSize}
                  interactive={phase === 'open'}
                  hoveredDocId={hoveredDocId}
                  activeDocId={activeDocId}
                  onHover={hoverDoc}
                  onSelect={selectDocument}
                />
              )}
            </PhysicalFolder3D>
          </group>
        );
      })}
    </group>
  );
}
