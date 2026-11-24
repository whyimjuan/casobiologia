import type { CaseFile } from '../data/types';
import { useCaseStore } from '../state/caseStore';

export function useActiveFolder(caseFile: CaseFile) {
  const id = useCaseStore((s) => s.activeFolderId);
  return caseFile.folders.find((f) => f.id === id) ?? null;
}

export function useActiveDocument(caseFile: CaseFile) {
  const folder = useActiveFolder(caseFile);
  const id = useCaseStore((s) => s.activeDocId);
  return folder?.documents.find((d) => d.id === id) ?? null;
}

export function sourceLabel(kind: 'simulated' | 'pdf' | 'image') {
  return kind === 'pdf' ? 'PDF' : kind === 'image' ? 'Imagen' : 'Documento digitalizado';
}
