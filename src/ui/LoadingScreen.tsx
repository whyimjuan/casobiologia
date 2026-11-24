import { Emblem } from './Emblem';

export function LoadingScreen({ label, error }: { label: string; error?: boolean }) {
  return (
    <div className="loading" role="status">
      <Emblem size={64} />
      <div className="loading-brand">AGAVE CASE SYSTEM</div>
      <div className={`loading-label ${error ? 'is-error' : ''}`}>{label}</div>
      {!error && <div className="loading-bar"><span /></div>}
    </div>
  );
}
