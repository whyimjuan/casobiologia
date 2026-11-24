import { AnimatePresence, motion } from 'framer-motion';
import type { CaseFile } from '../data/types';
import { useCaseStore } from '../state/caseStore';

/** Ficha 2D que acompaña a la carpeta bajo el cursor en el conjunto. */
export function FolderCaption({ caseFile }: { caseFile: CaseFile }) {
  const phase = useCaseStore((s) => s.phase);
  const hoveredId = useCaseStore((s) => s.hoveredFolderId);
  const folder = caseFile.folders.find((f) => f.id === hoveredId);
  const show = phase === 'collection';

  return (
    <div className="caption-dock" aria-live="polite">
      <AnimatePresence mode="wait">
        {show && folder ? (
          <motion.div
            key={folder.id}
            className="caption"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <span className="caption-num">{String(folder.index).padStart(2, '0')}</span>
            <div>
              <div className="caption-title">{folder.title}</div>
              <div className="caption-sub">
                {folder.code} · {folder.documents.length} documentos · {folder.finish === 'cuero' ? 'Cuero institucional' : 'Cartón rígido'}
              </div>
            </div>
            <span className="caption-hint">Clic para abrir</span>
          </motion.div>
        ) : show ? (
          <motion.div key="hint" className="caption is-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            Seleccione una carpeta del expediente para examinar su contenido
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
