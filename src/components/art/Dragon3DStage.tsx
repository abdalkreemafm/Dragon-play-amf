import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DuckAuraId, DuckGearId, DuckSkinId, Rarity } from '../../types/game';
import { clampCustomLevel, getStarTierMeta } from '../../utils/economyEngine';
import { soundFX } from '../../utils/sound';
import { DragonIllustration } from './DuckArt';

export interface Dragon3DStageProps {
  skin: DuckSkinId;
  rarity: Rarity;
  level: number;
  customLevel: number;
  sizeTier?: 'NORMAL' | 'XL' | 'XXL';
  gear?: DuckGearId;
  aura?: DuckAuraId;
  isFever?: boolean;
  feedPulseNonce: number;
  levelBurstNonce: number;
  onTapStage: (clientX: number, clientY: number) => void;
}

type ElementKind = 'frost' | 'storm' | 'ember';

interface Palette3D {
  scalePrimary: string;
  scaleSecondary: string;
  bellyPlate: string;
  wingMembrane: string;
  wingVein: string;
  horn: string;
  eye: string;
  ember: string;
  element: ElementKind;
}

const SKIN_3D_PALETTES: Record<DuckSkinId, Palette3D> = {
  aqua: {
    scalePrimary: '#247ba0',
    scaleSecondary: '#5fd3f3',
    bellyPlate: '#bae6fd',
    wingMembrane: '#164e63',
    wingVein: '#67e8f9',
    horn: '#e2e8f0',
    eye: '#38bdf8',
    ember: '#67e8f9',
    element: 'frost',
  },
  bride: {
    scalePrimary: '#94a3b8',
    scaleSecondary: '#e2e8f0',
    bellyPlate: '#f8fafc',
    wingMembrane: '#475569',
    wingVein: '#bae6fd',
    horn: '#f1f5f9',
    eye: '#38bdf8',
    ember: '#bae6fd',
    element: 'frost',
  },
  cool: {
    scalePrimary: '#1d4ed8',
    scaleSecondary: '#60a5fa',
    bellyPlate: '#bfdbfe',
    wingMembrane: '#1e3a8a',
    wingVein: '#93c5fd',
    horn: '#e2e8f0',
    eye: '#38bdf8',
    ember: '#60a5fa',
    element: 'frost',
  },
  dj: {
    scalePrimary: '#312e81',
    scaleSecondary: '#6366f1',
    bellyPlate: '#a5b4fc',
    wingMembrane: '#1e1b4b',
    wingVein: '#38bdf8',
    horn: '#cbd5e1',
    eye: '#22d3ee',
    ember: '#38bdf8',
    element: 'storm',
  },
  skeleton: {
    scalePrimary: '#64748b',
    scaleSecondary: '#cbd5e1',
    bellyPlate: '#f1f5f9',
    wingMembrane: '#1e293b',
    wingVein: '#22d3ee',
    horn: '#f8fafc',
    eye: '#22d3ee',
    ember: '#22d3ee',
    element: 'storm',
  },
  ninja: {
    scalePrimary: '#27273a',
    scaleSecondary: '#525270',
    bellyPlate: '#71718a',
    wingMembrane: '#1f1926',
    wingVein: '#fb7185',
    horn: '#a1a1aa',
    eye: '#f43f5e',
    ember: '#f43f5e',
    element: 'storm',
  },
  gamer: {
    scalePrimary: '#059669',
    scaleSecondary: '#34d399',
    bellyPlate: '#a7f3d0',
    wingMembrane: '#064e3b',
    wingVein: '#6ee7b7',
    horn: '#bef264',
    eye: '#4ade80',
    ember: '#34d399',
    element: 'storm',
  },
  classic: {
    scalePrimary: '#b45309',
    scaleSecondary: '#f59e0b',
    bellyPlate: '#fde68a',
    wingMembrane: '#7c2d12',
    wingVein: '#fb923c',
    horn: '#e7d3b0',
    eye: '#fbbf24',
    ember: '#f97316',
    element: 'ember',
  },
  lilac: {
    scalePrimary: '#6d28d9',
    scaleSecondary: '#a855f7',
    bellyPlate: '#e9d5ff',
    wingMembrane: '#4c1d95',
    wingVein: '#fbbf24',
    horn: '#fde047',
    eye: '#f472b6',
    ember: '#c084fc',
    element: 'ember',
  },
  cupid: {
    scalePrimary: '#be185d',
    scaleSecondary: '#f472b6',
    bellyPlate: '#fbcfe8',
    wingMembrane: '#831843',
    wingVein: '#fda4af',
    horn: '#fde047',
    eye: '#fda4af',
    ember: '#fb7185',
    element: 'ember',
  },
  pumpkin: {
    scalePrimary: '#c2410c',
    scaleSecondary: '#fb923c',
    bellyPlate: '#fed7aa',
    wingMembrane: '#7c2d12',
    wingVein: '#fdba74',
    horn: '#a3e635',
    eye: '#fde047',
    ember: '#f97316',
    element: 'ember',
  },
  pharaoh: {
    scalePrimary: '#a16207',
    scaleSecondary: '#eab308',
    bellyPlate: '#fef08a',
    wingMembrane: '#451a03',
    wingVein: '#38bdf8',
    horn: '#facc15',
    eye: '#38bdf8',
    ember: '#facc15',
    element: 'ember',
  },
  royal: {
    scalePrimary: '#991b1b',
    scaleSecondary: '#eab308',
    bellyPlate: '#fef08a',
    wingMembrane: '#7f1d1d',
    wingVein: '#facc15',
    horn: '#fde047',
    eye: '#fb7185',
    ember: '#facc15',
    element: 'ember',
  },
  coffee: {
    scalePrimary: '#7f1d1d',
    scaleSecondary: '#dc2626',
    bellyPlate: '#fdba74',
    wingMembrane: '#450a0a',
    wingVein: '#fb923c',
    horn: '#d97706',
    eye: '#fb923c',
    ember: '#ef4444',
    element: 'ember',
  },
};

function detectSoftwareWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

