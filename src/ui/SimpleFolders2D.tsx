import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { CaseFile } from '../data/types';
import { STATUS_COLOR } from '../data/types';
import { useCaseStore } from '../state/caseStore';
import { Emblem } from './Emblem';

/** Duración de cada transición del modo simplificado (ms). */
const DURATION = { opening: 900, closing: 700, extracting: 450, returning: 350 } as const;

/**
 * Alternativa para equipos sin WebGL o con GPU limitada. Mantiene la misma
 * navegación y estados que la escena 3D, con carpetas en perspectiva CSS
 * (solapa con giro real en 3D CSS) y transiciones ligeras.
 */
export function SimpleFolders2D({ caseFile }: { caseFile: CaseFile }) {
  const phase = useCaseStore((s) => s.phase);
  const activeId = useCaseStore((s) => s.activeFolderId);
  const { selectFolder, selectDocument, completePhase } = useCaseStore.getState();
  const active = caseFile.folders.find((f) => f.id === activeId);
  const open = !!active && phase !== 'collection';
  const flapOpen = phase === 'open' || phase === 'extracting' || phase === 'reading' || phase === 'returning';

  // Director 2D: las fases avanzan al terminar cada transición CSS.
  useEffect(() => {
    if (phase in DURATION) {
      const t = setTimeout(() => completePhase(phase), DURATION[phase as keyof typeof DURATION]);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase, completePhase]);

  return (
    <div className="simple-stage">
      {!open && (
        <div className="simple-grid">
          {caseFile.folders.map((f, i) => (
            <motion.button
              key={f.id}
              className="simple-folder"
              style={{ ['--tone' as string]: f.tone }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => selectFolder(f.id)}
            >
              <span className="sf-body" />
              <span className="sf-flap" />
              <span className="sf-label">
                <span className="sf-num">{String(f.index).padStart(2, '0')}</span>
                <span className="sf-title">{f.title}</span>
                <span className="sf-code">{f.code}</span>
              </span>
            </motion.button>
          ))}
        </div>
      )}

      {open && active && (
        <motion.div className="simple-open" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
          <div className="simple-folder is-large" style={{ ['--tone' as string]: active.tone }}>
            <span className={`sf-flap ${flapOpen ? 'is-open' : ''}`} />
            <div className="sf-docs">
              {active.documents.map((d, i) => (
                <motion.button
                  key={d.id}
                  className="sf-doc"
                  initial={{ y: 60, opacity: 0 }}
                  animate={flapOpen ? { y: 0, opacity: 1 } : { y: 60, opacity: 0 }}
                  transition={{ delay: flapOpen ? 0.35 + i * 0.07 : 0, duration: 0.4 }}
                  disabled={phase !== 'open'}
                  onClick={() => selectDocument(d.id)}
                  style={{ ['--status' as string]: STATUS_COLOR[d.status] }}
                >
                  <span className="sf-doc-title">{d.title}</span>
                  <span className="sf-doc-meta">{d.code} · {d.date} · {d.type}</span>
                </motion.button>
              ))}
            </div>
            <span className="sf-body" />
            <span className="sf-label">
              <Emblem size={26} color="#1a2132" />
              <span className="sf-title">{active.title}</span>
              <span className="sf-code">{active.code}</span>
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
