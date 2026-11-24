import { AnimatePresence, motion } from 'framer-motion';
import type { CaseFile } from '../data/types';
import { isBusy, useCaseStore, type Quality } from '../state/caseStore';
import { useActiveDocument, useActiveFolder } from './selectors';
import { Emblem } from './Emblem';

const QUALITY_LABEL: Record<Quality, string> = {
  high: 'Alta',
  balanced: 'Equilibrada',
  low: 'Ligera',
  simple: 'Simplificada (2D)',
};

/**
 * Barra superior: identidad, ruta de navegación (expediente › carpeta ›
 * documento), regresos y selector de calidad gráfica. En la carpeta abierta
 * muestra además las pestañas para saltar a otra carpeta.
 */
export function FolderNavigation({ caseFile }: { caseFile: CaseFile }) {
  const phase = useCaseStore((s) => s.phase);
  const quality = useCaseStore((s) => s.quality);
  const folder = useActiveFolder(caseFile);
  const doc = useActiveDocument(caseFile);
  const { backToCollection, backToFolder, selectFolder, setQuality } = useCaseStore.getState();
  const busy = isBusy(phase);
  const inFolder = phase !== 'collection' && phase !== 'loading';

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <Emblem size={30} />
          <div>
            <div className="brand-name">AGAVE CASE SYSTEM</div>
            <div className="brand-case">{caseFile.caseId} · {caseFile.caseTitle}</div>
          </div>
        </div>

        <nav className="crumbs" aria-label="Ruta del expediente">
          <button className="crumb" disabled={!inFolder || busy} onClick={backToCollection}>Conjunto de carpetas</button>
          <AnimatePresence initial={false}>
            {folder && (
              <motion.span key={folder.id} className="crumb-wrap" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                <span className="crumb-sep">›</span>
                <button className="crumb" disabled={phase !== 'reading'} onClick={backToFolder}>
                  {String(folder.index).padStart(2, '0')} · {folder.title}
                </button>
              </motion.span>
            )}
            {doc && (phase === 'reading' || phase === 'extracting') && (
              <motion.span key={doc.id} className="crumb-wrap" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                <span className="crumb-sep">›</span>
                <span className="crumb is-current">{doc.code}</span>
              </motion.span>
            )}
          </AnimatePresence>
        </nav>

        <div className="topbar-actions">
          {phase === 'open' && (
            <button className="btn-quiet" onClick={backToCollection} title="Cerrar la carpeta (Esc)">
              <span aria-hidden>↩</span> Volver al conjunto
            </button>
          )}
          <label className="quality">
            <span>Gráficos</span>
            <select
              value={quality}
              disabled={phase !== 'collection'}
              onChange={(e) => setQuality(e.target.value as Quality)}
              title={phase !== 'collection' ? 'Disponible en el conjunto de carpetas' : 'Calidad gráfica'}
            >
              {(Object.keys(QUALITY_LABEL) as Quality[]).map((q) => (
                <option key={q} value={q}>{QUALITY_LABEL[q]}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <AnimatePresence>
        {inFolder && phase !== 'reading' && (
          <motion.nav
            className="folder-tabs"
            aria-label="Cambiar de carpeta"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {caseFile.folders.map((f) => (
              <button
                key={f.id}
                className={`folder-tab ${f.id === folder?.id ? 'is-active' : ''}`}
                disabled={busy || f.id === folder?.id}
                onClick={() => selectFolder(f.id)}
                title={f.title}
              >
                <span className="folder-tab-num">{String(f.index).padStart(2, '0')}</span>
                <span className="folder-tab-title">{f.title}</span>
              </button>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>

      <div className="disclaimer" role="note">{caseFile.disclaimer}</div>
    </>
  );
}