/** Converts a grayscale height canvas into a tileable tangent-space Normal Map */
function buildNormalMapFromHeightCanvas(heightCanvas: HTMLCanvasElement, strength = 2.6): THREE.DataTexture {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const ctx = heightCanvas.getContext('2d');
  const data = new Uint8Array(w * h * 4);

  if (ctx) {
    const src = ctx.getImageData(0, 0, w, h).data;
    const sampleH = (x: number, y: number) => {
      const wx = ((x % w) + w) % w;
      const wy = ((y % h) + h) % h;
      return src[(wy * w + wx) * 4] / 255;
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const hL = sampleH(x - 1, y);
        const hR = sampleH(x + 1, y);
        const hU = sampleH(x, y - 1);
        const hD = sampleH(x, y + 1);
        const dx = (hL - hR) * strength;
        const dy = (hU - hD) * strength;
        const dz = 1.0;
        const invLen = 1 / Math.hypot(dx, dy, dz);
        const idx = (y * w + x) * 4;
        data[idx] = Math.round((dx * invLen * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.round((dy * invLen * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.round((dz * invLen * 0.5 + 0.5) * 255);
        data[idx + 3] = 255;
      }
    }
  }

  const normalTex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  normalTex.wrapS = THREE.RepeatWrapping;
  normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.needsUpdate = true;
  return normalTex;
}

function createDragonScaleTextures(texSize = 512): {
  albedoTint: THREE.CanvasTexture;
  normalMap: THREE.DataTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = texSize;
  albedoCanvas.height = texSize;
  const aCtx = albedoCanvas.getContext('2d');

  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = texSize;
  heightCanvas.height = texSize;
  const hCtx = heightCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = texSize;
  roughCanvas.height = texSize;
  const rCtx = roughCanvas.getContext('2d');

  if (aCtx && hCtx && rCtx) {
    aCtx.fillStyle = '#aeb9c8';
    aCtx.fillRect(0, 0, texSize, texSize);
    hCtx.fillStyle = '#181818';
    hCtx.fillRect(0, 0, texSize, texSize);
    rCtx.fillStyle = '#d8d8d8'; // matte dark crevices
    rCtx.fillRect(0, 0, texSize, texSize);

    const rows = 16;
    const cols = 14;
    const stepX = texSize / cols;
    const stepY = texSize / rows;

    for (let r = -1; r <= rows + 1; r++) {
      for (let c = -1; c <= cols + 1; c++) {
        const jitterX = (((r * 17 + c * 31) % 11) - 5) * 0.5;
        const cx = c * stepX + (r % 2 === 0 ? 0 : stepX * 0.5) + jitterX;
        const cy = r * stepY;

        const traceScale = (ctx: CanvasRenderingContext2D, expand = 1) => {
          const sx = stepX * expand;
          const sy = stepY * expand;
          ctx.beginPath();
          ctx.moveTo(cx, cy - sy * 0.62);
          ctx.quadraticCurveTo(cx + sx * 0.56, cy - sy * 0.08, cx + sx * 0.44, cy + sy * 0.46);
          ctx.quadraticCurveTo(cx, cy + sy * 0.78, cx - sx * 0.44, cy + sy * 0.46);
          ctx.quadraticCurveTo(cx - sx * 0.56, cy - sy * 0.08, cx, cy - sy * 0.62);
          ctx.closePath();
        };

        // Rich satin-matte scale gradient (no pure-white hot edges that wash out scale hue)
        const shade = 152 + ((r * 13 + c * 19) % 44);
        const aGrad = aCtx.createLinearGradient(cx, cy - stepY * 0.6, cx, cy + stepY * 0.7);
        aGrad.addColorStop(0, `rgb(${Math.min(212, shade + 24)}, ${Math.min(216, shade + 26)}, ${Math.min(222, shade + 28)})`);
        aGrad.addColorStop(0.55, `rgb(${shade}, ${shade + 3}, ${shade + 7})`);
        aGrad.addColorStop(1, `rgb(${Math.max(68, shade - 54)}, ${Math.max(72, shade - 50)}, ${Math.max(80, shade - 44)})`);
        traceScale(aCtx, 1.0);
        aCtx.fillStyle = aGrad;
        aCtx.fill();
        aCtx.strokeStyle = 'rgba(8, 12, 22, 0.94)';
        aCtx.lineWidth = Math.max(2.0, texSize * 0.0054);
        aCtx.stroke();

        // Subtle organic dorsal keel shading (soft dark-neutral ridge, zero bright white stripe)
        aCtx.strokeStyle = 'rgba(220, 232, 245, 0.14)';
        aCtx.lineWidth = Math.max(1.1, texSize * 0.0028);
        aCtx.beginPath();
        aCtx.moveTo(cx, cy - stepY * 0.32);
        aCtx.lineTo(cx, cy + stepY * 0.34);
        aCtx.stroke();

        // Smooth rounded heightfield for natural 3D normal map (zero harsh micro-spikes)
        const hGrad = hCtx.createRadialGradient(cx, cy - stepY * 0.06, stepX * 0.05, cx, cy, stepX * 0.64);
        hGrad.addColorStop(0, 'rgb(228,228,228)');
        hGrad.addColorStop(0.65, 'rgb(172,172,172)');
        hGrad.addColorStop(1, 'rgb(44,44,44)');
        traceScale(hCtx, 0.98);
        hCtx.fillStyle = hGrad;
        hCtx.fill();
        hCtx.strokeStyle = 'rgb(18,18,18)';
        hCtx.lineWidth = Math.max(1.8, texSize * 0.0048);
        hCtx.stroke();

        // Matte-satin roughness contrast: avoid mirror-bright spikes while keeping deep matte crevices
        traceScale(rCtx, 0.92);
        const rVal = 152 + ((r * 7 + c * 11) % 24);
        rCtx.fillStyle = `rgb(${rVal}, ${rVal}, ${rVal})`;
        rCtx.fill();
        rCtx.strokeStyle = 'rgb(236,236,236)';
        rCtx.lineWidth = Math.max(1.8, texSize * 0.0048);
        rCtx.stroke();
      }
    }
  }

  const albedoTint = new THREE.CanvasTexture(albedoCanvas);
  albedoTint.colorSpace = THREE.SRGBColorSpace;
  albedoTint.wrapS = THREE.RepeatWrapping;
  albedoTint.wrapT = THREE.RepeatWrapping;
  albedoTint.repeat.set(3.4, 3.4);

  const normalMap = buildNormalMapFromHeightCanvas(heightCanvas, 1.85);
  normalMap.repeat.set(3.4, 3.4);

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(3.6, 3.6);

  return { albedoTint, normalMap, roughnessMap };
}

function createKeratinHornTextures(texSize = 256): {
  map: THREE.CanvasTexture;
  normalMap: THREE.DataTexture;
} {
  const c = document.createElement('canvas');
  c.width = texSize;
  c.height = texSize;
  const ctx = c.getContext('2d');

  const hc = document.createElement('canvas');
  hc.width = texSize;
  hc.height = texSize;
  const hCtx = hc.getContext('2d');

  if (ctx && hCtx) {
    const grad = ctx.createLinearGradient(0, 0, 0, texSize);
    grad.addColorStop(0, '#f3f4f6');
    grad.addColorStop(0.55, '#9ca3af');
    grad.addColorStop(1, '#374151');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, texSize, texSize);

    hCtx.fillStyle = '#808080';
    hCtx.fillRect(0, 0, texSize, texSize);

    // Circumferential keratin growth rings + longitudinal flutes
    for (let y = 0; y < texSize; y += 10) {
      const shade = 70 + ((y * 13) % 85);
      ctx.strokeStyle = `rgba(18, 22, 30, ${0.24 + ((y % 20) === 0 ? 0.16 : 0)})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(texSize * 0.33, y + 3, texSize * 0.66, y - 3, texSize, y);
      ctx.stroke();

      hCtx.strokeStyle = `rgb(${shade}, ${shade}, ${shade})`;
      hCtx.lineWidth = 3;
      hCtx.beginPath();
      hCtx.moveTo(0, y);
      hCtx.bezierCurveTo(texSize * 0.33, y + 3, texSize * 0.66, y - 3, texSize, y);
      hCtx.stroke();
    }

    for (let x = 0; x < texSize; x += 14) {
      ctx.strokeStyle = 'rgba(255,255,255,0.10)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 4, texSize);
      ctx.stroke();
    }
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;

  const normalMap = buildNormalMapFromHeightCanvas(hc, 2.2);
  return { map, normalMap };
}

function createWingMembraneTextures(texSize = 512): {
  map: THREE.CanvasTexture;
  normalMap: THREE.DataTexture;
  veinGlow: THREE.CanvasTexture;
} {
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = texSize;
  baseCanvas.height = texSize;
  const ctx = baseCanvas.getContext('2d');

  const heightCanvas = document.createElement('canvas');
  heightCanvas.width = texSize;
  heightCanvas.height = texSize;
  const hCtx = heightCanvas.getContext('2d');

  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = texSize;
  glowCanvas.height = texSize;
  const gCtx = glowCanvas.getContext('2d');

  if (ctx && hCtx && gCtx) {
    const grad = ctx.createRadialGradient(
      texSize * 0.48,
      texSize * 0.45,
      texSize * 0.06,
      texSize * 0.5,
      texSize * 0.5,
      texSize * 0.72
    );
    grad.addColorStop(0, '#e5e7eb');
    grad.addColorStop(0.5, '#9ca3af');
    grad.addColorStop(1, '#3f3f46');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, texSize, texSize);

    hCtx.fillStyle = '#707070';
    hCtx.fillRect(0, 0, texSize, texSize);

    gCtx.fillStyle = '#060608';
    gCtx.fillRect(0, 0, texSize, texSize);

    // Stretch leather fibers & tension creases
    for (let s = 0; s < 48; s++) {
      const y = (s / 48) * texSize;
      ctx.strokeStyle = 'rgba(12, 16, 26, 0.16)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(texSize * 0.5, y + Math.sin(s * 0.9) * 14, texSize, y + 6);
      ctx.stroke();

      hCtx.strokeStyle = s % 2 === 0 ? '#9e9e9e' : '#4a4a4a';
      hCtx.lineWidth = 1.6;
      hCtx.beginPath();
      hCtx.moveTo(0, y);
      hCtx.quadraticCurveTo(texSize * 0.5, y + Math.sin(s * 0.9) * 14, texSize, y + 6);
      hCtx.stroke();
    }

    // Organic capillary veins & glowing elemental webbing
    const branches = 24;
    for (let i = 0; i < branches; i++) {
      const startX = ((i % 4) * 0.24 + 0.06) * texSize;
      const startY = (Math.floor(i / 4) * 0.16 + 0.04) * texSize;
      const midX = startX + (0.14 + ((i * 19) % 18) * 0.01) * texSize;
      const midY = startY + (0.11 + ((i * 23) % 16) * 0.01) * texSize;
      const endX = midX + (0.13 + ((i * 17) % 16) * 0.01) * texSize;
      const endY = midY + (0.07 + ((i * 29) % 14) * 0.01) * texSize;

      ctx.strokeStyle = 'rgba(15, 20, 30, 0.5)';
      ctx.lineWidth = texSize * 0.007;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();

      hCtx.strokeStyle = '#efefef';
      hCtx.lineWidth = texSize * 0.008;
      hCtx.beginPath();
      hCtx.moveTo(startX, startY);
      hCtx.quadraticCurveTo(midX, midY, endX, endY);
      hCtx.stroke();

      gCtx.strokeStyle = 'rgba(255,255,255,0.72)';
      gCtx.lineWidth = texSize * 0.008;
      gCtx.beginPath();
      gCtx.moveTo(startX, startY);
      gCtx.quadraticCurveTo(midX, midY, endX, endY);
      gCtx.stroke();

      // Fine fork capillary
      gCtx.strokeStyle = 'rgba(255,255,255,0.36)';
      gCtx.lineWidth = texSize * 0.004;
      gCtx.beginPath();
      gCtx.moveTo(midX, midY);
      gCtx.lineTo(midX + texSize * 0.07, midY - texSize * 0.09);
      gCtx.stroke();
    }
  }

  const map = new THREE.CanvasTexture(baseCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const normalMap = buildNormalMapFromHeightCanvas(heightCanvas, 2.0);
  const veinGlow = new THREE.CanvasTexture(glowCanvas);
  veinGlow.colorSpace = THREE.SRGBColorSpace;
  return { map, normalMap, veinGlow };
}

function createBasaltRockTextures(texSize = 512): {
  map: THREE.CanvasTexture;
  normalMap: THREE.DataTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const c = document.createElement('canvas');
  c.width = texSize;
  c.height = texSize;
  const ctx = c.getContext('2d');

  const hc = document.createElement('canvas');
  hc.width = texSize;
  hc.height = texSize;
  const hCtx = hc.getContext('2d');

  const rc = document.createElement('canvas');
  rc.width = texSize;
  rc.height = texSize;
  const rCtx = rc.getContext('2d');

  if (ctx && hCtx && rCtx) {
    ctx.fillStyle = '#202633';
    ctx.fillRect(0, 0, texSize, texSize);
    hCtx.fillStyle = '#707070';
    hCtx.fillRect(0, 0, texSize, texSize);
    rCtx.fillStyle = '#d4d4d4';
    rCtx.fillRect(0, 0, texSize, texSize);

    for (let i = 0; i < 280; i++) {
      const x = (i * 97) % texSize;
      const y = (i * 151) % texSize;
      const w = 22 + ((i * 23) % 68);
      const h = 14 + ((i * 31) % 44);
      const v = 22 + ((i * 13) % 38);
      ctx.fillStyle = `rgb(${v},${v + 4},${v + 12})`;
      ctx.fillRect(x, y, w, h);

      const hv = 50 + ((i * 41) % 180);
      hCtx.fillStyle = `rgb(${hv},${hv},${hv})`;
      hCtx.fillRect(x, y, w, h);

      const rv = 155 + ((i * 19) % 85);
      rCtx.fillStyle = `rgb(${rv},${rv},${rv})`;
      rCtx.fillRect(x, y, w, h);
    }

    // Sharp basalt fracture fissures
    ctx.strokeStyle = 'rgba(6,8,14,0.78)';
    ctx.lineWidth = 2.6;
    hCtx.strokeStyle = '#0f0f0f';
    hCtx.lineWidth = 3.5;
    for (let k = 0; k < 14; k++) {
      const y0 = k * (texSize / 14) + 12;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.lineTo(texSize * 0.34, y0 + ((k % 3) - 1) * 24);
      ctx.lineTo(texSize * 0.68, y0 - (k % 2) * 18);
      ctx.lineTo(texSize, y0 + 10);
      ctx.stroke();

      hCtx.beginPath();
      hCtx.moveTo(0, y0);
      hCtx.lineTo(texSize * 0.34, y0 + ((k % 3) - 1) * 24);
      hCtx.lineTo(texSize * 0.68, y0 - (k % 2) * 18);
      hCtx.lineTo(texSize, y0 + 10);
      hCtx.stroke();
    }
  }

  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2, 2);

  const normalMap = buildNormalMapFromHeightCanvas(hc, 3.0);
  normalMap.repeat.set(2, 2);

  const roughnessMap = new THREE.CanvasTexture(rc);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 2);

  return { map, normalMap, roughnessMap };
}

function createSnowCrystalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 64, 64);
    ctx.translate(32, 32);
    ctx.strokeStyle = 'rgba(235, 248, 255, 0.96)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 3);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -24);
      ctx.stroke();

      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(-5.5, -16.5);
      ctx.moveTo(0, -11);
      ctx.lineTo(5.5, -16.5);
      ctx.moveTo(0, -18);
      ctx.lineTo(-4, -22);
      ctx.moveTo(0, -18);
      ctx.lineTo(4, -22);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSparkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 64, 64);
    ctx.translate(32, 32);
    // Sharp 4-point electric star core (zero cloudy paint halo)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(3.5, -3.5);
    ctx.lineTo(26, 0);
    ctx.lineTo(3.5, 3.5);
    ctx.lineTo(0, 26);
    ctx.lineTo(-3.5, 3.5);
    ctx.lineTo(-26, 0);
    ctx.lineTo(-3.5, -3.5);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createEmberFleckTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 64, 64);
    ctx.translate(32, 32);
    ctx.rotate(0.4);
    ctx.fillStyle = 'rgba(255, 244, 214, 0.98)';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(9, -2);
    ctx.lineTo(3, 18);
    ctx.lineTo(-9, 3);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0,0,0,0.86)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.42)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function ensureGeometryNormalsAndTangents(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  geo.computeVertexNormals();
  if (geo.attributes.uv && geo.attributes.normal && geo.index) {
    try {
      geo.computeTangents();
    } catch {
      // Fallback cleanly if a degenerate UV triangle occurs
    }
  }
  return geo;
}

/** Closes an open loft ring cleanly with verified outward-facing triangle winding */
function capLoftRing(
  positions: number[],
  uvs: number[],
  indices: number[],
  ringStartIdx: number,
  radSegs: number,
  center: THREE.Vector3,
  outwardDir: THREE.Vector3,
  uvCenter: [number, number] = [0.5, 0.5]
) {
  const centerIdx = positions.length / 3;
  positions.push(center.x, center.y, center.z);
  uvs.push(uvCenter[0], uvCenter[1]);

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const triN = new THREE.Vector3();
  const a0 = ringStartIdx;
  const b0 = ringStartIdx + 1;
  vA.set(positions[a0 * 3] - center.x, positions[a0 * 3 + 1] - center.y, positions[a0 * 3 + 2] - center.z);
  vB.set(positions[b0 * 3] - center.x, positions[b0 * 3 + 1] - center.y, positions[b0 * 3 + 2] - center.z);
  triN.crossVectors(vA, vB);
  const reverse = triN.dot(outwardDir) < 0;

  for (let j = 0; j < radSegs; j++) {
    const p1 = ringStartIdx + j;
    const p2 = ringStartIdx + j + 1;
    if (reverse) {
      indices.push(centerIdx, p2, p1);
    } else {
      indices.push(centerIdx, p1, p2);
    }
  }
}

/** Builds a watertight tapered Tube-like BufferGeometry along a 3D curve with computed tangents */
function buildTaperedCurveGeometry(
  curve: THREE.CatmullRomCurve3,
  segments: number,
  radialSegments: number,
  radiusFn: (t: number) => number,
  squashX = 1,
  squashY = 1,
  capEnds = true
): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(segments, false);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const P = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();
  const vtx = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, P);
    N.copy(frames.normals[i]);
    B.copy(frames.binormals[i]);
    const r = Math.max(0.004, radiusFn(t));

    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      const cos = -Math.cos(theta) * squashX;
      const sin = Math.sin(theta) * squashY;
      vtx
        .copy(P)
        .addScaledVector(N, r * cos)
        .addScaledVector(B, r * sin);
      positions.push(vtx.x, vtx.y, vtx.z);
      uvs.push(j / radialSegments, t * 2);
    }
  }

  const ring = radialSegments + 1;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * ring + j;
      const b = (i + 1) * ring + j;
      const c = (i + 1) * ring + (j + 1);
      const d = i * ring + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  if (capEnds) {
    const pStart = curve.getPointAt(0);
    const tStart = curve.getTangentAt(0).negate();
    capLoftRing(positions, uvs, indices, 0, radialSegments, pStart, tStart, [0.5, 0]);

    const pEnd = curve.getPointAt(1);
    const tEnd = curve.getTangentAt(1);
    capLoftRing(positions, uvs, indices, segments * ring, radialSegments, pEnd, tEnd, [0.5, 1]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return ensureGeometryNormalsAndTangents(geo);
}

/**
 * Watertight sculpted dragon torso loft from deep muscular chest/pectorals
 * through serratus ribcage and lean waist to full pelvic haunch & rump bridge.
 */
function buildSculptedTorsoGeometry(): THREE.BufferGeometry {
  const spine = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.07, 0.30),
    new THREE.Vector3(0, 0.96, 0.22),
    new THREE.Vector3(0, 0.84, 0.04),
    new THREE.Vector3(0, 0.72, -0.24),
    new THREE.Vector3(0, 0.62, -0.56),
  ]);
  const frames = spine.computeFrenetFrames(24, false);
  const segs = 24;
  const radSegs = 20;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const P = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();
  const vtx = new THREE.Vector3();

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    spine.getPointAt(t, P);
    N.copy(frames.normals[i]);
    B.copy(frames.binormals[i]);

    // Ribcage swell around t=0.22, waist taper t=0.62, muscular pelvic rump swell t=0.88..1.0
    const chestSwell = Math.exp(-Math.pow((t - 0.24) / 0.22, 2)) * 0.22;
    const pelvisSwell = Math.exp(-Math.pow((t - 0.88) / 0.17, 2)) * 0.12;
    const capTaper = t > 0.93 ? 1 - ((t - 0.93) / 0.07) * 0.25 : 1;
    const rxBase = (0.22 + chestSwell + pelvisSwell - t * 0.04) * capTaper;
    const ryBase = (0.24 + chestSwell * 1.18 + pelvisSwell - t * 0.03) * capTaper;

    for (let j = 0; j <= radSegs; j++) {
      const theta = (j / radSegs) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      // Anatomical dorsal keel crest + pectoral chest cleavage + ventral sternum ridge
      const dorsalRidge = sin < -0.55 ? Math.pow(-sin - 0.55, 1.5) * 0.09 : 0;
      const pecBulge = sin > 0.15 ? Math.sin(Math.abs(cos) * Math.PI) * chestSwell * 0.36 : 0;
      const sternumCleavage = sin > 0.45 && Math.abs(cos) < 0.25 ? -0.028 * (1 - t) : 0;
      const ribRipple = Math.sin(t * 28) * 0.008 * Math.max(0, 1 - Math.abs(cos) * 0.6);

      const xOffset = cos * (rxBase + pecBulge + ribRipple);
      const yOffset = sin * (ryBase + pecBulge * 0.4 + sternumCleavage) - dorsalRidge;

      vtx
        .copy(P)
        .addScaledVector(B, xOffset)
        .addScaledVector(N, yOffset);
      positions.push(vtx.x, vtx.y, vtx.z);
      uvs.push(j / radSegs, t * 2.4);
    }
  }

  const ring = radSegs + 1;
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radSegs; j++) {
      const a = i * ring + j;
      const b = (i + 1) * ring + j;
      const c = (i + 1) * ring + (j + 1);
      const d = i * ring + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  capLoftRing(positions, uvs, indices, 0, radSegs, spine.getPointAt(0), spine.getTangentAt(0).negate(), [0.5, 0]);
  capLoftRing(positions, uvs, indices, segs * ring, radSegs, new THREE.Vector3(0, 0.60, -0.64), spine.getTangentAt(1), [0.5, 1]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return ensureGeometryNormalsAndTangents(geo);
}

/**
 * Watertight sculpted predator dragon skull loft with rounded armored occiput (back of skull),
 * temple/cheek plates, brow ridges, nasal bridge, flared nostrils, and closed sculpted snout/nose tip.
 */
function buildSculptedDragonHeadGeometry(): THREE.BufferGeometry {
  const segs = 26;
  const radSegs = 20;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const t = i / segs; // 0 = closed occiput dome (-0.23), 1 = closed nose tip (+0.67)
    const z = -0.23 + t * 0.90;

    // Smooth dome closure at back of skull (t < 0.16) and sculpted rounded snout/nose taper at tip (t > 0.84)
    const backDome = t < 0.16 ? Math.sin(((t + 0.08) / 0.24) * Math.PI * 0.5) : 1;
    const tipDome = t > 0.84 ? Math.cos(((t - 0.84) / 0.16) * Math.PI * 0.36) : 1;

    const baseWidth =
      t < 0.35
        ? 0.22 + Math.sin((t / 0.35) * Math.PI * 0.65) * 0.06
        : 0.255 * (1 - (t - 0.35) * 0.64);
    const baseHeight =
      t < 0.32
        ? 0.20 + Math.sin((t / 0.32) * Math.PI * 0.5) * 0.045
        : 0.215 * (1 - (t - 0.32) * 0.54);

    const widthProfile = Math.max(0.055, baseWidth * backDome * tipDome);
    const heightProfile = Math.max(0.048, baseHeight * backDome * tipDome);
    const yCenter = 0.045 - t * 0.018 + Math.sin(t * Math.PI) * 0.025;

    for (let j = 0; j <= radSegs; j++) {
      const theta = (j / radSegs) * Math.PI * 2;
      const cx = Math.sin(theta);
      const cy = Math.cos(theta);

      // Fierce overhanging brow ridge at t=0.34..0.56 and nasal keel along snout
      const browZone = Math.exp(-Math.pow((t - 0.46) / 0.14, 2));
      const eyeSocketCarve = browZone * (Math.abs(cx) > 0.65 && cy > -0.15 && cy < 0.45 ? -0.042 : 0);
      const browOverhang = browZone * (Math.abs(cx) > 0.35 && cy >= 0.45 ? 0.044 : 0);
      const nasalKeel = t > 0.45 && t < 0.94 && cy > 0.65 ? Math.pow(cy, 3) * 0.046 * (1 - (t - 0.45) * 0.6) : 0;
      const nostrilFlare =
        t > 0.78 && t < 0.94 && Math.abs(cx) > 0.45 && cy > 0
          ? Math.exp(-Math.pow((t - 0.86) / 0.06, 2)) * 0.024
          : 0;
      const cheekFlare = t > 0.15 && t < 0.42 && cy < 0.1 && Math.abs(cx) > 0.7 ? 0.036 : 0;

      // Flatten palate underside cleanly
      const palateY = cy < -0.25 ? cy * 0.55 : cy;

      const x = cx * (widthProfile + cheekFlare + nostrilFlare + eyeSocketCarve);
      const y = yCenter + palateY * heightProfile + browOverhang + nasalKeel;

      positions.push(x, y, z);
      uvs.push(j / radSegs, t * 1.8);
    }
  }

  const ring = radSegs + 1;
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radSegs; j++) {
      const a = i * ring + j;
      const b = (i + 1) * ring + j;
      const c = (i + 1) * ring + (j + 1);
      const d = i * ring + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  // Watertight rounded back of skull (occiput) and closed nose tip
  capLoftRing(positions, uvs, indices, 0, radSegs, new THREE.Vector3(0, 0.045, -0.28), new THREE.Vector3(0, 0, -1), [0.5, 0]);
  capLoftRing(positions, uvs, indices, segs * ring, radSegs, new THREE.Vector3(0, 0.024, 0.715), new THREE.Vector3(0, 0, 1), [0.5, 1]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return ensureGeometryNormalsAndTangents(geo);
}

/** Watertight sculpted roaring lower mandible with angular jaw ramus, solid chin tip, and capped ends */
function buildSculptedMandibleGeometry(): THREE.BufferGeometry {
  const segs = 16;
  const radSegs = 14;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const z = -0.04 + t * 0.56;
    const tipTaper = t > 0.84 ? Math.cos(((t - 0.84) / 0.16) * Math.PI * 0.36) : 1;
    const w = Math.max(0.036, 0.16 * (1 - t * 0.54) * tipTaper);
    const h = Math.max(0.028, 0.072 * (1 - t * 0.40) * tipTaper);
    const yC = -0.026 - t * 0.006;

    for (let j = 0; j <= radSegs; j++) {
      const theta = (j / radSegs) * Math.PI * 2;
      const cx = Math.sin(theta);
      const cy = Math.cos(theta);
      const chinKeel = cy < -0.5 ? (t > 0.65 ? -0.022 : -0.012) : 0;
      const upperFlat = cy > 0.2 ? cy * 0.45 : cy;
      positions.push(cx * w, yC + upperFlat * h + chinKeel, z);
      uvs.push(j / radSegs, t);
    }
  }

  const ring = radSegs + 1;
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radSegs; j++) {
      const a = i * ring + j;
      const b = (i + 1) * ring + j;
      const c = (i + 1) * ring + (j + 1);
      const d = i * ring + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  capLoftRing(positions, uvs, indices, 0, radSegs, new THREE.Vector3(0, -0.026, -0.055), new THREE.Vector3(0, 0, -1), [0.5, 0]);
  capLoftRing(positions, uvs, indices, segs * ring, radSegs, new THREE.Vector3(0, -0.032, 0.548), new THREE.Vector3(0, 0, 1), [0.5, 1]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return ensureGeometryNormalsAndTangents(geo);
}

/** Vertex-displaced stratified basalt crag cliff base (replaces smooth cylinder pedestal) */
function buildLayeredCragGeometry(): THREE.BufferGeometry {
  const segY = 8;
  const segR = 24;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let yIdx = 0; yIdx <= segY; yIdx++) {
    const v = yIdx / segY; // 0 = base, 1 = top platform
    const y = v * 0.34;
    const baseRad = THREE.MathUtils.lerp(1.62, 1.06, Math.pow(v, 0.85));

    for (let rIdx = 0; rIdx <= segR; rIdx++) {
      const u = rIdx / segR;
      const ang = u * Math.PI * 2;
      const rockRidge =
        Math.sin(ang * 5 + v * 3.1) * 0.14 +
        Math.cos(ang * 9 - v * 2.2) * 0.08 +
        Math.sin(ang * 13) * 0.04;
      const shelfStep = Math.floor(v * 3.5) * 0.035;
      const rad = yIdx === segY ? baseRad * (0.94 + rockRidge * 0.35) : baseRad + rockRidge - shelfStep;
      const yDisp = yIdx === 0 ? 0 : y + (yIdx === segY ? 0 : Math.sin(ang * 7 + yIdx) * 0.018);

      positions.push(Math.cos(ang) * rad, yDisp, Math.sin(ang) * rad);
      uvs.push(u * 2, v);
    }
  }

  // Top center cap vertex
  const topCenterIdx = positions.length / 3;
  positions.push(0, 0.34, 0);
  uvs.push(0.5, 1);

  const ring = segR + 1;
  for (let i = 0; i < segY; i++) {
    for (let j = 0; j < segR; j++) {
      const a = i * ring + j;
      const b = (i + 1) * ring + j;
      const c = (i + 1) * ring + (j + 1);
      const d = i * ring + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }
  const topRingStart = segY * ring;
  for (let j = 0; j < segR; j++) {
    indices.push(topRingStart + j, topCenterIdx, topRingStart + j + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return ensureGeometryNormalsAndTangents(geo);
}

/** Builds a high-detail scalloped bat-wing membrane with natural camber across finger rays */
function buildWingMembraneGeometry(side: -1 | 1): THREE.BufferGeometry {
  const wrist = new THREE.Vector3(0, 0, 0);
  const shoulderAnchor = new THREE.Vector3(side * -0.70, -0.70, 0.08);
  const hipAnchor = new THREE.Vector3(side * -0.76, -1.16, -0.26);

  const tips = [
    new THREE.Vector3(side * 1.18, 0.24, -0.14),
    new THREE.Vector3(side * 1.24, -0.48, -0.22),
    new THREE.Vector3(side * 0.84, -0.98, -0.24),
    new THREE.Vector3(side * 0.26, -1.16, -0.18),
  ];

  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];

  const pushTri = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    c: THREE.Vector3,
    ua: [number, number],
    ub: [number, number],
    uc: [number, number]
  ) => {
    const base = pos.length / 3;
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    uvs.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
    if (side === -1) {
      idx.push(base, base + 2, base + 1);
    } else {
      idx.push(base, base + 1, base + 2);
    }
  };

  const addScallopWeb = (pA: THREE.Vector3, pB: THREE.Vector3, archPull: number, u0: number, u1: number) => {
    const steps = 6;
    for (let s = 0; s < steps; s++) {
      const f0 = s / steps;
      const f1 = (s + 1) / steps;
      const e0 = new THREE.Vector3().lerpVectors(pA, pB, f0);
      const e1 = new THREE.Vector3().lerpVectors(pA, pB, f1);
      const scallop0 = Math.sin(f0 * Math.PI) * archPull;
      const scallop1 = Math.sin(f1 * Math.PI) * archPull;
      e0.lerp(wrist, scallop0);
      e1.lerp(wrist, scallop1);
      e0.z -= Math.sin(f0 * Math.PI) * 0.085;
      e1.z -= Math.sin(f1 * Math.PI) * 0.085;

      const m0 = new THREE.Vector3().lerpVectors(wrist, e0, 0.52);
      const m1 = new THREE.Vector3().lerpVectors(wrist, e1, 0.52);
      m0.z -= 0.045;
      m1.z -= 0.045;

      const um0 = THREE.MathUtils.lerp(0.12, u0, 0.52);
      const um1 = THREE.MathUtils.lerp(0.12, u1, 0.52);

      pushTri(wrist, m0, m1, [0.1, 0.1], [um0, 0.52], [um1, 0.52]);
      pushTri(m0, e0, e1, [um0, 0.52], [u0, 0.92], [u1, 0.92]);
      pushTri(m0, e1, m1, [um0, 0.52], [u1, 0.92], [um1, 0.52]);
    }
  };

  addScallopWeb(tips[0], tips[1], 0.25, 0.2, 0.45);
  addScallopWeb(tips[1], tips[2], 0.29, 0.45, 0.7);
  addScallopWeb(tips[2], tips[3], 0.27, 0.7, 0.88);

  const midInner = new THREE.Vector3().lerpVectors(tips[3], hipAnchor, 0.5).lerp(wrist, 0.24);
  midInner.z -= 0.05;
  pushTri(wrist, tips[3], midInner, [0.1, 0.1], [0.85, 0.9], [0.55, 0.85]);
  pushTri(wrist, midInner, hipAnchor, [0.1, 0.1], [0.55, 0.85], [0.25, 0.95]);
  pushTri(wrist, hipAnchor, shoulderAnchor, [0.1, 0.1], [0.25, 0.95], [0.05, 0.65]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  return ensureGeometryNormalsAndTangents(geo);
}

export const Dragon3DStage: React.FC<Dragon3DStageProps> = ({
  skin,
  rarity,
  level,
  customLevel,
  sizeTier = 'NORMAL',
  gear = 'none',
  aura = 'auto',
  isFever = false,
  feedPulseNonce,
  levelBurstNonce,
  onTapStage,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const propsRef = useRef({ skin, rarity, level, customLevel, sizeTier, gear, aura, isFever });
  propsRef.current = { skin, rarity, level, customLevel, sizeTier, gear, aura, isFever };

  const pulseStateRef = useRef({
    roarImpulse: 0,
    burstEnergy: 0,
    cameraShake: 0,
    dragYaw: -0.48,
    targetYaw: -0.48,
    dragPitch: 0,
    targetPitch: 0,
    parallaxX: 0,
    parallaxY: 0,
    currentParallaxX: 0,
    currentParallaxY: 0,
    dragHoldUntil: 0,
    isDragging: false,
    lastPointerX: 0,
    lastPointerY: 0,
    downPointerX: 0,
    downPointerY: 0,
  });

  const lastFeedNonceRef = useRef(feedPulseNonce);
  const lastLevelNonceRef = useRef(levelBurstNonce);

  useEffect(() => {
    if (feedPulseNonce !== lastFeedNonceRef.current) {
      lastFeedNonceRef.current = feedPulseNonce;
      const p = pulseStateRef.current;
      p.roarImpulse = 1.0;
      p.burstEnergy = Math.min(2.4, p.burstEnergy + 0.95);
      p.cameraShake = Math.max(p.cameraShake, 0.032);
      soundFX.playDragonRoar(0.88, p.dragYaw);
    }
  }, [feedPulseNonce]);

  useEffect(() => {
    if (levelBurstNonce !== lastLevelNonceRef.current) {
      lastLevelNonceRef.current = levelBurstNonce;
      const p = pulseStateRef.current;
      p.roarImpulse = 1.45;
      p.burstEnergy = 3.0;
      p.cameraShake = 0.075;
      soundFX.playDragonRoar(1.25, p.dragYaw);
    }
  }, [levelBurstNonce]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReduced =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const lowMem =
      typeof navigator !== 'undefined' &&
      'deviceMemory' in navigator &&
      Number((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8) <= 3;

    const isSoftwareGl = detectSoftwareWebGL();
    let tier: 'HIGH' | 'MEDIUM' | 'ECO' = isSoftwareGl || prefersReduced ? 'ECO' : lowMem ? 'MEDIUM' : 'HIGH';

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl && !prefersReduced,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const width = Math.max(220, container.clientWidth);
    const height = Math.max(220, container.clientHeight);
    const dpr = window.devicePixelRatio || 1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 1.16;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(tier === 'HIGH' ? Math.min(dpr, 1.85) : tier === 'MEDIUM' ? Math.min(dpr, 1.25) : 1);
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = tier === 'HIGH';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvasEl = renderer.domElement;
    canvasEl.style.width = '100%';
    canvasEl.style.height = '100%';
    canvasEl.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(canvasEl);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFailed(true);
    };
    const onContextRestored = () => {
      setWebglFailed(false);
    };
    canvasEl.addEventListener('webglcontextlost', onContextLost);
    canvasEl.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    // Distance fog starts well behind dragon so foreground scales have zero fog washout
    scene.fog = new THREE.Fog(0x090c14, 11.5, 26);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.28;
    pmremGenerator.dispose();

    const baseCameraPos = new THREE.Vector3(-0.56, 1.84, 5.14);
    const lookTarget = new THREE.Vector3(0.04, 1.24, -0.05);
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
    camera.position.copy(baseCameraPos);
    camera.lookAt(lookTarget);

    // High-Contrast Sculpted Studio Lighting (controlled key + gentle dual rim — zero HDR white dot clipping)
    const hemiLight = new THREE.HemisphereLight(0xc7dcf5, 0x090d16, 0.45);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e2, 2.05);
    keyLight.position.set(3.4, 5.2, 3.6);
    keyLight.castShadow = tier === 'HIGH';
    keyLight.shadow.mapSize.width = 512;
    keyLight.shadow.mapSize.height = 512;
    keyLight.shadow.camera.left = -2.8;
    keyLight.shadow.camera.right = 2.8;
    keyLight.shadow.camera.top = 3.0;
    keyLight.shadow.camera.bottom = -2.4;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 16;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    // Primary Cool Back-Left Rim Light (carves horns, wings, and shoulder crest)
    const rimLight = new THREE.DirectionalLight(0xdbeafe, 1.65);
    rimLight.position.set(-3.9, 3.8, -3.6);
    scene.add(rimLight);

    // Secondary Warm Back-Right Rim Light (subtle warm edge contrast against dark backdrop)
    const rimLightRight = new THREE.DirectionalLight(0xfde68a, 1.05);
    rimLightRight.position.set(3.7, 2.9, -3.8);
    scene.add(rimLightRight);

    const underFillLight = new THREE.DirectionalLight(0x1e293b, 0.42);
    underFillLight.position.set(0.5, -2.5, 2.8);
    scene.add(underFillLight);

    // Pedestal/Aura Light isolated strictly to Light Layer 1 (illuminates crag & ground rune ring only, never dragon scales)
    const auraPointLight = new THREE.PointLight(0x38bdf8, 0.85, 4.5, 2);
    auraPointLight.position.set(0, 0.45, 0.65);
    auraPointLight.layers.set(1);
    scene.add(auraPointLight);

    const disposables: { dispose: () => void }[] = [envTex];
    const track = <T extends { dispose: () => void }>(res: T): T => {
      disposables.push(res);
      return res;
    };

    const texRes = tier === 'ECO' ? 256 : 512;
    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    // Procedural High-Res PBR Texture Sets (Albedo + Tangent-Space Normal + Roughness)
    const scaleTexSet = createDragonScaleTextures(texRes);
    track(scaleTexSet.albedoTint);
    track(scaleTexSet.normalMap);
    track(scaleTexSet.roughnessMap);
    scaleTexSet.albedoTint.anisotropy = maxAniso;
    scaleTexSet.normalMap.anisotropy = maxAniso;

    const hornTexSet = createKeratinHornTextures(256);
    track(hornTexSet.map);
    track(hornTexSet.normalMap);
    hornTexSet.map.anisotropy = maxAniso;

    const wingTexSet = createWingMembraneTextures(texRes);
    track(wingTexSet.map);
    track(wingTexSet.normalMap);
    track(wingTexSet.veinGlow);
    wingTexSet.map.anisotropy = maxAniso;

    const rockTexSet = createBasaltRockTextures(texRes);
    track(rockTexSet.map);
    track(rockTexSet.normalMap);
    track(rockTexSet.roughnessMap);
    rockTexSet.map.anisotropy = maxAniso;

    const shadowTex = track(createContactShadowTexture());
    const snowCrystalTex = track(createSnowCrystalTexture());
    const sparkTex = track(createSparkTexture());
    const emberFleckTex = track(createEmberFleckTexture());

    // Pure Physical PBR Materials (Zero shader glow contamination on dragon anatomy)
    const rockMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x374051,
        map: rockTexSet.map,
        normalMap: rockTexSet.normalMap,
        normalScale: new THREE.Vector2(1.15, 1.15),
        roughnessMap: rockTexSet.roughnessMap,
        roughness: 0.92,
        metalness: 0.12,
        flatShading: true,
      })
    );

    const runeFissureMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.35,
        roughness: 0.25,
        metalness: 0.7,
      })
    );

    const dragonShaderUniforms = {
      uRimColor: { value: new THREE.Color(0xe2eeff) },
    };

    const applyDragonPbrShader = (
      mat: THREE.MeshPhysicalMaterial,
      saturation = 1.38,
      contrast = 1.22,
      rimStrength = 0.32
    ) => {
      mat.customProgramCacheKey = () => `dragon-pbr-v4-${saturation}-${contrast}-${rimStrength}`;
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uRimColor = dragonShaderUniforms.uRimColor;

        shader.fragmentShader =
          `
          uniform vec3 uRimColor;
          ` + shader.fragmentShader;

        // 1. Boost chromatic saturation, contrast S-curve, and enforce opaque alpha = 1.0
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          float dragonLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb = mix(vec3(dragonLuma), diffuseColor.rgb, ${saturation.toFixed(2)});
          diffuseColor.rgb = clamp((diffuseColor.rgb - 0.5) * ${contrast.toFixed(2)} + 0.5, 0.0, 1.0);
          diffuseColor.rgb = pow(max(diffuseColor.rgb, vec3(0.001)), vec3(1.06));
          diffuseColor.a = 1.0;
          `
        );

        // 2. Deepen crevice relief using normal-mapped roughness cavity contrast
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <roughnessmap_fragment>',
          `
          #include <roughnessmap_fragment>
          float cavityDarken = mix(1.04, 0.76, clamp((roughnessFactor - 0.45) * 1.4, 0.0, 1.0));
          diffuseColor.rgb *= cavityDarken;
          `
        );

        // 3. Smooth Silhouette Rim Light using nonPerturbedNormal (DoubleSide-safe & zero micro-scale twinkling!)
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          `
          #include <emissivemap_fragment>
          vec3 rimViewDir = normalize(vViewPosition);
          vec3 macroNormal = normalize(nonPerturbedNormal);
          float rimNdotV = clamp(dot(macroNormal, rimViewDir), 0.0, 1.0);
          float rimFresnel = pow(1.0 - rimNdotV, 4.2);
          float rimDirGate = smoothstep(-0.15, 0.85, macroNormal.y * 0.65 - macroNormal.x * 0.35 - macroNormal.z * 0.25);
          vec3 tintedRim = mix(diffuseColor.rgb * 1.45, uRimColor, 0.42);
          totalEmissiveRadiance += tintedRim * (rimFresnel * (0.28 + 0.72 * rimDirGate)) * ${rimStrength.toFixed(2)};
          `
        );

        // 4. Hard opacity lock on final shaded fragment
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <opaque_fragment>',
          `
          #include <opaque_fragment>
          gl_FragColor.a = 1.0;
          `
        );
      };
      return mat;
    };

    const scaleMat = track(
      applyDragonPbrShader(
        new THREE.MeshPhysicalMaterial({
          color: 0x36586b,
          map: scaleTexSet.albedoTint,
          normalMap: scaleTexSet.normalMap,
          normalScale: new THREE.Vector2(1.05, 1.05),
          roughnessMap: scaleTexSet.roughnessMap,
          roughness: 0.76,
          metalness: 0.14,
          clearcoat: 0.0,
          envMapIntensity: 0.24,
          transparent: false,
          opacity: 1.0,
          depthWrite: true,
        }),
        1.42,
        1.22,
        0.34
      )
    );

    const scaleHighlightMat = track(
      applyDragonPbrShader(
        new THREE.MeshPhysicalMaterial({
          color: 0x67b7d1,
          map: scaleTexSet.albedoTint,
          normalMap: scaleTexSet.normalMap,
          normalScale: new THREE.Vector2(0.95, 0.95),
          roughnessMap: scaleTexSet.roughnessMap,
          roughness: 0.68,
          metalness: 0.18,
          clearcoat: 0.0,
          envMapIntensity: 0.28,
          transparent: false,
          opacity: 1.0,
          depthWrite: true,
        }),
        1.44,
        1.22,
        0.38
      )
    );

    const bellyMat = track(
      applyDragonPbrShader(
        new THREE.MeshPhysicalMaterial({
          color: 0x6ba7c0,
          normalMap: hornTexSet.normalMap,
          normalScale: new THREE.Vector2(0.55, 0.55),
          roughness: 0.62,
          metalness: 0.12,
          clearcoat: 0.0,
          envMapIntensity: 0.24,
          transparent: false,
          opacity: 1.0,
          depthWrite: true,
        }),
        1.28,
        1.16,
        0.26
      )
    );

    const wingMat = track(
      applyDragonPbrShader(
        new THREE.MeshPhysicalMaterial({
          color: 0x1c4459,
          map: wingTexSet.map,
          normalMap: wingTexSet.normalMap,
          normalScale: new THREE.Vector2(1.05, 1.05),
          roughness: 0.64,
          metalness: 0.06,
          sheen: 0.28,
          sheenRoughness: 0.65,
          envMapIntensity: 0.24,
          side: THREE.DoubleSide,
          transparent: false,
          opacity: 1.0,
          depthWrite: true,
        }),
        1.38,
        1.22,
        0.3
      )
    );

    const hornMat = track(
      applyDragonPbrShader(
        new THREE.MeshPhysicalMaterial({
          color: 0xe2e8f0,
          map: hornTexSet.map,
          normalMap: hornTexSet.normalMap,
          normalScale: new THREE.Vector2(0.95, 0.95),
          roughness: 0.42,
          metalness: 0.28,
          clearcoat: 0.22,
          clearcoatRoughness: 0.34,
          envMapIntensity: 0.45,
          transparent: false,
          opacity: 1.0,
          depthWrite: true,
        }),
        1.2,
        1.18,
        0.3
      )
    );

    const fangMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xf8fafc,
        roughness: 0.14,
        metalness: 0.06,
        clearcoat: 0.95,
      })
    );

    const eyeMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.15,
        roughness: 0.08,
      })
    );

    const corneaMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.04,
        metalness: 0.0,
        clearcoat: 1.0,
        transparent: true,
        opacity: 0.12,
      })
    );

    const pupilMat = track(
      new THREE.MeshBasicMaterial({
        color: 0x05070c,
      })
    );

    const mawGlowMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.2,
        roughness: 0.35,
      })
    );

    const goldGearMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xfacc15,
        roughness: 0.18,
        metalness: 0.94,
        clearcoat: 1.0,
      })
    );

    const steelGearMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xcbd5e1,
        roughness: 0.22,
        metalness: 0.88,
        clearcoat: 0.85,
      })
    );

    // =========================================================================
    // 1. JAGGED BASALT CRAG PEDESTAL (Grounded y = 0..0.34)
    // =========================================================================
    const pedestalGroup = new THREE.Group();
    scene.add(pedestalGroup);

    const contactPlane = new THREE.Mesh(
      track(new THREE.PlaneGeometry(4.4, 4.4)),
      track(
        new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          depthWrite: false,
          opacity: 0.76,
        })
      )
    );
    contactPlane.rotation.x = -Math.PI / 2;
    contactPlane.position.y = 0.01;
    pedestalGroup.add(contactPlane);

    const mainCrag = new THREE.Mesh(track(buildLayeredCragGeometry()), rockMat);
    mainCrag.rotation.y = 0.32;
    mainCrag.receiveShadow = true;
    mainCrag.castShadow = true;
    mainCrag.layers.enable(1);
    pedestalGroup.add(mainCrag);

    const rockOffsets: Array<[number, number, number, number, number, number]> = [
      [-0.95, 0.16, 0.32, 0.58, 0.38, 0.52],
      [0.98, 0.18, 0.22, 0.62, 0.40, 0.48],
      [0.12, 0.16, 0.94, 0.70, 0.28, 0.44],
      [-0.82, 0.20, -0.78, 0.72, 0.44, 0.60],
      [0.84, 0.20, -0.74, 0.68, 0.42, 0.56],
      [0, 0.15, -1.06, 0.88, 0.40, 0.54],
    ];
    const rockGeo = track(new THREE.DodecahedronGeometry(0.58, 1));
    rockOffsets.forEach(([x, y, z, sx, sy, sz], i) => {
      const boulder = new THREE.Mesh(rockGeo, rockMat);
      boulder.position.set(x, y, z);
      boulder.scale.set(sx, sy, sz);
      boulder.rotation.set(i * 0.6, i * 1.1, i * 0.4);
      boulder.receiveShadow = true;
      boulder.castShadow = true;
      boulder.layers.enable(1);
      pedestalGroup.add(boulder);
    });

    const fissureRing = new THREE.Mesh(track(new THREE.TorusGeometry(1.16, 0.018, 6, 14)), runeFissureMat);
    fissureRing.rotation.x = Math.PI / 2;
    fissureRing.rotation.z = 0.4;
    fissureRing.position.y = 0.29;
    fissureRing.layers.enable(1);
    pedestalGroup.add(fissureRing);

    // =========================================================================
    // 2. DRAGON ROOT & SCULPTED ANATOMICAL QUADRUPED
    // =========================================================================
    const dragonRoot = new THREE.Group();
    dragonRoot.position.y = 0.34;
    scene.add(dragonRoot);

    const rigPivot = new THREE.Group();
    dragonRoot.add(rigPivot);

    // --- Continuous Sculpted Muscular Torso + Ventral Armor Scutes ---
    const torsoGroup = new THREE.Group();
    rigPivot.add(torsoGroup);

    const sculptedTorsoMesh = new THREE.Mesh(track(buildSculptedTorsoGeometry()), scaleMat);
    sculptedTorsoMesh.castShadow = true;
    sculptedTorsoMesh.receiveShadow = true;
    torsoGroup.add(sculptedTorsoMesh);

    // Sculpted Pectoral Armor Plates & Clavicle Crest
    const plateGeo = track(new THREE.CylinderGeometry(0.28, 0.34, 0.11, 10));
    for (let p = 0; p < 9; p++) {
      const t = p / 8;
      const plate = new THREE.Mesh(plateGeo, bellyMat);
      const y = 1.24 - t * 0.68;
      const z = 0.39 - Math.pow(t, 1.15) * 0.76 + Math.sin(t * Math.PI) * 0.22;
      const sc = 0.60 + Math.sin(t * Math.PI) * 0.42 - t * 0.24;
      plate.position.set(0, y, z);
      plate.scale.set(sc * 1.12, 0.84, sc * 0.66);
      plate.rotation.x = 0.48 - t * 0.78;
      plate.castShadow = true;
      torsoGroup.add(plate);
    }

    // Sculpted Physical Sternum Crest Plate (Pure physical armor, zero skin glow)
    const sternumCrest = new THREE.Mesh(track(new THREE.ConeGeometry(0.082, 0.22, 5)), hornMat);
    sternumCrest.position.set(0, 0.94, 0.57);
    sternumCrest.rotation.x = Math.PI * 0.82;
    sternumCrest.scale.set(0.9, 1.0, 0.55);
    torsoGroup.add(sternumCrest);

    // Sculpted Muscular Rump / Pelvic Haunch Bridge (connects lower torso seamlessly into tail & hips)
    const rumpBridge = new THREE.Mesh(track(new THREE.SphereGeometry(0.28, 16, 14)), scaleMat);
    rumpBridge.position.set(0, 0.61, -0.52);
    rumpBridge.scale.set(1.08, 0.94, 1.18);
    rumpBridge.castShadow = true;
    rumpBridge.receiveShadow = true;
    torsoGroup.add(rumpBridge);

    // --- S-Curved Scaled Dragon Neck (seated deep inside torso & extends seamlessly into skull base) ---
    const neckCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.98, 0.26),
      new THREE.Vector3(0, 1.26, 0.35),
      new THREE.Vector3(0, 1.52, 0.23),
      new THREE.Vector3(0, 1.78, 0.22),
    ]);
    const neckGeo = track(
      buildTaperedCurveGeometry(neckCurve, 18, 16, (t) => 0.30 - t * 0.105, 0.88, 1.05)
    );
    const neckMesh = new THREE.Mesh(neckGeo, scaleMat);
    neckMesh.castShadow = true;
    torsoGroup.add(neckMesh);

    // Ventral Neck Throat Plates
    for (let np = 0; np < 6; np++) {
      const t = (np + 0.4) / 6;
      const pos = neckCurve.getPointAt(t);
      const throatPlate = new THREE.Mesh(plateGeo, bellyMat);
      throatPlate.position.set(0, pos.y - 0.01, pos.z + 0.155 - t * 0.04);
      const sc = 0.64 - t * 0.22;
      throatPlate.scale.set(sc, 0.68, sc * 0.54);
      throatPlate.rotation.x = 0.28;
      torsoGroup.add(throatPlate);
    }

    const backTorsoCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.96, 0.24),
      new THREE.Vector3(0, 0.78, -0.14),
      new THREE.Vector3(0, 0.64, -0.52),
    ]);

    // Dorsal Neck & Spine Spikes + ★3+ Physical Armored Spine Crest Studs (zero emissive bleed)
    const dorsalSpikes: THREE.Mesh[] = [];
    const dorsalCrestPlates: THREE.Mesh[] = [];
    const dorsalGeo = track(new THREE.ConeGeometry(0.068, 0.28, 5));
    const crestPlateGeo = track(new THREE.ConeGeometry(0.036, 0.14, 4));
    for (let s = 0; s < 8; s++) {
      const t = s / 7;
      const pt = t < 0.55 ? neckCurve.getPointAt(1 - t / 0.55) : backTorsoCurve.getPointAt((t - 0.55) / 0.45);
      const spike = new THREE.Mesh(dorsalGeo, hornMat);
      spike.position.set(0, pt.y + 0.14 - t * 0.04, pt.z - 0.22);
      spike.rotation.x = -0.92 - t * 0.18;
      spike.scale.set(0.75, 0.85 + Math.sin(t * Math.PI) * 0.45, 1.25);
      spike.castShadow = true;
      torsoGroup.add(spike);
      dorsalSpikes.push(spike);

      const crestPlate = new THREE.Mesh(crestPlateGeo, goldGearMat);
      crestPlate.position.set(0, pt.y + 0.15 - t * 0.04, pt.z - 0.26);
      crestPlate.rotation.x = -1.05 - t * 0.18;
      crestPlate.visible = false;
      torsoGroup.add(crestPlate);
      dorsalCrestPlates.push(crestPlate);
    }

    // --- 3. SCULPTED PREDATOR DRAGON SKULL ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.72, 0.26);
    headGroup.scale.setScalar(1.18);
    rigPivot.add(headGroup);

    const sculptedHeadMesh = new THREE.Mesh(track(buildSculptedDragonHeadGeometry()), scaleHighlightMat);
    sculptedHeadMesh.castShadow = true;
    headGroup.add(sculptedHeadMesh);

    // Skull-to-Neck Ball Socket Collar (prevents any neck seam gap during pitch/yaw rotation)
    const neckSocketCollar = new THREE.Mesh(track(new THREE.SphereGeometry(0.185, 14, 12)), scaleMat);
    neckSocketCollar.position.set(0, -0.02, -0.08);
    neckSocketCollar.scale.set(1.04, 0.98, 1.15);
    headGroup.add(neckSocketCollar);

    // Lower Eyelid Armor Accent
    const lowerLidGeo = track(new THREE.BoxGeometry(0.10, 0.024, 0.16));
    for (const side of [-1, 1] as const) {
      const lowerLid = new THREE.Mesh(lowerLidGeo, scaleMat);
      lowerLid.position.set(side * 0.138, 0.036, 0.23);
      lowerLid.rotation.set(-0.08, -side * 0.18, side * 0.12);
      headGroup.add(lowerLid);
    }

    // Multi-Layer Realistic Dragon Eyes (Iris + Slit Pupil + Glossy Cornea Dome)
    const eyeGeo = track(new THREE.SphereGeometry(0.052, 12, 12));
    const corneaGeo = track(new THREE.SphereGeometry(0.058, 12, 12));
    const pupilGeo = track(new THREE.BoxGeometry(0.015, 0.072, 0.028));
    for (const side of [-1, 1] as const) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.scale.set(0.7, 0.82, 1.2);
      eye.position.set(side * 0.155, 0.082, 0.25);

      const cornea = new THREE.Mesh(corneaGeo, corneaMat);
      cornea.scale.set(0.74, 0.86, 1.24);
      cornea.position.set(side * 0.158, 0.082, 0.255);

      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(side * 0.175, 0.082, 0.292);
      headGroup.add(eye, cornea, pupil);
    }

    // Recessed Physical Nostrils + Nasal Tip Ridge Horn (crowning the solid closed snout nose)
    const nostrilGeo = track(new THREE.SphereGeometry(0.022, 8, 8));
    for (const side of [-1, 1] as const) {
      const nos = new THREE.Mesh(nostrilGeo, pupilMat);
      nos.scale.set(0.82, 0.68, 1.35);
      nos.position.set(side * 0.056, 0.056, 0.595);
      headGroup.add(nos);
    }
    const nasalHorn = new THREE.Mesh(track(new THREE.ConeGeometry(0.036, 0.14, 5)), hornMat);
    nasalHorn.position.set(0, 0.105, 0.585);
    nasalHorn.rotation.x = -Math.PI * 0.22;
    headGroup.add(nasalHorn);

    // Cheek & Jaw Frill Spikes
    const cheekSpikeGeo = track(new THREE.ConeGeometry(0.045, 0.25, 5));
    for (let cs = 0; cs < 3; cs++) {
      for (const side of [-1, 1] as const) {
        const sp = new THREE.Mesh(cheekSpikeGeo, hornMat);
        sp.position.set(side * (0.22 + cs * 0.022), 0.04 - cs * 0.065, -0.02 - cs * 0.03);
        sp.rotation.set(-0.75 - cs * 0.15, 0, -side * 0.95);
        headGroup.add(sp);
      }
    }

    // Primary Curved Swept Horns + Metallic Rings
    const hornGroup = new THREE.Group();
    headGroup.add(hornGroup);

    const buildCurvedHorn = (side: -1 | 1) => {
      const hg = new THREE.Group();
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.12, 0.16, -0.02),
        new THREE.Vector3(side * 0.21, 0.34, -0.20),
        new THREE.Vector3(side * 0.28, 0.51, -0.42),
        new THREE.Vector3(side * 0.33, 0.66, -0.54),
      ]);
      const hGeo = track(buildTaperedCurveGeometry(curve, 14, 10, (t) => 0.074 * (1 - t * 0.86)));
      const hMesh = new THREE.Mesh(hGeo, hornMat);
      hMesh.castShadow = true;
      hg.add(hMesh);

      const bandGeo = track(new THREE.TorusGeometry(0.056, 0.012, 6, 12));
      for (let b = 0; b < 2; b++) {
        const pt = curve.getPointAt(0.32 + b * 0.22);
        const band = new THREE.Mesh(bandGeo, goldGearMat);
        band.position.copy(pt);
        band.rotation.x = Math.PI / 3;
        band.rotation.y = side * 0.4;
        band.scale.setScalar(1 - b * 0.22);
        hg.add(band);
      }

      const subHorn = new THREE.Mesh(track(new THREE.ConeGeometry(0.042, 0.28, 6)), hornMat);
      subHorn.position.set(side * 0.21, 0.18, -0.08);
      subHorn.rotation.set(-0.85, 0, -side * 0.52);
      hg.add(subHorn);
      return hg;
    };
    hornGroup.add(buildCurvedHorn(-1), buildCurvedHorn(1));

    // Upper Serrated Canine & Molar Fangs
    const fangGeo = track(new THREE.ConeGeometry(0.018, 0.074, 5));
    for (let f = 0; f < 5; f++) {
      const fz = 0.23 + f * 0.082;
      const fx = 0.125 - f * 0.014;
      const scaleH = f === 3 ? 1.25 : 0.88;
      for (const side of [-1, 1] as const) {
        const fang = new THREE.Mesh(fangGeo, fangMat);
        fang.position.set(side * fx, -0.022, fz);
        fang.rotation.x = Math.PI;
        fang.scale.setScalar(scaleH);
        headGroup.add(fang);
      }
    }

    // Inner Glowing Maw Throat Core
    const mawCore = new THREE.Mesh(track(new THREE.SphereGeometry(0.11, 12, 10)), mawGlowMat);
    mawCore.position.set(0, -0.03, 0.26);
    mawCore.scale.set(0.85, 0.55, 1.38);
    headGroup.add(mawCore);

    // Articulated Sculpted Lower Mandible + Chin Spike + Lower Fangs
    const jawPivot = new THREE.Group();
    jawPivot.position.set(0, -0.04, 0.08);
    headGroup.add(jawPivot);

    const lowerJawMesh = new THREE.Mesh(track(buildSculptedMandibleGeometry()), scaleMat);
    lowerJawMesh.castShadow = true;
    jawPivot.add(lowerJawMesh);

    const chinSpike = new THREE.Mesh(track(new THREE.ConeGeometry(0.036, 0.17, 5)), hornMat);
    chinSpike.position.set(0, -0.08, 0.40);
    chinSpike.rotation.x = Math.PI * 0.72;
    jawPivot.add(chinSpike);

    for (let lf = 0; lf < 4; lf++) {
      const fz = 0.16 + lf * 0.085;
      const fx = 0.095 - lf * 0.013;
      for (const side of [-1, 1] as const) {
        const lFang = new THREE.Mesh(fangGeo, fangMat);
        lFang.position.set(side * fx, 0.022, fz);
        lFang.scale.setScalar(lf === 3 ? 1.15 : 0.8);
        jawPivot.add(lFang);
      }
    }

    // Roaring Elemental Breath Mist Cone
    const breathMat = track(
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    const breathCone = new THREE.Mesh(track(new THREE.ConeGeometry(0.28, 1.05, 12, 1, true)), breathMat);
    breathCone.rotation.x = -Math.PI / 2;
    breathCone.position.set(0, -0.02, 0.92);
    headGroup.add(breathCone);

    // --- 4. FOUR SCULPTED SEAMLESS MUSCLE-CONTOURED CLAWED LIMBS ---
    const jointSphereGeo = track(new THREE.SphereGeometry(1, 12, 10));

    const buildForelimb = (side: -1 | 1) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.30, 0.88, 0.22);

      // Sculpted Deltoid Shoulder Ball bridging torso ribcage into upper arm
      const shoulderMuscle = new THREE.Mesh(jointSphereGeo, scaleHighlightMat);
      shoulderMuscle.position.set(-side * 0.03, 0.03, 0.0);
      shoulderMuscle.scale.set(0.20, 0.22, 0.22);
      shoulderMuscle.castShadow = true;
      shoulder.add(shoulderMuscle);

      const upperArmCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-side * 0.08, 0.06, 0.02),
        new THREE.Vector3(side * 0.06, -0.08, -0.02),
        new THREE.Vector3(side * 0.12, -0.24, -0.06),
        new THREE.Vector3(side * 0.14, -0.41, -0.09),
      ]);
      const upperArmGeo = track(
        buildTaperedCurveGeometry(
          upperArmCurve,
          12,
          12,
          (t) => 0.195 * (1 - t * 0.42) + Math.sin(t * Math.PI) * 0.032,
          0.92,
          1.12
        )
      );
      const upperArm = new THREE.Mesh(upperArmGeo, scaleMat);
      upperArm.castShadow = true;
      shoulder.add(upperArm);

      const elbowSpur = new THREE.Mesh(track(new THREE.ConeGeometry(0.042, 0.22, 5)), hornMat);
      elbowSpur.position.set(side * 0.15, -0.40, -0.18);
      elbowSpur.rotation.x = -Math.PI * 0.68;
      shoulder.add(elbowSpur);

      const forearmPivot = new THREE.Group();
      forearmPivot.position.set(side * 0.14, -0.41, -0.09);
      shoulder.add(forearmPivot);

      // Rounded Elbow Joint bridging upper arm and forearm seamlessly
      const elbowJoint = new THREE.Mesh(jointSphereGeo, scaleMat);
      elbowJoint.scale.set(0.115, 0.115, 0.115);
      forearmPivot.add(elbowJoint);

      const forearmCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.02, 0),
        new THREE.Vector3(-side * 0.02, -0.19, 0.17),
        new THREE.Vector3(-side * 0.05, -0.42, 0.34),
      ]);
      const forearmGeo = track(
        buildTaperedCurveGeometry(
          forearmCurve,
          12,
          12,
          (t) => 0.115 * (1 - t * 0.26) + Math.sin(t * Math.PI) * 0.024,
          0.95,
          1.05
        )
      );
      const forearm = new THREE.Mesh(forearmGeo, scaleHighlightMat);
      forearm.castShadow = true;
      forearmPivot.add(forearm);

      const paw = new THREE.Group();
      paw.position.set(-side * 0.05, -0.42, 0.34);

      const wristJoint = new THREE.Mesh(jointSphereGeo, scaleMat);
      wristJoint.position.set(0, 0.02, 0);
      wristJoint.scale.set(0.095, 0.085, 0.095);
      paw.add(wristJoint);

      const palm = new THREE.Mesh(track(new THREE.DodecahedronGeometry(0.12, 1)), scaleMat);
      palm.scale.set(1.18, 0.46, 1.28);
      paw.add(palm);

      const talonGeo = track(new THREE.ConeGeometry(0.026, 0.16, 5));
      for (let t = -1; t <= 1; t++) {
        const toeCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(t * 0.036, 0.005, 0.02),
          new THREE.Vector3(t * 0.068, -0.012, 0.11),
          new THREE.Vector3(t * 0.082, -0.024, 0.17),
        ]);
        const toe = new THREE.Mesh(
          track(buildTaperedCurveGeometry(toeCurve, 7, 7, (u) => 0.038 * (1 - u * 0.36))),
          scaleMat
        );
        const talon = new THREE.Mesh(talonGeo, hornMat);
        talon.position.set(t * 0.088, -0.032, 0.21);
        talon.rotation.x = Math.PI * 0.62;
        talon.rotation.z = -t * 0.22;
        paw.add(toe, talon);
      }
      // Rear dewclaw spur anchored cleanly into wrist heel
      const dewClaw = new THREE.Mesh(talonGeo, hornMat);
      dewClaw.position.set(-side * 0.07, -0.015, -0.06);
      dewClaw.rotation.x = -Math.PI * 0.55;
      paw.add(dewClaw);
      forearmPivot.add(paw);

      return { shoulder, forearmPivot };
    };

    const foreL = buildForelimb(-1);
    const foreR = buildForelimb(1);
    rigPivot.add(foreL.shoulder, foreR.shoulder);

    const buildHindlimb = (side: -1 | 1) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.22, 0.63, -0.44);

      // Muscular Pelvic Thigh Haunch bridging torso rump seamlessly into hind leg
      const hipHaunch = new THREE.Mesh(jointSphereGeo, scaleHighlightMat);
      hipHaunch.position.set(side * 0.02, 0.01, -0.02);
      hipHaunch.scale.set(0.22, 0.24, 0.25);
      hipHaunch.castShadow = true;
      hip.add(hipHaunch);

      const legCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-side * 0.06, 0.05, 0.03),
        new THREE.Vector3(side * 0.11, -0.04, 0.01),
        new THREE.Vector3(side * 0.15, -0.23, -0.18),
        new THREE.Vector3(side * 0.15, -0.43, -0.12),
        new THREE.Vector3(side * 0.15, -0.58, 0.06),
      ]);
      const legGeo = track(
        buildTaperedCurveGeometry(
          legCurve,
          20,
          12,
          (t) =>
            t < 0.45
              ? 0.22 * (1 - t * 0.85) + Math.sin(t * Math.PI * 2) * 0.032
              : 0.10 - (t - 0.45) * 0.035,
          0.88,
          1.12
        )
      );
      const hindLegMesh = new THREE.Mesh(legGeo, scaleMat);
      hindLegMesh.castShadow = true;
      hip.add(hindLegMesh);

      const kneeSpur = new THREE.Mesh(track(new THREE.ConeGeometry(0.04, 0.19, 5)), hornMat);
      kneeSpur.position.set(side * 0.14, 0.04, 0.20);
      kneeSpur.rotation.x = 0.65;
      hip.add(kneeSpur);

      const calcaneusSpur = new THREE.Mesh(track(new THREE.ConeGeometry(0.032, 0.16, 5)), hornMat);
      calcaneusSpur.position.set(side * 0.15, -0.40, -0.22);
      calcaneusSpur.rotation.x = -Math.PI * 0.65;
      hip.add(calcaneusSpur);

      const hindPaw = new THREE.Group();
      hindPaw.position.set(side * 0.15, -0.58, 0.06);

      const ankleJoint = new THREE.Mesh(jointSphereGeo, scaleMat);
      ankleJoint.position.set(0, 0.02, 0);
      ankleJoint.scale.set(0.09, 0.085, 0.09);
      hindPaw.add(ankleJoint);

      const hPalm = new THREE.Mesh(track(new THREE.DodecahedronGeometry(0.115, 1)), scaleMat);
      hPalm.scale.set(1.12, 0.46, 1.26);
      hindPaw.add(hPalm);

      const talonGeo = track(new THREE.ConeGeometry(0.025, 0.155, 5));
      for (let t = -1; t <= 1; t++) {
        const hToeCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(t * 0.034, 0.005, 0.02),
          new THREE.Vector3(t * 0.058, -0.012, 0.11),
          new THREE.Vector3(t * 0.072, -0.022, 0.165),
        ]);
        const hToe = new THREE.Mesh(
          track(buildTaperedCurveGeometry(hToeCurve, 7, 7, (u) => 0.036 * (1 - u * 0.36))),
          scaleMat
        );
        const talon = new THREE.Mesh(talonGeo, hornMat);
        talon.position.set(t * 0.078, -0.030, 0.20);
        talon.rotation.x = Math.PI * 0.62;
        talon.rotation.z = -t * 0.2;
        hindPaw.add(hToe, talon);
      }
      hip.add(hindPaw);

      return hip;
    };

    rigPivot.add(buildHindlimb(-1), buildHindlimb(1));

    // --- 5. SWEEPING SPIKED DRAGON TAIL (pivots directly from muscular rump socket) ---
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.60, -0.50);
    rigPivot.add(tailPivot);

    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.01, 0.06),
      new THREE.Vector3(0.02, -0.03, -0.12),
      new THREE.Vector3(0.28, -0.24, -0.48),
      new THREE.Vector3(0.76, -0.44, -0.46),
      new THREE.Vector3(0.98, -0.48, 0.04),
      new THREE.Vector3(0.84, -0.42, 0.52),
    ]);
    const tailGeo = track(
      buildTaperedCurveGeometry(tailCurve, 30, 14, (t) => 0.255 * Math.pow(1 - t * 0.87, 0.85))
    );
    const tailMesh = new THREE.Mesh(tailGeo, scaleMat);
    tailMesh.castShadow = true;
    tailPivot.add(tailMesh);

    const tailSpineGeo = track(new THREE.ConeGeometry(0.045, 0.19, 4));
    for (let ts = 0; ts < 10; ts++) {
      const t = 0.14 + (ts / 10) * 0.78;
      const pt = tailCurve.getPointAt(t);
      const tang = tailCurve.getTangentAt(t);
      const tSpike = new THREE.Mesh(tailSpineGeo, hornMat);
      tSpike.position.set(pt.x, pt.y + 0.11 * (1 - t * 0.55), pt.z);
      tSpike.rotation.set(-0.35, Math.atan2(tang.x, tang.z), -0.2);
      tSpike.scale.setScalar(1 - t * 0.45);
      tailPivot.add(tSpike);
    }

    const tailEnd = tailCurve.getPointAt(1);
    const tailTan = tailCurve.getTangentAt(1);
    const tailBlade = new THREE.Mesh(track(new THREE.ConeGeometry(0.088, 0.34, 4)), hornMat);
    tailBlade.position.copy(tailEnd).addScaledVector(tailTan, 0.11);
    tailBlade.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tailTan);
    tailBlade.scale.set(0.45, 1, 1.35);
    tailPivot.add(tailBlade);

    // --- 6. EPIC ARTICULATED BAT-WINGS + HOOKED THUMB CLAWS ---
    const membraneGeoL = track(buildWingMembraneGeometry(-1));
    const membraneGeoR = track(buildWingMembraneGeometry(1));

    const buildWing = (side: -1 | 1) => {
      const shoulderPivot = new THREE.Group();
      shoulderPivot.position.set(side * 0.25, 1.06, -0.02);

      // Scapula Wing Socket connecting shoulder into upper back spine
      const wingShoulderSocket = new THREE.Mesh(jointSphereGeo, scaleHighlightMat);
      wingShoulderSocket.position.set(-side * 0.04, -0.02, 0.01);
      wingShoulderSocket.scale.set(0.14, 0.13, 0.14);
      shoulderPivot.add(wingShoulderSocket);

      const armCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-side * 0.10, -0.03, 0.01),
        new THREE.Vector3(side * 0.12, 0.06, -0.04),
        new THREE.Vector3(side * 0.42, 0.26, -0.17),
        new THREE.Vector3(side * 0.68, 0.72, -0.10),
      ]);
      const armGeo = track(buildTaperedCurveGeometry(armCurve, 14, 10, (t) => 0.102 - t * 0.032));
      const armMesh = new THREE.Mesh(armGeo, scaleHighlightMat);
      armMesh.castShadow = true;
      shoulderPivot.add(armMesh);

      const outerPivot = new THREE.Group();
      outerPivot.position.set(side * 0.68, 0.72, -0.10);
      shoulderPivot.add(outerPivot);

      // Solid Wing Wrist Joint connecting wing arm into hand/finger rays
      const wingWristJoint = new THREE.Mesh(jointSphereGeo, scaleHighlightMat);
      wingWristJoint.scale.set(0.088, 0.088, 0.088);
      outerPivot.add(wingWristJoint);

      const thumbClaw = new THREE.Mesh(track(new THREE.ConeGeometry(0.046, 0.25, 6)), hornMat);
      thumbClaw.position.set(side * 0.04, 0.13, 0.06);
      thumbClaw.rotation.set(0.35, 0, -side * 0.72);
      outerPivot.add(thumbClaw);

      const fingerTips = [
        new THREE.Vector3(side * 1.18, 0.24, -0.14),
        new THREE.Vector3(side * 1.24, -0.48, -0.22),
        new THREE.Vector3(side * 0.84, -0.98, -0.24),
        new THREE.Vector3(side * 0.26, -1.16, -0.18),
      ];
      fingerTips.forEach((tip, idx) => {
        const fCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(tip.x * 0.52, tip.y * 0.45 + 0.06, tip.z * 0.5),
          tip,
        ]);
        const fGeo = track(
          buildTaperedCurveGeometry(fCurve, 9, 7, (t) => (idx === 0 ? 0.048 : 0.032) * (1 - t * 0.72))
        );
        const fMesh = new THREE.Mesh(fGeo, scaleMat);
        fMesh.castShadow = true;
        outerPivot.add(fMesh);

        if (idx < 2) {
          const tipClaw = new THREE.Mesh(track(new THREE.ConeGeometry(0.022, 0.15, 5)), hornMat);
          tipClaw.position.copy(tip).add(new THREE.Vector3(side * 0.03, -0.04, 0));
          tipClaw.rotation.z = -side * Math.PI * 0.82;
          outerPivot.add(tipClaw);
        }
      });

      const wingMemGeo = side === -1 ? membraneGeoL : membraneGeoR;
      const membrane = new THREE.Mesh(wingMemGeo, wingMat);
      membrane.castShadow = tier === 'HIGH';
      outerPivot.add(membrane);

      // Physical Brushed-Steel & Gold Wing-Armor Spar Trim (replaces glowing translucent overlay)
      const stormBlade = new THREE.Group();
      const sparArmorCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.02, 0.02),
        new THREE.Vector3(side * 0.62, 0.14, -0.05),
        new THREE.Vector3(side * 1.18, 0.24, -0.12),
      ]);
      const sparArmorMesh = new THREE.Mesh(
        track(buildTaperedCurveGeometry(sparArmorCurve, 10, 6, (t) => 0.044 * (1 - t * 0.55))),
        steelGearMat
      );
      const wristBuckler = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.085, 0)), goldGearMat);
      wristBuckler.scale.set(0.75, 1.25, 0.5);
      wristBuckler.position.set(side * 0.04, 0.04, 0.04);
      stormBlade.add(sparArmorMesh, wristBuckler);
      outerPivot.add(stormBlade);

      return { shoulderPivot, outerPivot, stormBlade };
    };

    const wingL = buildWing(-1);
    const wingR = buildWing(1);
    rigPivot.add(wingL.shoulderPivot, wingR.shoulderPivot);

    // --- 7. EQUIPPED DRAGON GEAR ATTACHMENTS ---
    const crownGroup = new THREE.Group();
    const crownBand = new THREE.Mesh(track(new THREE.TorusGeometry(0.16, 0.03, 8, 20)), goldGearMat);
    crownBand.rotation.x = Math.PI / 2;
    crownGroup.add(crownBand);
    for (let c = 0; c < 5; c++) {
      const ang = (c / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(track(new THREE.ConeGeometry(0.035, 0.14, 5)), goldGearMat);
      spike.position.set(Math.cos(ang) * 0.15, 0.075, Math.sin(ang) * 0.15);
      crownGroup.add(spike);
    }
    crownGroup.position.set(0, 0.24, 0.08);
    headGroup.add(crownGroup);

    const helmetGroup = new THREE.Group();
    const helmPlate = new THREE.Mesh(track(new THREE.CylinderGeometry(0.13, 0.17, 0.28, 6)), steelGearMat);
    helmPlate.rotation.x = Math.PI / 2 - 0.16;
    helmPlate.scale.set(1.02, 1, 0.52);
    helmPlate.position.set(0, 0.205, 0.12);
    const helmFin = new THREE.Mesh(track(new THREE.BoxGeometry(0.04, 0.16, 0.32)), goldGearMat);
    helmFin.position.set(0, 0.275, 0.08);
    helmetGroup.add(helmPlate, helmFin);
    headGroup.add(helmetGroup);

    const shadesGroup = new THREE.Group();
    const visorBar = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.22, 0.20, 0.09, 12, 1, true, -Math.PI * 0.42, Math.PI * 0.84)),
      track(
        new THREE.MeshPhysicalMaterial({
          color: 0x090d16,
          emissive: 0xf97316,
          emissiveIntensity: 0.45,
          roughness: 0.08,
          metalness: 0.9,
          clearcoat: 1.0,
          side: THREE.DoubleSide,
        })
      )
    );
    visorBar.position.set(0, 0.09, 0.14);
    shadesGroup.add(visorBar);
    headGroup.add(shadesGroup);

    // =========================================================================
    // 8. STRICTLY ISOLATED EXTERNAL VFX LAYER (Outer Backdrop & Pedestal Rim)
    // Never intersects, overlaps foreground, or dyes the physical dragon body
    // =========================================================================
    const externalVfxGroup = new THREE.Group();
    scene.add(externalVfxGroup);

    // Grounded Pedestal Perimeter Rune & Star Rings (y = 0.28 around crag base)
    const starOrbitGroup = new THREE.Group();
    starOrbitGroup.position.set(0, 0.28, 0);
    externalVfxGroup.add(starOrbitGroup);

    const orbitRing = new THREE.Mesh(track(new THREE.TorusGeometry(1.48, 0.016, 8, 52)), runeFissureMat);
    orbitRing.rotation.x = Math.PI / 2;
    orbitRing.layers.enable(1);
    starOrbitGroup.add(orbitRing);

    const astralRing = new THREE.Mesh(track(new THREE.TorusGeometry(1.74, 0.013, 8, 56)), goldGearMat);
    astralRing.rotation.x = Math.PI / 2;
    astralRing.position.y = 0.04;
    astralRing.visible = false;
    astralRing.layers.enable(1);
    starOrbitGroup.add(astralRing);

    // Rear Background Apex Halo (z = -1.35 behind dragon silhouette)
    const apexHaloGroup = new THREE.Group();
    const apexHaloRing = new THREE.Mesh(track(new THREE.TorusGeometry(0.68, 0.02, 8, 36)), goldGearMat);
    apexHaloGroup.add(apexHaloRing);
    for (let h = 0; h < 6; h++) {
      const a = (h / 6) * Math.PI * 2;
      const ray = new THREE.Mesh(track(new THREE.ConeGeometry(0.028, 0.16, 4)), goldGearMat);
      ray.position.set(Math.cos(a) * 0.76, Math.sin(a) * 0.76, 0);
      ray.rotation.z = a - Math.PI / 2;
      apexHaloGroup.add(ray);
    }
    apexHaloGroup.position.set(0, 2.08, -1.35);
    apexHaloGroup.visible = false;
    externalVfxGroup.add(apexHaloGroup);

    const starSatellites: THREE.Mesh[] = [];
    const satGeo = track(new THREE.OctahedronGeometry(0.072, 0));
    for (let i = 0; i < 6; i++) {
      const sat = new THREE.Mesh(satGeo, goldGearMat);
      const a = (i / 6) * Math.PI * 2;
      sat.position.set(Math.cos(a) * 1.48, 0.08, Math.sin(a) * 1.48);
      sat.layers.enable(1);
      starOrbitGroup.add(sat);
      starSatellites.push(sat);
    }

    // --- 9. ELEMENT-SPECIFIC EXTERNAL PARTICLES (Strict Rear/Outer Exclusion Zone) ---
    const particleCount = tier === 'HIGH' ? 84 : tier === 'MEDIUM' ? 48 : 24;
    const pPositions = new Float32Array(particleCount * 3);
    const pVelocities = new Float32Array(particleCount * 3);
    const pLife = new Float32Array(particleCount);

    const placeParticleInOuterZone = (idx: number, seed: number, element: ElementKind) => {
      // Strictly behind the dragon (z <= -1.05) OR on outer backdrop flanks (|x| >= 1.65, z <= 0.35)
      const isRearZone = idx % 3 !== 0;
      let px: number;
      let pz: number;
      if (isRearZone) {
        px = (Math.sin(seed * 19.7 + idx * 1.73) * 0.5 + 0) * 4.4;
        pz = -1.05 - Math.abs(Math.cos(seed * 13.1 + idx * 2.41)) * 1.65;
      } else {
        const sideSign = idx % 2 === 0 ? 1 : -1;
        px = sideSign * (1.68 + Math.abs(Math.sin(seed * 11.3 + idx * 3.17)) * 0.85);
        pz = -1.35 + ((Math.cos(seed * 7.9 + idx * 1.91) + 1) * 0.5) * 1.6;
      }
      const py = element === 'frost' ? 2.45 + ((idx * 0.17 + seed) % 0.75) : 0.22 + ((idx * 0.19 + seed) % 0.65);

      pPositions[idx * 3] = px;
      pPositions[idx * 3 + 1] = py;
      pPositions[idx * 3 + 2] = pz;

      if (element === 'frost') {
        // Gentle drifting snow crystals falling downward
        pVelocities[idx * 3] = Math.sin(idx * 2.1 + seed) * 0.16;
        pVelocities[idx * 3 + 1] = -(0.28 + ((idx * 7) % 5) * 0.07);
        pVelocities[idx * 3 + 2] = Math.cos(idx * 1.7 + seed) * 0.08;
      } else if (element === 'storm') {
        // Crisp flickering backdrop sparks
        pVelocities[idx * 3] = Math.sin(idx * 3.3 + seed) * 0.26;
        pVelocities[idx * 3 + 1] = 0.25 + ((idx * 5) % 6) * 0.12;
        pVelocities[idx * 3 + 2] = Math.cos(idx * 2.7 + seed) * 0.12;
      } else {
        // Rising crisp ember flecks
        pVelocities[idx * 3] = Math.sin(idx * 2.5 + seed) * 0.2;
        pVelocities[idx * 3 + 1] = 0.42 + ((idx * 7) % 6) * 0.11;
        pVelocities[idx * 3 + 2] = Math.cos(idx * 1.9 + seed) * 0.1;
      }
    };

    const initialPal = SKIN_3D_PALETTES[skin] ?? SKIN_3D_PALETTES.aqua;
    for (let i = 0; i < particleCount; i++) {
      placeParticleInOuterZone(i, i * 0.37, initialPal.element);
      pPositions[i * 3 + 1] = 0.2 + Math.random() * 2.65;
      pLife[i] = Math.random();
    }

    const particleGeo = track(new THREE.BufferGeometry());
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const particleMat = track(
      new THREE.PointsMaterial({
        color: 0xe0f2fe,
        map: snowCrystalTex,
        size: 0.14,
        transparent: true,
        opacity: 0.82,
        alphaTest: 0.08,
        blending: THREE.NormalBlending,
        depthWrite: false,
      })
    );
    const emberPoints = new THREE.Points(particleGeo, particleMat);
    externalVfxGroup.add(emberPoints);

    // --- 10. OUTER PERIMETER / BACKGROUND LIGHTNING BOLTS ---
    // Strictly framed behind & around the crag perimeter (never crossing dragon torso/head)
    const boltAnchors: Array<[number, number, number, number, number, number]> = [
      [-2.05, 2.85, -1.55, -1.55, 0.32, -0.95],
      [2.05, 2.85, -1.55, 1.55, 0.32, -0.95],
      [-1.85, 2.45, -1.75, -0.65, 3.05, -2.05],
      [1.85, 2.45, -1.75, 0.65, 3.05, -2.05],
      [-1.78, 0.85, -0.65, -1.32, 0.16, 0.22],
      [1.78, 0.85, -0.65, 1.32, 0.16, 0.22],
      [-1.05, 2.75, -1.95, 1.05, 2.75, -1.95],
    ];
    const segsPerBolt = 6;
    const boltVertices = new Float32Array(boltAnchors.length * segsPerBolt * 2 * 3);
    const boltGeo = track(new THREE.BufferGeometry());
    boltGeo.setAttribute('position', new THREE.BufferAttribute(boltVertices, 3));
    const boltMat = track(
      new THREE.LineBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
      })
    );
    const lightningLines = new THREE.LineSegments(boltGeo, boltMat);
    externalVfxGroup.add(lightningLines);

    // Pre-allocated math helpers (Zero GC inside render loop)
    const _colorA = new THREE.Color();
    const _colorB = new THREE.Color();
    let lastSkinSynced: DuckSkinId | null = null;
    let lastAuraSynced: DuckAuraId | null = null;
    let lastLightningSeedTime = -1;

    const clock = new THREE.Clock();
    let frameId = 0;
    let slowFrames = 0;
    let disposed = false;

    const refreshLightningBolts = (tSeed: number) => {
      const attr = boltGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      let ptr = 0;

      for (let b = 0; b < boltAnchors.length; b++) {
        const [sx, sy, sz, ex, ey, ez] = boltAnchors[b];
        let px = sx;
        let py = sy;
        let pz = sz;

        for (let s = 1; s <= segsPerBolt; s++) {
          const frac = s / segsPerBolt;
          const fade = Math.sin(frac * Math.PI);
          const h1 = Math.sin(tSeed * 37.3 + b * 11.7 + s * 5.3);
          const h2 = Math.cos(tSeed * 29.1 + b * 7.9 + s * 9.7);
          const h3 = Math.sin(tSeed * 43.7 + b * 3.1 + s * 13.1);

          const nx = sx + (ex - sx) * frac + h1 * 0.16 * fade;
          const ny = sy + (ey - sy) * frac + h2 * 0.15 * fade;
          const nz = sz + (ez - sz) * frac - Math.abs(h3) * 0.12 * fade;

          arr[ptr++] = px;
          arr[ptr++] = py;
          arr[ptr++] = pz;
          arr[ptr++] = nx;
          arr[ptr++] = ny;
          arr[ptr++] = nz;

          px = nx;
          py = ny;
          pz = nz;
        }
      }
      attr.needsUpdate = true;
    };

    const applySkinAndState = (elapsed: number) => {
      const cur = propsRef.current;
      const pal = SKIN_3D_PALETTES[cur.skin] ?? SKIN_3D_PALETTES.aqua;
      const cLv = clampCustomLevel(cur.customLevel);
      const cLvNorm = cLv * 10; // Map ★0..10 cleanly to visual evolution intensity 0..100
      const starMeta = getStarTierMeta(cLv);
      const pulse = pulseStateRef.current;

      if (lastSkinSynced !== cur.skin || lastAuraSynced !== cur.aura) {
        lastSkinSynced = cur.skin;
        lastAuraSynced = cur.aura;

        scaleMat.color.set(pal.scalePrimary);
        scaleHighlightMat.color.set(pal.scaleSecondary);
        bellyMat.color.set(pal.bellyPlate);
        wingMat.color.set(pal.wingMembrane);
        hornMat.color.set(pal.horn);
        eyeMat.emissive.set(pal.eye);
        mawGlowMat.emissive.set(pal.eye);

        const auraHex =
          cur.aura === 'gold'
            ? '#facc15'
            : cur.aura === 'flame'
              ? '#f97316'
              : cur.aura === 'emerald'
                ? '#34d399'
                : pal.ember;

        runeFissureMat.color.set(auraHex);
        runeFissureMat.emissive.set(auraHex);
        breathMat.color.set(auraHex);
        boltMat.color.set(cur.aura === 'flame' ? '#fb923c' : cur.aura === 'gold' ? '#fde047' : pal.wingVein);
        auraPointLight.color.set(auraHex);

        // Keep crisp neutral-tinted rim edge highlight per element (zero neon body wash)
        dragonShaderUniforms.uRimColor.value.set(
          pal.element === 'frost' ? '#dff2ff' : pal.element === 'storm' ? '#e2e8ff' : '#ffedd5'
        );

        // Configure crisp element-specific external particle sprites (Zero paint-blob splatter)
        if (pal.element === 'frost') {
          particleMat.map = snowCrystalTex;
          particleMat.blending = THREE.NormalBlending;
          particleMat.color.set(cur.aura === 'auto' ? '#e0f2fe' : auraHex);
          particleMat.size = tier === 'HIGH' ? 0.13 : 0.15;
          particleMat.opacity = 0.85;
        } else if (pal.element === 'storm') {
          particleMat.map = sparkTex;
          particleMat.blending = THREE.AdditiveBlending;
          particleMat.color.set(cur.aura === 'auto' ? pal.wingVein : auraHex);
          particleMat.size = tier === 'HIGH' ? 0.12 : 0.14;
          particleMat.opacity = 0.9;
        } else {
          particleMat.map = emberFleckTex;
          particleMat.blending = THREE.AdditiveBlending;
          particleMat.color.set(cur.aura === 'auto' ? pal.ember : auraHex);
          particleMat.size = tier === 'HIGH' ? 0.11 : 0.13;
          particleMat.opacity = 0.88;
        }
        particleMat.needsUpdate = true;

        // Re-seed particle motion direction cleanly for the element
        for (let i = 0; i < particleCount; i++) {
          placeParticleInOuterZone(i, elapsed + i * 0.21, pal.element);
          pPositions[i * 3 + 1] = 0.2 + ((i / particleCount) * 2.6);
        }
        (particleGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      }

      const sizeMult = cur.sizeTier === 'XXL' ? 1.18 : cur.sizeTier === 'XL' ? 1.09 : 1.0;
      const evoScale = (0.88 + (cur.level - 1) * 0.06 + (cLv >= 5 ? 0.03 : 0)) * sizeMult;
      const breathSquash = prefersReduced ? 1 : 1 + Math.sin(elapsed * 2.1) * 0.015;
      dragonRoot.scale.set(
        evoScale * (1 + pulse.roarImpulse * 0.045),
        evoScale * breathSquash,
        evoScale * (1 + pulse.roarImpulse * 0.045)
      );

      const hornGrowth = 0.84 + cur.level * 0.11 + (cLv >= 7 ? 0.09 : 0);
      hornGroup.scale.setScalar(hornGrowth);

      const dorsalScale = 0.86 + cur.level * 0.09;
      const showCrestArmor = cLv >= 3;
      dorsalSpikes.forEach((sp, i) => {
        const base = 0.85 + Math.sin((i / 7) * Math.PI) * 0.45;
        sp.scale.set(0.75 * dorsalScale, base * dorsalScale, 1.25 * dorsalScale);
      });
      dorsalCrestPlates.forEach((cp) => {
        cp.visible = showCrestArmor;
      });

      const wingScale = (cur.level >= 2 ? 0.92 + cur.level * 0.075 : 0.78) * (cur.gear === 'wings' ? 1.18 : 1);
      wingL.shoulderPivot.scale.setScalar(wingScale);
      wingR.shoulderPivot.scale.setScalar(wingScale);

      crownGroup.visible = cur.gear === 'crown';
      helmetGroup.visible = cur.gear === 'helmet';
      shadesGroup.visible = cur.gear === 'shades';
      wingL.stormBlade.visible = cur.gear === 'wings';
      wingR.stormBlade.visible = cur.gear === 'wings';

      // Bind Star Evolution Tier Visuals to external pedestal rings & rear halo
      runeFissureMat.emissiveIntensity = 1.15 + Math.min(1.4, cLvNorm * 0.015);

      starOrbitGroup.visible = cLv >= 1;
      if (starOrbitGroup.visible) {
        starOrbitGroup.rotation.y = elapsed * (0.45 + cLv * 0.04);
        const activeSats =
          cLv >= 8 ? 6 : cLv >= 6 ? 5 : cLv >= 4 ? 4 : cLv >= 3 ? 3 : cLv >= 2 ? 2 : 1;
        starSatellites.forEach((sat, idx) => {
          sat.visible = idx < activeSats;
          sat.rotation.y = elapsed * 1.8;
        });
        astralRing.visible = cLv >= 5;
        if (astralRing.visible) {
          astralRing.rotation.z = -elapsed * 0.4;
        }
      }

      apexHaloGroup.visible = cLv >= 10;
      if (apexHaloGroup.visible) {
        apexHaloGroup.rotation.z = elapsed * 0.65;
      }

      if (cLv >= 5 && cur.aura === 'auto') {
        runeFissureMat.emissive.set(starMeta.auraColorHex);
      }

      const showLightning =
        pal.element === 'storm' || cur.isFever || pulse.burstEnergy > 0.25 || cur.gear === 'wings' || cLv >= 5;
      lightningLines.visible = showLightning;
      if (showLightning) {
        boltMat.opacity = cur.isFever || cLv >= 7 ? 0.92 : Math.min(0.9, 0.48 + pulse.burstEnergy * 0.42);
        if (Math.floor(elapsed * 14) !== lastLightningSeedTime) {
          lastLightningSeedTime = Math.floor(elapsed * 14);
          refreshLightningBolts(elapsed);
        }
      }

      // Breath stays OFF at idle so snout & fangs stay 100% sharp; erupts cleanly on Roar/Fever
      const activeRoar = cur.isFever || pulse.roarImpulse > 0.08;
      breathCone.visible = activeRoar;
      const roarIntensity = activeRoar ? Math.min(1.3, (cur.isFever ? 0.65 : 0) + pulse.roarImpulse * 0.9) : 0;
      mawGlowMat.emissiveIntensity = 0.2 + roarIntensity * 2.2;
      if (activeRoar) {
        breathMat.opacity = roarIntensity * 0.44;
        breathCone.scale.set(0.72 + roarIntensity * 0.62, 0.72 + roarIntensity * 0.72, 0.72 + roarIntensity * 0.62);
      }

      // Pedestal Layer-1 Aura Point Light (rock & ground rings only)
      const glowMult = (cur.isFever ? 1.45 : 0.85 + pulse.burstEnergy * 0.4) + Math.min(0.35, cLv * 0.03);
      auraPointLight.intensity = 0.75 * glowMult + Math.sin(elapsed * 3.0) * 0.12;
      _colorA.set(pal.element === 'frost' ? '#e0f2fe' : pal.ember);
      _colorB.set('#f43f5e');
      if (cur.isFever) {
        particleMat.color.lerpColors(_colorA, _colorB, 0.5 + 0.5 * Math.sin(elapsed * 6));
      }
    };

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const stateVal = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (stateVal === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      if (dt > 0.036 && tier !== 'ECO' && !isSoftwareGl) {
        slowFrames++;
        if (slowFrames >= 18) {
          tier = tier === 'HIGH' ? 'MEDIUM' : 'ECO';
          renderer.setPixelRatio(1);
          renderer.shadowMap.enabled = false;
          slowFrames = 0;
        }
      } else {
        slowFrames = Math.max(0, slowFrames - 1);
      }

      const pulse = pulseStateRef.current;
      pulse.roarImpulse = THREE.MathUtils.damp(pulse.roarImpulse, 0, 7.5, dt);
      pulse.burstEnergy = THREE.MathUtils.damp(pulse.burstEnergy, 0, 3.8, dt);
      pulse.cameraShake = THREE.MathUtils.damp(pulse.cameraShake, 0, 12.0, dt);

      if (prefersReduced) {
        pulse.currentParallaxX = 0;
        pulse.currentParallaxY = 0;
      } else {
        pulse.currentParallaxX = THREE.MathUtils.damp(pulse.currentParallaxX, pulse.parallaxX, 5.5, dt);
        pulse.currentParallaxY = THREE.MathUtils.damp(pulse.currentParallaxY, pulse.parallaxY, 5.5, dt);
      }

      if (!pulse.isDragging && performance.now() > pulse.dragHoldUntil) {
        pulse.targetYaw = -0.48 + (prefersReduced ? 0 : Math.sin(elapsed * 0.52) * 0.16);
        pulse.targetPitch = 0;
      }
      pulse.dragYaw = THREE.MathUtils.damp(pulse.dragYaw, pulse.targetYaw, 7, dt);
      pulse.dragPitch = THREE.MathUtils.damp(pulse.dragPitch, pulse.targetPitch, 7, dt);
      rigPivot.rotation.y = pulse.dragYaw;
      rigPivot.rotation.x = pulse.dragPitch;

      // Sync 8D spatial stereo pan (throttled inside soundFX)
      soundFX.setDragonSpatialAngle(pulse.dragYaw);

      // Camera Parallax, Subtle Breathing, Micro Roar Zoom & Controlled Shake
      const camBreathingX = prefersReduced ? 0 : Math.sin(elapsed * 0.42) * 0.05;
      const camBreathingY = prefersReduced ? 0 : Math.cos(elapsed * 0.65) * 0.035;
      const shakeX = prefersReduced ? 0 : (Math.random() - 0.5) * pulse.cameraShake;
      const shakeY = prefersReduced ? 0 : (Math.random() - 0.5) * pulse.cameraShake;

      camera.position.set(
        baseCameraPos.x + pulse.currentParallaxX * 0.28 + camBreathingX + shakeX,
        baseCameraPos.y + pulse.currentParallaxY * 0.18 + camBreathingY + shakeY,
        baseCameraPos.z - pulse.roarImpulse * 0.16
      );
      camera.lookAt(lookTarget);

      const cur = propsRef.current;
      const flapSpeed = cur.isFever ? 6.8 : 2.35 + pulse.burstEnergy * 1.9;
      const flapWave = prefersReduced ? 0 : Math.sin(elapsed * flapSpeed);
      const roarLift = pulse.roarImpulse * 0.22;

      const torsoLiftY = (prefersReduced ? 0 : Math.sin(elapsed * 2.1) * 0.022) + roarLift * 0.14;
      torsoGroup.position.y = torsoLiftY;
      headGroup.position.y = 1.72 + torsoLiftY;
      tailPivot.position.y = 0.60 + torsoLiftY;
      foreL.shoulder.position.y = 0.88 + torsoLiftY * 0.55;
      foreR.shoulder.position.y = 0.88 + torsoLiftY * 0.55;
      wingL.shoulderPivot.position.y = 1.06 + torsoLiftY;
      wingR.shoulderPivot.position.y = 1.06 + torsoLiftY;
      headGroup.rotation.x =
        -0.04 +
        (prefersReduced ? 0 : Math.sin(elapsed * 1.9) * 0.055) -
        pulse.roarImpulse * 0.28 +
        pulse.currentParallaxY * 0.12;
      headGroup.rotation.y =
        (prefersReduced ? 0 : Math.sin(elapsed * 0.85) * 0.08) + pulse.currentParallaxX * 0.22;
      jawPivot.rotation.x =
        0.22 +
        (prefersReduced ? 0 : Math.max(0, Math.sin(elapsed * 2.1)) * 0.08) +
        pulse.roarImpulse * 0.42 +
        (cur.isFever ? 0.18 : 0);

      foreL.shoulder.rotation.x = -pulse.roarImpulse * 0.34;
      foreL.forearmPivot.rotation.x = -pulse.roarImpulse * 0.28;
      foreR.shoulder.rotation.x = -pulse.roarImpulse * 0.28;
      foreR.forearmPivot.rotation.x = -pulse.roarImpulse * 0.22;

      const flare = pulse.roarImpulse * 0.26;
      wingL.shoulderPivot.rotation.y = 0.36 + flapWave * 0.18 + flare;
      wingL.shoulderPivot.rotation.z = -0.06 + flapWave * 0.14;
      wingL.outerPivot.rotation.y = 0.14 + flapWave * 0.14;

      wingR.shoulderPivot.rotation.y = -0.36 - flapWave * 0.18 - flare;
      wingR.shoulderPivot.rotation.z = 0.06 - flapWave * 0.14;
      wingR.outerPivot.rotation.y = -0.14 - flapWave * 0.14;

      tailPivot.rotation.y = prefersReduced ? 0 : Math.sin(elapsed * 1.65) * 0.075;

      applySkinAndState(elapsed);

      const activePal = SKIN_3D_PALETTES[cur.skin] ?? SKIN_3D_PALETTES.aqua;
      const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const speedMult = (cur.isFever ? 1.9 : 1) + pulse.burstEnergy * 1.1;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        arr[idx] += pVelocities[idx] * dt * speedMult;
        arr[idx + 1] += pVelocities[idx + 1] * dt * speedMult;
        arr[idx + 2] += pVelocities[idx + 2] * dt * speedMult;
        pLife[i] += dt * (0.34 + pulse.burstEnergy * 0.25);

        const px = arr[idx];
        const py = arr[idx + 1];
        const pz = arr[idx + 2];
        const insideDragonZone = Math.hypot(px, pz) < 1.58 && pz > -0.95;
        const outOfBounds = py > 3.1 || py < 0.12;

        if (pLife[i] >= 1 || outOfBounds || insideDragonZone) {
          placeParticleInOuterZone(i, elapsed + i * 0.13, activePal.element);
          pLife[i] = 0;
        }
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);

      if (isSoftwareGl || prefersReduced) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (!isSoftwareGl && tier === 'HIGH') {
      renderer.compile(scene, camera);
    }
    tick();

    let lastW = width;
    let lastH = height;
    let resizeRaf = 0;

    const applyResize = () => {
      resizeRaf = 0;
      if (!container || disposed) return;
      const w = Math.max(220, container.clientWidth);
      const h = Math.max(220, container.clientHeight);
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    const scheduleResize = () => {
      if (resizeRaf || disposed) return;
      resizeRaf = requestAnimationFrame(applyResize);
    };

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleResize) : null;
    ro?.observe(container);
    window.addEventListener('resize', scheduleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      cancelAnimationFrame(resizeRaf);
      clearTimeout(frameId);
      ro?.disconnect();
      window.removeEventListener('resize', scheduleResize);
      canvasEl.removeEventListener('webglcontextlost', onContextLost);
      canvasEl.removeEventListener('webglcontextrestored', onContextRestored);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    };
  }, []);

  if (webglFailed) {
    return (
      <button
        type="button"
        onClick={(e) => onTapStage(e.clientX, e.clientY)}
        className="relative w-full h-full flex items-center justify-center cursor-pointer select-none focus:outline-none"
      >
        <DragonIllustration
          skin={skin}
          level={level}
          customLevel={customLevel}
          gear={gear}
          aura={aura}
          showEvolutionEffects={true}
          mood={isFever ? 'fever' : 'idle'}
          className="w-48 h-48 sm:w-56 sm:h-56"
        />
      </button>
    );
  }

  return (
    <div
      className="relative w-full h-full select-none touch-pan-y cursor-pointer"
      onPointerDown={(e) => {
        pulseStateRef.current.isDragging = true;
        pulseStateRef.current.lastPointerX = e.clientX;
        pulseStateRef.current.lastPointerY = e.clientY;
        pulseStateRef.current.downPointerX = e.clientX;
        pulseStateRef.current.downPointerY = e.clientY;
      }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const w = rect.width || 1;
        const h = rect.height || 1;
        pulseStateRef.current.parallaxX = THREE.MathUtils.clamp(((e.clientX - rect.left) / w) * 2 - 1, -1, 1);
        pulseStateRef.current.parallaxY = THREE.MathUtils.clamp(-(((e.clientY - rect.top) / h) * 2 - 1), -1, 1);

        if (!pulseStateRef.current.isDragging) return;
        const dx = e.clientX - pulseStateRef.current.lastPointerX;
        const dy = e.clientY - pulseStateRef.current.lastPointerY;
        pulseStateRef.current.lastPointerX = e.clientX;
        pulseStateRef.current.lastPointerY = e.clientY;
        pulseStateRef.current.targetYaw += dx * 0.013;
        pulseStateRef.current.targetPitch = THREE.MathUtils.clamp(
          pulseStateRef.current.targetPitch + dy * 0.005,
          -0.25,
          0.25
        );
      }}
      onPointerUp={(e) => {
        const moved = Math.hypot(
          e.clientX - pulseStateRef.current.downPointerX,
          e.clientY - pulseStateRef.current.downPointerY
        );
        pulseStateRef.current.isDragging = false;
        if (moved >= 12) {
          pulseStateRef.current.dragHoldUntil = performance.now() + 2600;
        } else {
          onTapStage(e.clientX, e.clientY);
        }
      }}
      onPointerLeave={() => {
        if (pulseStateRef.current.isDragging) {
          pulseStateRef.current.dragHoldUntil = performance.now() + 2200;
        }
        pulseStateRef.current.isDragging = false;
        pulseStateRef.current.parallaxX = 0;
        pulseStateRef.current.parallaxY = 0;
      }}
      onPointerCancel={() => {
        pulseStateRef.current.isDragging = false;
        pulseStateRef.current.parallaxX = 0;
        pulseStateRef.current.parallaxY = 0;
      }}
    >
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
};
