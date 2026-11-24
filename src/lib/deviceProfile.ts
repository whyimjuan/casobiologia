import type { Quality } from '../state/caseStore';

export interface QualitySettings {
  dpr: [number, number];
  shadows: boolean;
  shadowMapSize: number;
  softShadows: boolean;
  envResolution: number;
  textureSize: number;
  antialias: boolean;
  anisotropy: number;
}

export const QUALITY_SETTINGS: Record<Exclude<Quality, 'simple'>, QualitySettings> = {
  high: { dpr: [1, 2], shadows: true, shadowMapSize: 2048, softShadows: true, envResolution: 256, textureSize: 1024, antialias: true, anisotropy: 8 },
  balanced: { dpr: [1, 1.5], shadows: true, shadowMapSize: 1024, softShadows: false, envResolution: 128, textureSize: 1024, antialias: true, anisotropy: 4 },
  low: { dpr: [1, 1], shadows: false, shadowMapSize: 512, softShadows: false, envResolution: 64, textureSize: 512, antialias: false, anisotropy: 1 },
};

function webglInfo(): { ok: boolean; renderer: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return { ok: false, renderer: '' };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { ok: true, renderer };
  } catch {
    return { ok: false, renderer: '' };
  }
}

/**
 * Elige el perfil gráfico inicial. Se puede forzar con ?calidad=high|balanced|low|simple.
 * Durante la ejecución, PerformanceMonitor puede bajar el perfil si los FPS caen.
 */
export function detectQuality(): Quality {
  const forced = new URLSearchParams(location.search).get('calidad');
  if (forced === 'high' || forced === 'balanced' || forced === 'low' || forced === 'simple') return forced;

  const gl = webglInfo();
  if (!gl.ok) return 'simple';
  if (/swiftshader|llvmpipe|software|basic render/i.test(gl.renderer)) return 'simple';
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'low';

  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;

  if (cores <= 2 || memory <= 2) return 'low';
  if (coarse || cores <= 4 || memory <= 4) return 'balanced';
  return 'high';
}
