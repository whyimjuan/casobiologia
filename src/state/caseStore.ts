import { create } from 'zustand';
import type { CaseFile } from '../data/types';

/**
 * Máquina de estados de la experiencia.
 *
 *  collection ──click──▶ opening ──▶ open ──click doc──▶ extracting ──▶ reading
 *      ▲                              │  ▲                                 │
 *      └──────── closing ◀────────────┘  └──────── returning ◀─────────────┘
 */
export type Phase = 'loading' | 'collection' | 'opening' | 'open' | 'extracting' | 'reading' | 'returning' | 'closing';

export type Quality = 'high' | 'balanced' | 'low' | 'simple';

interface CaseState {
  caseFile: CaseFile | null;
  phase: Phase;
  quality: Quality;
  hoveredFolderId: string | null;
  hoveredDocId: string | null;
  activeFolderId: string | null;
  activeDocId: string | null;
  /** Si al terminar de devolver el documento debe cerrarse también la carpeta. */
  exitToCollection: boolean;
  /** Carpeta a abrir automáticamente al terminar de cerrar la actual. */
  queuedFolderId: string | null;
  /** Documento a extraer automáticamente al terminar de devolver el actual. */
  queuedDocId: string | null;

  setCaseFile: (c: CaseFile) => void;
  setQuality: (q: Quality) => void;
  hoverFolder: (id: string | null) => void;
  hoverDoc: (id: string | null) => void;
  selectFolder: (id: string) => void;
  selectDocument: (id: string) => void;
  backToFolder: () => void;
  backToCollection: () => void;
  /** Llamado por el director de animaciones al terminar cada secuencia. */
  completePhase: (finished: Phase) => void;
}

export const useCaseStore = create<CaseState>((set, get) => ({
  caseFile: null,
  phase: 'loading',
  quality: 'high',
  hoveredFolderId: null,
  hoveredDocId: null,
  activeFolderId: null,
  activeDocId: null,
  exitToCollection: false,
  queuedFolderId: null,
  queuedDocId: null,

  setCaseFile: (caseFile) => set({ caseFile, phase: 'collection' }),
  setQuality: (quality) => set({ quality }),
  hoverFolder: (id) => {
    if (get().hoveredFolderId !== id) set({ hoveredFolderId: id });
  },
  hoverDoc: (id) => {
    if (get().hoveredDocId !== id) set({ hoveredDocId: id });
  },

  selectFolder: (id) => {
    const { phase, activeFolderId } = get();
    if (phase === 'collection') {
      set({ activeFolderId: id, phase: 'opening', hoveredFolderId: null, queuedFolderId: null });
    } else if (id !== activeFolderId) {
      // Cambiar de carpeta: cerrar la actual con la secuencia completa y abrir la nueva.
      set({ queuedFolderId: id });
      if (phase === 'open') set({ phase: 'closing' });
      else if (phase === 'reading') set({ phase: 'returning', exitToCollection: true });
    }
  },

  selectDocument: (id) => {
    const { phase, activeDocId } = get();
    if (phase === 'open') set({ activeDocId: id, phase: 'extracting', hoveredDocId: null });
    else if (phase === 'reading' && id !== activeDocId) set({ phase: 'returning', queuedDocId: id });
  },

  backToFolder: () => {
    if (get().phase === 'reading') set({ phase: 'returning', exitToCollection: false });
  },

  backToCollection: () => {
    const { phase } = get();
    if (phase === 'reading') set({ phase: 'returning', exitToCollection: true });
    else if (phase === 'open') set({ phase: 'closing' });
  },

  completePhase: (finished) => {
    const s = get();
    if (s.phase !== finished) return;
    switch (finished) {
      case 'opening':
        set({ phase: 'open' });
        break;
      case 'extracting':
        set({ phase: 'reading' });
        break;
      case 'returning':
        if (s.exitToCollection) set({ phase: 'closing', activeDocId: null, exitToCollection: false });
        else if (s.queuedDocId) set({ phase: 'extracting', activeDocId: s.queuedDocId, queuedDocId: null });
        else set({ phase: 'open', activeDocId: null });
        break;
      case 'closing':
        if (s.queuedFolderId) set({ phase: 'opening', activeFolderId: s.queuedFolderId, queuedFolderId: null });
        else set({ phase: 'collection', activeFolderId: null });
        break;
    }
  },
}));

export const isBusy = (p: Phase) => p === 'opening' || p === 'extracting' || p === 'returning' || p === 'closing';
