import * as THREE from 'three';
import type { FolderFinish } from '../data/types';
import { cardboardFiber, leatherGrain, liningPattern, toneVariation, drawEmblem } from './textures';

export const GOLD_COLOR = new THREE.Color('#e0bd6a');

/** Material del cuerpo de la carpeta: cuero institucional o cartón rígido. */
export function bodyMaterial(tone: string, finish: FolderFinish, texSize: number) {
  const grain = finish === 'cuero' ? leatherGrain(texSize) : cardboardFiber(texSize);
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(tone),
    map: toneVariation(256),
    roughnessMap: grain,
    bumpMap: grain,
    bumpScale: finish === 'cuero' ? 0.55 : 0.35,
    roughness: finish === 'cuero' ? 0.62 : 0.86,
    metalness: 0,
    sheen: finish === 'cuero' ? 0.35 : 0.1,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color('#3a4a72'),
    clearcoat: finish === 'cuero' ? 0.12 : 0,
    clearcoatRoughness: 0.6,
  });
  return m;
}

/** Fuelles y lomo: mismo tono, algo más oscuro y mate. */
export function edgeMaterial(tone: string, finish: FolderFinish, texSize: number) {
  const m = bodyMaterial(tone, finish, texSize);
  m.color.multiplyScalar(0.72);
  m.roughness = 0.8;
  m.clearcoat = 0;
  return m;
}

export function liningMaterial() {
  return new THREE.MeshStandardMaterial({ map: liningPattern(512), roughness: 0.75, metalness: 0 });
}

export function goldMaterial() {
  return new THREE.MeshStandardMaterial({
    color: GOLD_COLOR,
    metalness: 1,
    roughness: 0.26,
    emissive: new THREE.Color('#c98f2a'),
    emissiveIntensity: 0,
    envMapIntensity: 2.1,
  });
}

let emblemAlpha: THREE.Texture | null = null;
/** Emblema estampado en oro sobre la solapa (máscara alfa). */
export function emblemFoilMaterial() {
  if (!emblemAlpha) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 256, 256);
    drawEmblem(ctx, 128, 128, 112, '#fff');
    emblemAlpha = new THREE.CanvasTexture(c);
  }
  return new THREE.MeshStandardMaterial({
    color: GOLD_COLOR,
    metalness: 1,
    roughness: 0.3,
    alphaMap: emblemAlpha,
    emissive: new THREE.Color('#c98f2a'),
    emissiveIntensity: 0,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    envMapIntensity: 2,
  });
}

export function labelMaterial(map: THREE.Texture) {
  return new THREE.MeshStandardMaterial({
    map,
    roughness: 0.82,
    metalness: 0,
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: map,
    emissiveIntensity: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
}

let shadowTex: THREE.Texture | null = null;
/** Sombra de contacto horneada (perfil gráfico bajo, sin mapas de sombra). */
export function blobShadowMaterial() {
  if (!shadowTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.85)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    shadowTex = new THREE.CanvasTexture(c);
  }
  return new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.8 });
}
