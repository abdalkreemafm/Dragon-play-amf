import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DuckAuraId, DuckGearId, DuckSkinId, Rarity } from '../../types/game';
import { soundFX } from '../../utils/sound';
import { DragonIllustration } from './DuckArt';

export interface Dragon3DStageProps {
  skin: DuckSkinId;
  rarity: Rarity;
  level: number;
  customLevel: number;
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
    scalePrimary: '#36586b',
    scaleSecondary: '#67b7d1',
    bellyPlate: '#99d5e8',
    wingMembrane: '#1c4459',
    wingVein: '#67e8f9',
    horn: '#cbd5e1',
    eye: '#38bdf8',
    ember: '#67e8f9',
    element: 'frost',
  },
  bride: {
    scalePrimary: '#64748b',
    scaleSecondary: '#cbd5e1',
    bellyPlate: '#e2e8f0',
    wingMembrane: '#334155',
    wingVein: '#bae6fd',
    horn: '#e0f2fe',
    eye: '#7dd3fc',
    ember: '#bae6fd',
    element: 'frost',
  },
  cool: {
    scalePrimary: '#1e3a6d',
    scaleSecondary: '#3b82f6',
    bellyPlate: '#93c5fd',
    wingMembrane: '#172554',
    wingVein: '#60a5fa',
    horn: '#cbd5e1',
    eye: '#38bdf8',
    ember: '#60a5fa',
    element: 'frost',
  },
  dj: {
    scalePrimary: '#1a202c',
    scaleSecondary: '#334155',
    bellyPlate: '#475569',
    wingMembrane: '#1e293b',
    wingVein: '#38bdf8',
    horn: '#1e293b',
    eye: '#38bdf8',
    ember: '#38bdf8',
    element: 'storm',
  },
  skeleton: {
    scalePrimary: '#334155',
    scaleSecondary: '#94a3b8',
    bellyPlate: '#cbd5e1',
    wingMembrane: '#0f172a',
    wingVein: '#22d3ee',
    horn: '#e2e8f0',
    eye: '#22d3ee',
    ember: '#22d3ee',
    element: 'storm',
  },
  ninja: {
    scalePrimary: '#111827',
    scaleSecondary: '#1f2937',
    bellyPlate: '#374151',
    wingMembrane: '#18181b',
    wingVein: '#f43f5e',
    horn: '#3f3f46',
    eye: '#fb7185',
    ember: '#f43f5e',
    element: 'storm',
  },
  gamer: {
    scalePrimary: '#064e3b',
    scaleSecondary: '#10b981',
    bellyPlate: '#6ee7b7',
    wingMembrane: '#022c22',
    wingVein: '#34d399',
    horn: '#365314',
    eye: '#4ade80',
    ember: '#34d399',
    element: 'storm',
  },
  classic: {
    scalePrimary: '#1f3338',
    scaleSecondary: '#47554f',
    bellyPlate: '#64594d',
    wingMembrane: '#5c2c16',
    wingVein: '#f97316',
    horn: '#856542',
    eye: '#fb923c',
    ember: '#f97316',
    element: 'ember',
  },
  lilac: {
    scalePrimary: '#2e1647',
    scaleSecondary: '#6b21a8',
    bellyPlate: '#c084fc',
    wingMembrane: '#3b0764',
    wingVein: '#f59e0b',
    horn: '#d4af37',
    eye: '#f472b6',
    ember: '#c084fc',
    element: 'ember',
  },
  cupid: {
    scalePrimary: '#501132',
    scaleSecondary: '#be185d',
    bellyPlate: '#fbcfe8',
    wingMembrane: '#4c0519',
    wingVein: '#fb7185',
    horn: '#facc15',
    eye: '#fda4af',
    ember: '#fb7185',
    element: 'ember',
  },
  pumpkin: {
    scalePrimary: '#36150a',
    scaleSecondary: '#9a3412',
    bellyPlate: '#fdba74',
    wingMembrane: '#431407',
    wingVein: '#fb923c',
    horn: '#65a30d',
    eye: '#fde047',
    ember: '#f97316',
    element: 'ember',
  },
  pharaoh: {
    scalePrimary: '#452408',
    scaleSecondary: '#b45309',
    bellyPlate: '#fde047',
    wingMembrane: '#291505',
    wingVein: '#38bdf8',
    horn: '#eab308',
    eye: '#38bdf8',
    ember: '#facc15',
    element: 'ember',
  },
  royal: {
    scalePrimary: '#4d3209',
    scaleSecondary: '#ca8a04',
    bellyPlate: '#fef08a',
    wingMembrane: '#450a0a',
    wingVein: '#ef4444',
    horn: '#fde047',
    eye: '#f43f5e',
    ember: '#facc15',
    element: 'ember',
  },
  coffee: {
    scalePrimary: '#240b09',
    scaleSecondary: '#7f1d1d',
    bellyPlate: '#ea580c',
    wingMembrane: '#1c0a07',
    wingVein: '#fb923c',
    horn: '#9a3412',
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
    aCtx.fillStyle = '#5f6878';
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

        // Albedo with realistic keratin-scale gradient + dark AO crevice border
        const shade = 112 + ((r * 13 + c * 19) % 62);
        const aGrad = aCtx.createLinearGradient(cx, cy - stepY * 0.6, cx, cy + stepY * 0.7);
        aGrad.addColorStop(0, `rgb(${shade + 42}, ${shade + 48}, ${shade + 56})`);
        aGrad.addColorStop(0.55, `rgb(${shade}, ${shade + 6}, ${shade + 14})`);
        aGrad.addColorStop(1, `rgb(${Math.max(40, shade - 48)}, ${Math.max(44, shade - 42)}, ${Math.max(52, shade - 36)})`);
        traceScale(aCtx, 1.0);
        aCtx.fillStyle = aGrad;
        aCtx.fill();
        aCtx.strokeStyle = 'rgba(6, 9, 16, 0.92)';
        aCtx.lineWidth = Math.max(1.6, texSize * 0.0045);
        aCtx.stroke();

        // Central dorsal keel ridge on each scale
        aCtx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        aCtx.lineWidth = Math.max(1.1, texSize * 0.003);
        aCtx.beginPath();
        aCtx.moveTo(cx, cy - stepY * 0.36);
        aCtx.lineTo(cx, cy + stepY * 0.38);
        aCtx.stroke();

        // Heightfield for crisp 3D normal map
        const hGrad = hCtx.createRadialGradient(cx, cy - stepY * 0.06, stepX * 0.04, cx, cy, stepX * 0.62);
        hGrad.addColorStop(0, 'rgb(252,252,252)');
        hGrad.addColorStop(0.65, 'rgb(185,185,185)');
        hGrad.addColorStop(1, 'rgb(34,34,34)');
        traceScale(hCtx, 0.98);
        hCtx.fillStyle = hGrad;
        hCtx.fill();
        hCtx.strokeStyle = 'rgb(12,12,12)';
        hCtx.lineWidth = Math.max(1.8, texSize * 0.0048);
        hCtx.stroke();

        // Roughness contrast: glossy raised scale tops vs matte crevices
        traceScale(rCtx, 0.92);
        rCtx.fillStyle = `rgb(${84 + ((r * 7 + c * 11) % 36)}, ${84 + ((r * 7 + c * 11) % 36)}, ${84 + ((r * 7 + c * 11) % 36)})`;
        rCtx.fill();
        rCtx.strokeStyle = 'rgb(232,232,232)';
        rCtx.lineWidth = Math.max(1.8, texSize * 0.0048);
        rCtx.stroke();
      }
    }

    // Fine reptilian micro-grain stippling across scales
    for (let i = 0; i < 900; i++) {
      const gx = (i * 193 + 37) % texSize;
      const gy = (i * 317 + 71) % texSize;
      aCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)';
      aCtx.fillRect(gx, gy, 2, 2);
      hCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)';
      hCtx.fillRect(gx, gy, 2, 2);
    }
  }

  const albedoTint = new THREE.CanvasTexture(albedoCanvas);
  albedoTint.colorSpace = THREE.SRGBColorSpace;
  albedoTint.wrapS = THREE.RepeatWrapping;
  albedoTint.wrapT = THREE.RepeatWrapping;
  albedoTint.repeat.set(3.6, 3.6);

  const normalMap = buildNormalMapFromHeightCanvas(heightCanvas, 3.2);
  normalMap.repeat.set(3.6, 3.6);

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

function createRadialParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,220,160,0.82)');
    grad.addColorStop(0.72, 'rgba(255,140,80,0.28)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
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

/** Builds a smooth tapered Tube-like BufferGeometry along a 3D curve */
function buildTaperedCurveGeometry(
  curve: THREE.CatmullRomCurve3,
  segments: number,
  radialSegments: number,
  radiusFn: (t: number) => number,
  squashX = 1,
  squashY = 1
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
      const cos = Math.cos(theta) * squashX;
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

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Builds a high-detail scalloped bat-wing membrane with natural camber across finger rays */
function buildWingMembraneGeometry(): THREE.BufferGeometry {
  const wrist = new THREE.Vector3(0, 0, 0);
  const shoulderAnchor = new THREE.Vector3(-0.74, -0.66, 0.14);
  const hipAnchor = new THREE.Vector3(-0.92, -1.24, -0.26);

  const tips = [
    new THREE.Vector3(1.18, 0.24, -0.14),
    new THREE.Vector3(1.24, -0.48, -0.22),
    new THREE.Vector3(0.84, -0.98, -0.24),
    new THREE.Vector3(0.26, -1.16, -0.18),
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
    idx.push(base, base + 1, base + 2);
  };

  // Multi-ring subdivided scalloped webbing for realistic cloth/leather shading
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
      // Aerodynamic membrane billow
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
  geo.computeVertexNormals();
  return geo;
}

export const Dragon3DStage: React.FC<Dragon3DStageProps> = ({
  skin,
  rarity,
  level,
  customLevel,
  gear = 'none',
  aura = 'auto',
  isFever = false,
  feedPulseNonce,
  levelBurstNonce,
  onTapStage,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const propsRef = useRef({ skin, rarity, level, customLevel, gear, aura, isFever });
  propsRef.current = { skin, rarity, level, customLevel, gear, aura, isFever };

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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
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
    scene.fog = new THREE.FogExp2(0x090c14, 0.044);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const baseCameraPos = new THREE.Vector3(-0.56, 1.84, 5.14);
    const lookTarget = new THREE.Vector3(0.04, 1.24, -0.05);
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
    camera.position.copy(baseCameraPos);
    camera.lookAt(lookTarget);

    // 3-Point Dark-Fantasy Sculpted Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0x8bc0f2, 0x0b0e17, 0.58);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffeed8, 1.82);
    keyLight.position.set(3.2, 5.1, 3.8);
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

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.3);
    rimLight.position.set(-3.7, 3.5, -3.4);
    scene.add(rimLight);

    const underFillLight = new THREE.DirectionalLight(0x1e293b, 0.55);
    underFillLight.position.set(0.5, -2.5, 2.8);
    scene.add(underFillLight);

    const auraPointLight = new THREE.PointLight(0x38bdf8, 1.55, 9.5, 2);
    auraPointLight.position.set(-0.4, 1.38, 1.6);
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
    const particleTex = track(createRadialParticleTexture());

    // PBR Materials
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
        emissiveIntensity: 1.65,
        roughness: 0.25,
        metalness: 0.7,
      })
    );

    const scaleMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x36586b,
        map: scaleTexSet.albedoTint,
        normalMap: scaleTexSet.normalMap,
        normalScale: new THREE.Vector2(1.25, 1.25),
        roughnessMap: scaleTexSet.roughnessMap,
        roughness: 0.68,
        metalness: 0.34,
        clearcoat: 0.22,
        clearcoatRoughness: 0.38,
        envMapIntensity: 1.15,
      })
    );

    const scaleHighlightMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x67b7d1,
        map: scaleTexSet.albedoTint,
        normalMap: scaleTexSet.normalMap,
        normalScale: new THREE.Vector2(1.15, 1.15),
        roughnessMap: scaleTexSet.roughnessMap,
        roughness: 0.56,
        metalness: 0.42,
        clearcoat: 0.28,
        clearcoatRoughness: 0.32,
        envMapIntensity: 1.25,
      })
    );

    const bellyMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x6ba7c0,
        normalMap: hornTexSet.normalMap,
        normalScale: new THREE.Vector2(0.45, 0.45),
        roughness: 0.46,
        metalness: 0.26,
        clearcoat: 0.3,
        clearcoatRoughness: 0.35,
      })
    );

    const wingMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x1c4459,
        map: wingTexSet.map,
        normalMap: wingTexSet.normalMap,
        normalScale: new THREE.Vector2(0.95, 0.95),
        emissive: 0x38bdf8,
        emissiveMap: wingTexSet.veinGlow,
        emissiveIntensity: 1.06,
        roughness: 0.48,
        metalness: 0.12,
        sheen: 0.35,
        sheenRoughness: 0.6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.93,
      })
    );

    const hornMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xcbd5e1,
        map: hornTexSet.map,
        normalMap: hornTexSet.normalMap,
        normalScale: new THREE.Vector2(1.0, 1.0),
        roughness: 0.32,
        metalness: 0.58,
        clearcoat: 0.52,
        clearcoatRoughness: 0.28,
      })
    );

    const fangMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xf8fafc,
        roughness: 0.16,
        metalness: 0.06,
        clearcoat: 0.92,
      })
    );

    const eyeMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x38bdf8,
        emissiveIntensity: 2.9,
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
        opacity: 0.28,
      })
    );

    const pupilMat = track(
      new THREE.MeshBasicMaterial({
        color: 0x05070c,
      })
    );

    const mawGlowMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x38bdf8,
        emissiveIntensity: 2.2,
        roughness: 0.2,
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

    const mainCrag = new THREE.Mesh(track(new THREE.CylinderGeometry(1.06, 1.56, 0.34, 8)), rockMat);
    mainCrag.position.y = 0.17;
    mainCrag.rotation.y = 0.4;
    mainCrag.receiveShadow = true;
    pedestalGroup.add(mainCrag);

    const rockOffsets: Array<[number, number, number, number, number, number]> = [
      [-0.92, 0.17, 0.28, 0.62, 0.42, 0.56],
      [0.95, 0.19, 0.20, 0.66, 0.44, 0.52],
      [0.10, 0.17, 0.88, 0.74, 0.32, 0.48],
      [-0.78, 0.21, -0.78, 0.76, 0.48, 0.64],
      [0.82, 0.21, -0.72, 0.72, 0.45, 0.60],
      [0, 0.16, -1.04, 0.92, 0.44, 0.58],
    ];
    const rockGeo = track(new THREE.DodecahedronGeometry(0.62, 0));
    rockOffsets.forEach(([x, y, z, sx, sy, sz], i) => {
      const boulder = new THREE.Mesh(rockGeo, rockMat);
      boulder.position.set(x, y, z);
      boulder.scale.set(sx, sy, sz);
      boulder.rotation.set(i * 0.6, i * 1.1, i * 0.4);
      boulder.receiveShadow = true;
      boulder.castShadow = true;
      pedestalGroup.add(boulder);
    });

    const fissureRing = new THREE.Mesh(track(new THREE.TorusGeometry(1.12, 0.017, 6, 8)), runeFissureMat);
    fissureRing.rotation.x = Math.PI / 2;
    fissureRing.rotation.z = 0.4;
    fissureRing.position.y = 0.28;
    pedestalGroup.add(fissureRing);

    // =========================================================================
    // 2. DRAGON ROOT & HEROIC QUADRUPED ANATOMY
    // =========================================================================
    const dragonRoot = new THREE.Group();
    dragonRoot.position.y = 0.34;
    scene.add(dragonRoot);

    const rigPivot = new THREE.Group();
    dragonRoot.add(rigPivot);

    // --- Torso / Muscular Ribcage & Pectoral Armor ---
    const torsoGroup = new THREE.Group();
    rigPivot.add(torsoGroup);

    const chestMesh = new THREE.Mesh(track(new THREE.SphereGeometry(0.46, 24, 18)), scaleMat);
    chestMesh.scale.set(0.74, 0.89, 1.18);
    chestMesh.position.set(0, 0.90, 0.16);
    chestMesh.rotation.x = -0.36;
    chestMesh.castShadow = true;
    torsoGroup.add(chestMesh);

    // Sculpted Pectoral & Trapezius Muscle Mass
    const pecGeo = track(new THREE.SphereGeometry(0.24, 16, 12));
    for (const side of [-1, 1] as const) {
      const pec = new THREE.Mesh(pecGeo, scaleHighlightMat);
      pec.scale.set(1.05, 0.85, 0.9);
      pec.position.set(side * 0.17, 0.94, 0.40);
      pec.rotation.y = side * 0.28;
      pec.castShadow = true;
      torsoGroup.add(pec);
    }

    const backTorsoCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.96, 0.24),
      new THREE.Vector3(0, 0.78, -0.14),
      new THREE.Vector3(0, 0.64, -0.52),
    ]);
    const backTorsoGeo = track(
      buildTaperedCurveGeometry(backTorsoCurve, 16, 16, (t) => 0.43 - t * 0.13, 0.92, 1.05)
    );
    const backTorsoMesh = new THREE.Mesh(backTorsoGeo, scaleMat);
    backTorsoMesh.castShadow = true;
    torsoGroup.add(backTorsoMesh);

    // Layered Overlapping Ventral Chest & Belly Scale Armor Plates
    const plateGeo = track(new THREE.CylinderGeometry(0.28, 0.34, 0.12, 10));
    for (let p = 0; p < 9; p++) {
      const t = p / 8;
      const plate = new THREE.Mesh(plateGeo, bellyMat);
      const y = 1.24 - t * 0.68;
      const z = 0.39 - Math.pow(t, 1.15) * 0.76 + Math.sin(t * Math.PI) * 0.22;
      const sc = 0.62 + Math.sin(t * Math.PI) * 0.45 - t * 0.25;
      plate.position.set(0, y, z);
      plate.scale.set(sc * 1.14, 0.86, sc * 0.68);
      plate.rotation.x = 0.48 - t * 0.78;
      plate.castShadow = true;
      torsoGroup.add(plate);
    }

    // Glowing Chest Runic Core Scale
    const chestCore = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.095, 0)), mawGlowMat);
    chestCore.position.set(0, 0.94, 0.60);
    chestCore.scale.set(0.85, 1.25, 0.55);
    torsoGroup.add(chestCore);

    // --- S-Curved Scaled Dragon Neck ---
    const neckCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.02, 0.26),
      new THREE.Vector3(0, 1.26, 0.35),
      new THREE.Vector3(0, 1.50, 0.22),
      new THREE.Vector3(0, 1.70, 0.26),
    ]);
    const neckGeo = track(
      buildTaperedCurveGeometry(neckCurve, 18, 16, (t) => 0.31 - t * 0.12, 0.88, 1.05)
    );
    const neckMesh = new THREE.Mesh(neckGeo, scaleMat);
    neckMesh.castShadow = true;
    torsoGroup.add(neckMesh);

    // Ventral Neck Throat Plates
    for (let np = 0; np < 6; np++) {
      const t = (np + 0.4) / 6;
      const pos = neckCurve.getPointAt(t);
      const throatPlate = new THREE.Mesh(plateGeo, bellyMat);
      throatPlate.position.set(0, pos.y - 0.01, pos.z + 0.16 - t * 0.04);
      const sc = 0.66 - t * 0.24;
      throatPlate.scale.set(sc, 0.7, sc * 0.55);
      throatPlate.rotation.x = 0.28;
      torsoGroup.add(throatPlate);
    }

    // Dorsal Neck & Spine Spikes (sharp faceted ridge blades)
    const dorsalSpikes: THREE.Mesh[] = [];
    const dorsalGeo = track(new THREE.ConeGeometry(0.068, 0.28, 5));
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
    }

    // --- 3. FIERCE PREDATOR DRAGON SKULL ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.72, 0.26);
    headGroup.scale.setScalar(1.18);
    rigPivot.add(headGroup);

    const cranium = new THREE.Mesh(track(new THREE.DodecahedronGeometry(0.28, 1)), scaleHighlightMat);
    cranium.scale.set(0.92, 0.82, 1.24);
    cranium.position.set(0, 0.05, 0.04);
    cranium.castShadow = true;
    headGroup.add(cranium);

    const upperSnout = new THREE.Mesh(track(new THREE.CylinderGeometry(0.11, 0.21, 0.54, 8)), scaleHighlightMat);
    upperSnout.rotation.x = Math.PI / 2.02;
    upperSnout.scale.set(0.95, 1, 0.62);
    upperSnout.position.set(0, 0.04, 0.38);
    upperSnout.castShadow = true;
    headGroup.add(upperSnout);

    // Sculpted Snout Tip & Nasal Bridge Crest
    const snoutTip = new THREE.Mesh(track(new THREE.DodecahedronGeometry(0.105, 0)), scaleHighlightMat);
    snoutTip.scale.set(0.9, 0.68, 1.1);
    snoutTip.position.set(0, 0.045, 0.63);
    headGroup.add(snoutTip);

    const nasalCrest = new THREE.Mesh(track(new THREE.BoxGeometry(0.075, 0.09, 0.36)), scaleMat);
    nasalCrest.position.set(0, 0.13, 0.36);
    nasalCrest.rotation.x = 0.08;
    headGroup.add(nasalCrest);

    // Fierce Slanted Brow Ridges + Lower Eyelid Armor
    const browGeo = track(new THREE.BoxGeometry(0.16, 0.055, 0.28));
    const lowerLidGeo = track(new THREE.BoxGeometry(0.12, 0.03, 0.20));
    for (const side of [-1, 1] as const) {
      const brow = new THREE.Mesh(browGeo, scaleHighlightMat);
      brow.position.set(side * 0.145, 0.142, 0.22);
      brow.rotation.set(0.18, -side * 0.22, side * 0.28);
      const lowerLid = new THREE.Mesh(lowerLidGeo, scaleMat);
      lowerLid.position.set(side * 0.14, 0.032, 0.23);
      lowerLid.rotation.set(-0.08, -side * 0.18, side * 0.12);
      headGroup.add(brow, lowerLid);
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

    // Glowing Nostrils
    const nostrilGeo = track(new THREE.SphereGeometry(0.024, 8, 8));
    for (const side of [-1, 1] as const) {
      const nos = new THREE.Mesh(nostrilGeo, mawGlowMat);
      nos.position.set(side * 0.062, 0.075, 0.635);
      headGroup.add(nos);
    }

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

    // Articulated Lower Jaw + Chin Spikes + Lower Fangs
    const jawPivot = new THREE.Group();
    jawPivot.position.set(0, -0.04, 0.08);
    headGroup.add(jawPivot);

    const lowerJawMesh = new THREE.Mesh(track(new THREE.CylinderGeometry(0.075, 0.145, 0.44, 8)), scaleMat);
    lowerJawMesh.rotation.x = Math.PI / 2;
    lowerJawMesh.scale.set(0.95, 1, 0.52);
    lowerJawMesh.position.set(0, -0.035, 0.25);
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

    // --- 4. FOUR MUSCULAR CLAWED LIMBS ---
    const buildForelimb = (side: -1 | 1) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.39, 0.84, 0.24);

      const deltoid = new THREE.Mesh(track(new THREE.DodecahedronGeometry(0.21, 1)), scaleMat);
      deltoid.scale.set(0.86, 1.14, 0.96);
      deltoid.castShadow = true;
      shoulder.add(deltoid);

      const upperArm = new THREE.Mesh(track(new THREE.CylinderGeometry(0.13, 0.10, 0.44, 10)), scaleMat);
      upperArm.position.set(side * 0.06, -0.22, -0.06);
      upperArm.rotation.z = side * 0.22;
      upperArm.rotation.x = 0.28;
      upperArm.castShadow = true;
      shoulder.add(upperArm);

      const elbowSpur = new THREE.Mesh(track(new THREE.ConeGeometry(0.042, 0.21, 5)), hornMat);
      elbowSpur.position.set(side * 0.12, -0.38, -0.18);
      elbowSpur.rotation.x = -Math.PI * 0.68;
      shoulder.add(elbowSpur);

      const forearmPivot = new THREE.Group();
      forearmPivot.position.set(side * 0.10, -0.40, -0.09);
      shoulder.add(forearmPivot);

      const forearm = new THREE.Mesh(track(new THREE.CylinderGeometry(0.10, 0.085, 0.44, 10)), scaleHighlightMat);
      forearm.position.set(-side * 0.03, -0.20, 0.16);
      forearm.rotation.x = -0.68;
      forearm.rotation.z = -side * 0.14;
      forearm.castShadow = true;
      forearmPivot.add(forearm);

      const paw = new THREE.Group();
      paw.position.set(-side * 0.05, -0.39, 0.34);
      const palm = new THREE.Mesh(track(new THREE.SphereGeometry(0.12, 12, 8)), scaleMat);
      palm.scale.set(1.15, 0.45, 1.25);
      paw.add(palm);

      const talonGeo = track(new THREE.ConeGeometry(0.026, 0.17, 5));
      for (let t = -1; t <= 1; t++) {
        const toe = new THREE.Mesh(track(new THREE.CylinderGeometry(0.026, 0.02, 0.14, 7)), scaleMat);
        toe.rotation.x = Math.PI / 2.3;
        toe.rotation.z = -t * 0.28;
        toe.position.set(t * 0.068, -0.015, 0.11);
        const talon = new THREE.Mesh(talonGeo, hornMat);
        talon.position.set(t * 0.092, -0.032, 0.20);
        talon.rotation.x = Math.PI * 0.64;
        talon.rotation.z = -t * 0.26;
        paw.add(toe, talon);
      }
      forearmPivot.add(paw);

      return { shoulder, forearmPivot };
    };

    const foreL = buildForelimb(-1);
    const foreR = buildForelimb(1);
    rigPivot.add(foreL.shoulder, foreR.shoulder);

    const buildHindlimb = (side: -1 | 1) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.36, 0.62, -0.44);

      const thigh = new THREE.Mesh(track(new THREE.DodecahedronGeometry(0.23, 1)), scaleMat);
      thigh.scale.set(0.76, 1.12, 1.16);
      thigh.rotation.x = -0.38;
      thigh.castShadow = true;
      hip.add(thigh);

      const kneeSpur = new THREE.Mesh(track(new THREE.ConeGeometry(0.04, 0.19, 5)), hornMat);
      kneeSpur.position.set(side * 0.06, 0.04, 0.24);
      kneeSpur.rotation.x = 0.65;
      hip.add(kneeSpur);

      const shin = new THREE.Mesh(track(new THREE.CylinderGeometry(0.095, 0.072, 0.42, 10)), scaleMat);
      shin.position.set(side * 0.04, -0.28, -0.14);
      shin.rotation.x = 0.62;
      shin.castShadow = true;
      hip.add(shin);

      const ankle = new THREE.Mesh(track(new THREE.CylinderGeometry(0.07, 0.065, 0.28, 8)), scaleHighlightMat);
      ankle.position.set(side * 0.05, -0.48, -0.08);
      ankle.rotation.x = -0.75;
      hip.add(ankle);

      const hindPaw = new THREE.Group();
      hindPaw.position.set(side * 0.05, -0.57, 0.06);
      const hPalm = new THREE.Mesh(track(new THREE.SphereGeometry(0.115, 10, 8)), scaleMat);
      hPalm.scale.set(1.1, 0.45, 1.25);
      hindPaw.add(hPalm);

      const talonGeo = track(new THREE.ConeGeometry(0.025, 0.16, 5));
      for (let t = -1; t <= 1; t++) {
        const talon = new THREE.Mesh(talonGeo, hornMat);
        talon.position.set(t * 0.065, -0.025, 0.15);
        talon.rotation.x = Math.PI * 0.64;
        talon.rotation.z = -t * 0.24;
        hindPaw.add(talon);
      }
      hip.add(hindPaw);

      return hip;
    };

    rigPivot.add(buildHindlimb(-1), buildHindlimb(1));

    // --- 5. SWEEPING SPIKED DRAGON TAIL ---
    const tailPivot = new THREE.Group();
    rigPivot.add(tailPivot);

    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.56, -0.56),
      new THREE.Vector3(0.24, 0.36, -0.98),
      new THREE.Vector3(0.76, 0.16, -0.96),
      new THREE.Vector3(0.98, 0.12, -0.46),
      new THREE.Vector3(0.84, 0.18, 0.02),
    ]);
    const tailGeo = track(
      buildTaperedCurveGeometry(tailCurve, 28, 14, (t) => 0.22 * Math.pow(1 - t * 0.86, 0.85))
    );
    const tailMesh = new THREE.Mesh(tailGeo, scaleMat);
    tailMesh.castShadow = true;
    tailPivot.add(tailMesh);

    const tailSpineGeo = track(new THREE.ConeGeometry(0.045, 0.19, 4));
    for (let ts = 0; ts < 10; ts++) {
      const t = 0.08 + (ts / 10) * 0.84;
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
    const membraneGeo = track(buildWingMembraneGeometry());

    const buildWing = (side: -1 | 1) => {
      const shoulderPivot = new THREE.Group();
      shoulderPivot.position.set(side * 0.28, 1.06, -0.04);

      const armCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(side * 0.38, 0.22, -0.18),
        new THREE.Vector3(side * 0.68, 0.72, -0.10),
      ]);
      const armGeo = track(buildTaperedCurveGeometry(armCurve, 12, 10, (t) => 0.098 - t * 0.032));
      const armMesh = new THREE.Mesh(armGeo, scaleHighlightMat);
      armMesh.castShadow = true;
      shoulderPivot.add(armMesh);

      const outerPivot = new THREE.Group();
      outerPivot.position.set(side * 0.68, 0.72, -0.10);
      if (side === -1) {
        outerPivot.scale.x = -1;
      }
      shoulderPivot.add(outerPivot);

      const thumbClaw = new THREE.Mesh(track(new THREE.ConeGeometry(0.046, 0.25, 6)), hornMat);
      thumbClaw.position.set(0.04, 0.13, 0.06);
      thumbClaw.rotation.set(0.35, 0, -0.72);
      outerPivot.add(thumbClaw);

      const fingerTips = [
        new THREE.Vector3(1.18, 0.24, -0.14),
        new THREE.Vector3(1.24, -0.48, -0.22),
        new THREE.Vector3(0.84, -0.98, -0.24),
        new THREE.Vector3(0.26, -1.16, -0.18),
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
          tipClaw.position.copy(tip).add(new THREE.Vector3(0.03, -0.04, 0));
          tipClaw.rotation.z = -Math.PI * 0.82;
          outerPivot.add(tipClaw);
        }
      });

      const membrane = new THREE.Mesh(membraneGeo, wingMat);
      membrane.castShadow = tier === 'HIGH';
      outerPivot.add(membrane);

      const stormBlade = new THREE.Mesh(
        membraneGeo,
        track(
          new THREE.MeshPhysicalMaterial({
            color: 0xe0f2fe,
            emissive: 0x38bdf8,
            emissiveIntensity: 1.15,
            roughness: 0.15,
            metalness: 0.55,
            transparent: true,
            opacity: 0.58,
            side: THREE.DoubleSide,
          })
        )
      );
      stormBlade.position.set(0.08, 0.22, -0.06);
      stormBlade.scale.setScalar(0.95);
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
    const helmPlate = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.24, 0.36, 6)), steelGearMat);
    helmPlate.rotation.x = Math.PI / 2.02;
    helmPlate.scale.set(1.06, 1, 0.58);
    helmPlate.position.set(0, 0.12, 0.28);
    const helmFin = new THREE.Mesh(track(new THREE.BoxGeometry(0.04, 0.16, 0.32)), goldGearMat);
    helmFin.position.set(0, 0.24, 0.18);
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

    // --- 8. STAR CUSTOMIZATION ORBITAL RUNES ---
    const starOrbitGroup = new THREE.Group();
    starOrbitGroup.position.set(0, 1.15, 0);
    dragonRoot.add(starOrbitGroup);

    const orbitRing = new THREE.Mesh(track(new THREE.TorusGeometry(1.52, 0.018, 8, 48)), runeFissureMat);
    orbitRing.rotation.x = Math.PI / 2.15;
    starOrbitGroup.add(orbitRing);

    const starSatellites: THREE.Mesh[] = [];
    const satGeo = track(new THREE.OctahedronGeometry(0.085, 0));
    for (let i = 0; i < 6; i++) {
      const sat = new THREE.Mesh(satGeo, goldGearMat);
      const a = (i / 6) * Math.PI * 2;
      sat.position.set(Math.cos(a) * 1.52, 0, Math.sin(a) * 1.52);
      starOrbitGroup.add(sat);
      starSatellites.push(sat);
    }

    // --- 9. LIVE ELEMENTAL PARTICLES & VOLUMETRIC MIST ---
    const particleCount = tier === 'HIGH' ? 96 : tier === 'MEDIUM' ? 54 : 28;
    const pPositions = new Float32Array(particleCount * 3);
    const pVelocities = new Float32Array(particleCount * 3);
    const pLife = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 0.25 + Math.random() * 1.45;
      pPositions[i * 3] = Math.cos(ang) * rad;
      pPositions[i * 3 + 1] = Math.random() * 2.5;
      pPositions[i * 3 + 2] = Math.sin(ang) * rad;
      pVelocities[i * 3] = (Math.random() - 0.5) * 0.32;
      pVelocities[i * 3 + 1] = 0.45 + Math.random() * 0.9;
      pVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.32;
      pLife[i] = Math.random();
    }

    const particleGeo = track(new THREE.BufferGeometry());
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const particleMat = track(
      new THREE.PointsMaterial({
        color: 0x67e8f9,
        map: particleTex,
        size: tier === 'HIGH' ? 0.24 : 0.28,
        transparent: true,
        opacity: 0.84,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const emberPoints = new THREE.Points(particleGeo, particleMat);
    scene.add(emberPoints);

    // --- 10. LIVE 3D PROCEDURAL LIGHTNING BOLTS ---
    const boltSegments = 48;
    const boltVertices = new Float32Array(boltSegments * 2 * 3);
    const boltGeo = track(new THREE.BufferGeometry());
    boltGeo.setAttribute('position', new THREE.BufferAttribute(boltVertices, 3));
    const boltMat = track(
      new THREE.LineBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      })
    );
    const lightningLines = new THREE.LineSegments(boltGeo, boltMat);
    rigPivot.add(lightningLines);

    const boltAnchors: Array<[number, number, number, number, number, number]> = [
      [-1.35, 1.85, -0.35, -0.62, 1.38, -0.05],
      [1.35, 1.85, -0.35, 0.62, 1.38, -0.05],
      [-0.85, 1.15, -0.25, -0.45, 0.12, 0.48],
      [0.85, 1.15, -0.25, 0.45, 0.12, 0.48],
      [0, 1.65, 0.65, 0.24, 0.95, 1.15],
      [-0.36, 0.22, 0.45, -1.02, 0.02, 0.72],
      [0.36, 0.22, 0.45, 1.02, 0.02, 0.72],
      [-0.25, 2.25, -0.32, 0.25, 2.25, -0.32],
    ];

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
      const segsPerBolt = 6;
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

          const nx = sx + (ex - sx) * frac + h1 * 0.18 * fade;
          const ny = sy + (ey - sy) * frac + h2 * 0.16 * fade;
          const nz = sz + (ez - sz) * frac + h3 * 0.15 * fade;

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

      if (lastSkinSynced !== cur.skin || lastAuraSynced !== cur.aura) {
        lastSkinSynced = cur.skin;
        lastAuraSynced = cur.aura;

        scaleMat.color.set(pal.scalePrimary);
        scaleHighlightMat.color.set(pal.scaleSecondary);
        bellyMat.color.set(pal.bellyPlate);
        wingMat.color.set(pal.wingMembrane);
        wingMat.emissive.set(pal.wingVein);
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
        particleMat.color.set(auraHex);
        breathMat.color.set(auraHex);
        boltMat.color.set(cur.aura === 'flame' ? '#fb923c' : cur.aura === 'gold' ? '#fde047' : pal.wingVein);
        auraPointLight.color.set(auraHex);
        rimLight.color.set(auraHex);
      }

      const evoScale = 0.94 + (cur.level - 1) * 0.055;
      const pulse = pulseStateRef.current;
      const breathSquash = prefersReduced ? 1 : 1 + Math.sin(elapsed * 2.1) * 0.015;
      dragonRoot.scale.set(
        evoScale * (1 + pulse.roarImpulse * 0.045),
        evoScale * breathSquash,
        evoScale * (1 + pulse.roarImpulse * 0.045)
      );

      const hornGrowth = 0.82 + cur.level * 0.11;
      hornGroup.scale.setScalar(hornGrowth);

      const dorsalScale = 0.86 + cur.level * 0.09;
      dorsalSpikes.forEach((sp, i) => {
        const base = 0.85 + Math.sin((i / 7) * Math.PI) * 0.45;
        sp.scale.set(0.75 * dorsalScale, base * dorsalScale, 1.25 * dorsalScale);
      });

      const wingScale = (cur.level >= 2 ? 0.92 + cur.level * 0.075 : 0.78) * (cur.gear === 'wings' ? 1.18 : 1);
      wingL.shoulderPivot.scale.setScalar(wingScale);
      wingR.shoulderPivot.scale.setScalar(wingScale);

      crownGroup.visible = cur.gear === 'crown';
      helmetGroup.visible = cur.gear === 'helmet';
      shadesGroup.visible = cur.gear === 'shades';
      wingL.stormBlade.visible = cur.gear === 'wings';
      wingR.stormBlade.visible = cur.gear === 'wings';

      starOrbitGroup.visible = cur.customLevel >= 1;
      if (starOrbitGroup.visible) {
        starOrbitGroup.rotation.y = elapsed * (0.65 + cur.customLevel * 0.07);
        starOrbitGroup.rotation.z = Math.sin(elapsed * 0.85) * 0.1;
        const activeSats = Math.min(6, Math.max(1, Math.ceil(cur.customLevel / 2)));
        starSatellites.forEach((sat, idx) => {
          sat.visible = idx < activeSats;
          sat.rotation.y = elapsed * 2;
        });
      }

      const showLightning = pal.element === 'storm' || cur.isFever || pulse.burstEnergy > 0.25 || cur.gear === 'wings';
      lightningLines.visible = showLightning;
      if (showLightning) {
        boltMat.opacity = cur.isFever ? 0.95 : Math.min(0.95, 0.55 + pulse.burstEnergy * 0.4);
        if (Math.floor(elapsed * 14) !== lastLightningSeedTime) {
          lastLightningSeedTime = Math.floor(elapsed * 14);
          refreshLightningBolts(elapsed);
        }
      }

      const roarIntensity = Math.min(1.3, (cur.isFever ? 0.72 : 0.16) + pulse.roarImpulse * 0.85);
      mawGlowMat.emissiveIntensity = 1.6 + roarIntensity * 2.2;
      breathMat.opacity = roarIntensity * 0.42;
      breathCone.scale.set(0.75 + roarIntensity * 0.65, 0.75 + roarIntensity * 0.75, 0.75 + roarIntensity * 0.65);

      const glowMult = cur.isFever ? 1.85 : 1 + pulse.burstEnergy * 0.65;
      auraPointLight.intensity = 1.55 * glowMult + Math.sin(elapsed * 3.5) * 0.25;
      _colorA.set(pal.ember);
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

      torsoGroup.position.y = (prefersReduced ? 0 : Math.sin(elapsed * 2.1) * 0.022) + roarLift * 0.14;
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

      const flare = pulse.roarImpulse * 0.26;
      wingL.shoulderPivot.rotation.y = 0.36 + flapWave * 0.18 + flare;
      wingL.shoulderPivot.rotation.z = -0.06 + flapWave * 0.14;
      wingL.outerPivot.rotation.y = 0.14 + flapWave * 0.14;

      wingR.shoulderPivot.rotation.y = -0.36 - flapWave * 0.18 - flare;
      wingR.shoulderPivot.rotation.z = 0.06 - flapWave * 0.14;
      wingR.outerPivot.rotation.y = -0.14 - flapWave * 0.14;

      tailPivot.rotation.y = prefersReduced ? 0 : Math.sin(elapsed * 1.65) * 0.075;

      applySkinAndState(elapsed);

      const posAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const speedMult = (cur.isFever ? 2.1 : 1) + pulse.burstEnergy * 1.3;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        arr[idx] += pVelocities[idx] * dt * speedMult;
        arr[idx + 1] += pVelocities[idx + 1] * dt * speedMult;
        arr[idx + 2] += pVelocities[idx + 2] * dt * speedMult;
        pLife[i] += dt * (0.42 + pulse.burstEnergy * 0.35);
        if (pLife[i] >= 1 || arr[idx + 1] > 3.1) {
          const ang = (i * 1.7 + elapsed) % (Math.PI * 2);
          const rad = 0.24 + (i % 6) * 0.24;
          arr[idx] = Math.cos(ang) * rad;
          arr[idx + 1] = 0.26 + (i % 3) * 0.12;
          arr[idx + 2] = Math.sin(ang) * rad;
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
          pulseStateRef.current.roarImpulse = 1.05;
          pulseStateRef.current.cameraShake = Math.max(pulseStateRef.current.cameraShake, 0.025);
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
