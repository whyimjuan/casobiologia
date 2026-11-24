import type { CaseFile, EvidenceFolder } from './types';

const CASE_URL = `${import.meta.env.BASE_URL}case/expediente.json`;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Expediente inválido: ${msg}`);
}

function validateFolder(f: EvidenceFolder, i: number) {
  assert(typeof f.id === 'string' && f.id, `carpeta ${i} sin id`);
  assert(typeof f.title === 'string', `carpeta ${f.id} sin título`);
  assert(Array.isArray(f.documents), `carpeta ${f.id} sin documentos`);
  for (const d of f.documents) {
    assert(d.id && d.code && d.title, `documento sin identificadores en ${f.id}`);
    assert(d.source && d.source.kind, `documento ${d.id} sin fuente`);
  }
}

/** Carga el expediente desde los datos publicados (no desde el código 3D). */
export async function loadCaseFile(signal?: AbortSignal): Promise<CaseFile> {
  const res = await fetch(CASE_URL, { signal });
  if (!res.ok) throw new Error(`No se pudo cargar el expediente (${res.status})`);
  const data = (await res.json()) as CaseFile;
  assert(Array.isArray(data.folders), 'sin carpetas');
  data.folders.forEach(validateFolder);
  data.folders.sort((a, b) => a.index - b.index);
  return data;
}

export function resolveAsset(url: string) {
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return `${import.meta.env.BASE_URL}${url.replace(/^\//, '')}`;
}
