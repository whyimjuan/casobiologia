import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { loadCaseFile } from './data/loadCaseFile';
import { useCaseStore } from './state/caseStore';
import { detectQuality } from './lib/deviceProfile';
import { FolderNavigation } from './ui/FolderNavigation';
import { FolderCaption } from './ui/FolderCaption';
import { EvidenceMetadataPanel } from './ui/EvidenceMetadataPanel';
import { DocumentViewer } from './ui/DocumentViewer';
import { LoadingScreen } from './ui/LoadingScreen';
import { useKeyboardNavigation } from './ui/useKeyboardNavigation';

const Experience3D = lazy(() => import('./three/Experience3D').then((m) => ({ default: m.Experience3D })));
const SimpleFolders2D = lazy(() => import('./ui/SimpleFolders2D').then((m) => ({ default: m.SimpleFolders2D })));

async function fontsReady() {
  const faces = [
    '600 40px "EB Garamond"', '500 40px "EB Garamond"', 'italic 400 30px "EB Garamond"',
    '400 20px "IBM Plex Sans"', '600 20px "IBM Plex Sans"', '700 20px "IBM Plex Sans"',
    '400 20px "IBM Plex Mono"', '500 20px "IBM Plex Mono"',
  ];
  await Promise.all(faces.map((f) => document.fonts.load(f).catch(() => undefined)));
}

export function App() {
  const caseFile = useCaseStore((s) => s.caseFile);
  const phase = useCaseStore((s) => s.phase);
  const quality = useCaseStore((s) => s.quality);
  const [error, setError] = useState<string | null>(null);

  useKeyboardNavigation();

  useEffect(() => {
    const ctrl = new AbortController();
    useCaseStore.getState().setQuality(detectQuality());
    Promise.all([loadCaseFile(ctrl.signal), fontsReady()])
      .then(([data]) => useCaseStore.getState().setCaseFile(data))
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => ctrl.abort();
  }, []);

  const reading = phase === 'reading';

  return (
    <div className={`app phase-${phase} quality-${quality}`}>
      {caseFile && (
        <Suspense fallback={<LoadingScreen label="Preparando la sala de evidencias…" />}>
          {quality === 'simple' ? (
            <SimpleFolders2D caseFile={caseFile} />
          ) : (
            <Experience3D key={quality} caseFile={caseFile} quality={quality} />
          )}
        </Suspense>
      )}
      <div className="vignette" aria-hidden />
      <div className="grain" aria-hidden />

      {caseFile && (
        <>
          <FolderNavigation caseFile={caseFile} />
          <FolderCaption caseFile={caseFile} />
          <EvidenceMetadataPanel caseFile={caseFile} />
          <AnimatePresence>{reading && <DocumentViewer key="viewer" caseFile={caseFile} />}</AnimatePresence>
        </>
      )}

      <AnimatePresence>
        {!caseFile && (
          <motion.div key="loading" exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
            <LoadingScreen label={error ?? 'Cargando expediente…'} error={!!error} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
