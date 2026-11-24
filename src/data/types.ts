/**
 * Modelo de datos del expediente. Es completamente independiente de la
 * geometría 3D: las carpetas y documentos se construyen a partir de estos
 * datos, que se cargan en tiempo de ejecución desde /case/expediente.json.
 */

export type ReviewStatus = 'pendiente' | 'en-revision' | 'revisado' | 'observado' | 'impugnado';

export type FolderFinish = 'cuero' | 'carton';

export interface SimulatedBlock {
  /** p = párrafo, h = subtítulo, kv = pares clave/valor, table = tabla, sign = firma, stamp = sello */
  kind: 'p' | 'h' | 'kv' | 'table' | 'sign' | 'stamp';
  text?: string;
  rows?: string[][];
  pairs?: [string, string][];
}

export interface SimulatedPage {
  heading?: string;
  blocks: SimulatedBlock[];
}

export type DocumentSource =
  | { kind: 'simulated'; letterhead: string; pages: SimulatedPage[] }
  | { kind: 'pdf'; url: string }
  | { kind: 'image'; urls: string[] };

export interface Observation {
  author: string;
  date: string;
  text: string;
}

export interface EvidenceDocument {
  id: string;
  code: string;
  title: string;
  date: string;
  type: string;
  status: ReviewStatus;
  source: DocumentSource;
  metadata: Record<string, string>;
  observations: Observation[];
}

export interface EvidenceFolder {
  id: string;
  index: number;
  code: string;
  title: string;
  subtitle: string;
  finish: FolderFinish;
  /** Tono azul marino individual de cada carpeta (hex). */
  tone: string;
  documents: EvidenceDocument[];
}

export interface CaseFile {
  caseId: string;
  caseTitle: string;
  court: string;
  disclaimer: string;
  folders: EvidenceFolder[];
}

export const STATUS_LABEL: Record<ReviewStatus, string> = {
  pendiente: 'Pendiente',
  'en-revision': 'En revisión',
  revisado: 'Revisado',
  observado: 'Con observaciones',
  impugnado: 'Impugnado',
};

export const STATUS_COLOR: Record<ReviewStatus, string> = {
  pendiente: '#8a8f99',
  'en-revision': '#b8902f',
  revisado: '#4f7d5c',
  observado: '#a8662d',
  impugnado: '#8e3b3b',
};
