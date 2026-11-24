import type { EvidenceDocument, SimulatedPage } from '../../data/types';
import { Emblem } from '../Emblem';

interface Props {
  doc: EvidenceDocument;
  letterhead: string;
  page: SimulatedPage;
  index: number;
  total: number;
}

/** Página A4 maquetada en HTML: texto real, seleccionable y nítido a cualquier zoom. */
export function SimulatedPageView({ doc, letterhead, page, index, total }: Props) {
  return (
    <article className="sim-page">
      <header className="sim-letterhead">
        <Emblem size={46} color="#1f2a44" />
        <div>
          <div className="sim-org">{letterhead}</div>
          <div className="sim-ref">Ref. {doc.code} · {doc.date}</div>
        </div>
        <div className="sim-type">{doc.type}</div>
      </header>
      {index === 0 && <h1 className="sim-title">{doc.title}</h1>}
      {page.heading && <h2 className="sim-heading">{page.heading}</h2>}
      <div className="sim-body">
        {page.blocks.map((b, i) => {
          switch (b.kind) {
            case 'h':
              return <h3 key={i}>{b.text}</h3>;
            case 'p':
              return <p key={i}>{b.text}</p>;
            case 'kv':
              return (
                <dl key={i} className="sim-kv">
                  {b.pairs?.map(([k, v]) => (
                    <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                  ))}
                </dl>
              );
            case 'table':
              return (
                <table key={i} className="sim-table">
                  <thead><tr>{b.rows?.[0].map((c, j) => <th key={j}>{c}</th>)}</tr></thead>
                  <tbody>
                    {b.rows?.slice(1).map((r, j) => (
                      <tr key={j}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              );
            case 'sign':
              return (
                <div key={i} className="sim-sign">
                  <svg viewBox="0 0 220 50" aria-hidden><path d="M5 35 C 30 5, 45 45, 70 22 S 110 40, 130 18 S 170 38, 215 12" /></svg>
                  <div className="sim-sign-line" />
                  <div className="sim-sign-name">{b.text}</div>
                </div>
              );
            case 'stamp':
              return <div key={i} className="sim-stamp">{b.text}</div>;
            default:
              return null;
          }
        })}
      </div>
      <footer className="sim-footer">
        <span>{doc.code}</span>
        <span>Página {index + 1} de {total}</span>
      </footer>
    </article>
  );
}
