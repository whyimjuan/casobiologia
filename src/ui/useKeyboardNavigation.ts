import { useEffect } from 'react';
import { useCaseStore } from '../state/caseStore';

/** Escape: volver un nivel. Teclas 1–8: abrir carpeta desde el conjunto. */
export function useKeyboardNavigation() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /input|textarea|select/i.test(target.tagName)) return;
      const s = useCaseStore.getState();
      if (e.key === 'Escape') {
        if (s.phase === 'reading') s.backToFolder();
        else if (s.phase === 'open') s.backToCollection();
      }
      if (/^[1-8]$/.test(e.key) && (s.phase === 'collection' || s.phase === 'open') && s.caseFile) {
        const f = s.caseFile.folders[Number(e.key) - 1];
        if (f) s.selectFolder(f.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
