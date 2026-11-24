/** Emblema vectorial de AGAVE CASE SYSTEM (misma figura que se imprime en las etiquetas 3D). */
export function Emblem({ size = 32, color = 'currentColor' }: { size?: number; color?: string }) {
  const leaves = [-3, -2, -1, 0, 1, 2, 3];
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" aria-hidden>
      <circle r="46" fill="none" stroke={color} strokeWidth="3.5" />
      <circle r="39.5" fill="none" stroke={color} strokeWidth="1.2" />
      <g transform="translate(0 19)">
        {leaves.map((i) => {
          const len = 30 - Math.abs(i) * 2.3;
          return (
            <path key={i} transform={`rotate(${i * 18.3})`} fill={color}
              d={`M -2.8 0 Q -2.3 ${-len * 0.6} 0 ${-len} Q 2.3 ${-len * 0.6} 2.8 0 Z`} />
          );
        })}
      </g>
      <rect x="-18" y="20" width="36" height="2" fill={color} />
    </svg>
  );
}
