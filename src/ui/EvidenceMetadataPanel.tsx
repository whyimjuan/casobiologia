import { AnimatePresence, motion } from 'framer-motion';
import type { CaseFile, EvidenceDocument, EvidenceFolder } from '../data/types';
import { STATUS_COLOR, STATUS_LABEL } from '../data/types';
import { useCaseStore } from '../state/caseStore';
import { sourceLabel, useActiveFolder } from './selectors';

export function StatusChip({ status }: { status: EvidenceDocument['status'] }) {
  return (
    <span className="status-chip" style={{ ['--status' as string]: STATUS_COLOR[status] }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Ficha de metadatos de un documento (se usa en la carpeta y en el visor). */
export function EvidenceDetails({ doc, folder, pages }: { doc: EvidenceDocument; folder: EvidenceFolder; pages?: number }) {
  const rows: [string, string][] = [
    ['Identificador', doc.code],
    ['Fecha', doc.date],
    ['Tipo de documento', doc.type],
    ['Carpeta', `${String(folder.index).padStart(2, '0')} · ${folder.title}`],
    ['Formato', sourceLabel(doc.source.kind)],
    ...(pages ? ([['Páginas', String(pages)]] as [string, string][]) : []),
    ...Object.entries(doc.metadata),
  ];
  return (
    <dl className="meta-list">
      <div className="meta-row">
        <dt>Estado de revisión</dt>
        <dd><StatusChip status={doc.status} /></dd>
      </div>
      {rows.map(([k, v]) => (
        <div className="meta-row" key={k}>
          <dt>{k}</dt>
          <dd className={/hash|huella|identificador/i.test(k) ? 'mono' : ''}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EvidenceObservations({ doc }: { doc: EvidenceDocument }) {
  if (!doc.observations.length) return <p className="empty">Sin observaciones registradas.</p>;
  return (
    <ol className="observations">
      {doc.observations.map((o, i) => (
        <li key={i}>
          <div className="obs-head">
            <span>{o.author}</span>
            <time>{o.date}</time>
          </div>
          <p>{o.text}</p>
        </li>
      ))}
    </ol>
  );
}

/**
 * Panel lateral de la carpeta abierta: índice de documentos (sincronizado
 * con las hojas 3D: pasar el cursor por una fila eleva su hoja) y ficha del
 * documento señalado.
 */
export function EvidenceMetadataPanel({ caseFile }: { caseFile: CaseFile }) {
  const phase = useCaseStore((s) => s.phase);
  const hoveredDocId = useCaseStore((s) => s.hoveredDocId);
  const folder = useActiveFolder(caseFile);
  const { hoverDoc, selectDocument } = useCaseStore.getState();
  const show = phase === 'open' && !!folder;
  const focus = folder?.documents.find((d) => d.id === hoveredDocId) ?? null;

  return (
    <AnimatePresence>
      {show && folder && (
        <motion.aside
          key={folder.id}
          className="side-panel"
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 28 }}
          transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
          aria-label={`Contenido de ${folder.title}`}
        >
          <div className="panel-kicker">Carpeta {String(folder.index).padStart(2, '0')} · {folder.code}</div>
          <h2 className="panel-title">{folder.title}</h2>
          <p className="panel-sub">{folder.subtitle}</p>

          <ul className="doc-index">
            {folder.documents.map((d, i) => (
              <motion.li
                key={d.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
              >
                <button
                  className={`doc-row ${hoveredDocId === d.id ? 'is-hover' : ''}`}
                  onMouseEnter={() => hoverDoc(d.id)}
                  onMouseLeave={() => hoverDoc(null)}
                  onFocus={() => hoverDoc(d.id)}
                  onBlur={() => hoverDoc(null)}
                  onClick={() => selectDocument(d.id)}
                >
                  <span className="doc-row-title">{d.title}</span>
                  <span className="doc-row-meta">
                    <span className="mono">{d.code}</span> · {d.date} · {d.type}
                  </span>
                  <StatusChip status={d.status} />
                </button>
              </motion.li>
            ))}
          </ul>

          <div className="panel-focus">
            <AnimatePresence mode="wait">
              {focus ? (
                <motion.div key={focus.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  <div className="panel-kicker">Ficha documental</div>
                  <EvidenceDetails doc={focus} folder={folder} />
                </motion.div>
              ) : (
                <motion.p key="hint" className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Señale una hoja para ver su ficha. Selecciónela para extraerla y leerla.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
