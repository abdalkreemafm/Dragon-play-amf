import React, { useEffect, useImperativeHandle, useRef } from 'react';

export type VfxBurstKind = 'FIREBALL' | 'CRIT' | 'SHIELD' | 'VAMPIRE' | 'PARRY' | 'ENEMY_HIT' | 'SHOCKWAVE';

export interface ArenaVfxHandle {
  spawnAttack: (kind: VfxBurstKind, label?: string) => void;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  color: string;
  radius: number;
  kind: VfxBurstKind;
  life: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface RingWave {
  x: number;
  y: number;
  r: number;
  maxR: number;
  color: string;
  life: number;
}

interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  big?: boolean;
}

interface SlashArc {
  x: number;
  y: number;
  angle: number;
  radius: number;
  color: string;
  life: number;
}

export const ArenaVfxCanvas = React.forwardRef<ArenaVfxHandle, { className?: string }>(({ className = '' }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef({ w: 360, h: 200 });
  const stateRef = useRef<{
    projectiles: Projectile[];
    sparks: Spark[];
    rings: RingWave[];
    slashes: SlashArc[];
    texts: FloatingText[];
  }>({
    projectiles: [],
    sparks: [],
    rings: [],
    slashes: [],
    texts: [],
  });

  const wakeRef = useRef<(() => void) | null>(null);

  useImperativeHandle(ref, () => ({
    spawnAttack(kind, label) {
      const w = sizeRef.current.w || 360;
      const h = sizeRef.current.h || 200;
      // RTL visual alignment: player card sits on right (~0.74w), enemy on left (~0.26w)
      const playerX = w * 0.74;
      const enemyX = w * 0.26;
      const midY = h * 0.52;
      const s = stateRef.current;

      const addSparks = (cx: number, cy: number, color: string, count: number) => {
        for (let i = 0; i < count; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 55 + Math.random() * 175;
          s.sparks.push({
            x: cx,
            y: cy,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 20,
            color,
            size: 2 + Math.random() * 3.5,
            life: 0,
            maxLife: 0.35 + Math.random() * 0.35,
          });
        }
      };

      if (kind === 'FIREBALL' || kind === 'CRIT') {
        const col = kind === 'CRIT' ? '#fb7185' : '#facc15';
        s.projectiles.push({
          x: playerX,
          y: midY,
          vx: (enemyX - playerX) * 4.5,
          vy: (Math.random() - 0.5) * 32,
          tx: enemyX,
          ty: midY,
          color: col,
          radius: kind === 'CRIT' ? 11 : 7,
          kind,
          life: 0,
        });
        s.slashes.push({
          x: enemyX,
          y: midY,
          angle: (Math.random() - 0.5) * 1.1,
          radius: kind === 'CRIT' ? 54 : 38,
          color: col,
          life: 0,
        });
        if (label) {
          s.texts.push({
            x: enemyX + (Math.random() - 0.5) * 24,
            y: midY - 24,
            vy: -48,
            text: label,
            color: col,
            life: 0,
            big: kind === 'CRIT',
          });
        }
      } else if (kind === 'SHIELD' || kind === 'PARRY') {
        const col = kind === 'PARRY' ? '#34d399' : '#38bdf8';
        s.rings.push({ x: playerX, y: midY, r: 10, maxR: 86, color: col, life: 0 });
        addSparks(playerX, midY, col, kind === 'PARRY' ? 26 : 16);
        if (kind === 'PARRY') {
          s.slashes.push({ x: enemyX, y: midY, angle: -0.3, radius: 58, color: '#34d399', life: 0 });
          s.projectiles.push({
            x: playerX,
            y: midY,
            vx: (enemyX - playerX) * 5.2,
            vy: 0,
            tx: enemyX,
            ty: midY,
            color: '#34d399',
            radius: 10,
            kind: 'CRIT',
            life: 0,
          });
        }
        if (label) {
          s.texts.push({ x: playerX, y: midY - 34, vy: -42, text: label, color: col, life: 0, big: true });
        }
      } else if (kind === 'VAMPIRE') {
        s.projectiles.push({
          x: enemyX,
          y: midY,
          vx: (playerX - enemyX) * 3.8,
          vy: 0,
          tx: playerX,
          ty: midY,
          color: '#e879f9',
          radius: 9,
          kind: 'VAMPIRE',
          life: 0,
        });
        addSparks(enemyX, midY, '#e879f9', 14);
        if (label) {
          s.texts.push({ x: playerX, y: midY - 28, vy: -40, text: label, color: '#f0abfc', life: 0, big: true });
        }
      } else if (kind === 'ENEMY_HIT') {
        s.rings.push({ x: playerX, y: midY, r: 8, maxR: 62, color: '#f43f5e', life: 0 });
        s.slashes.push({ x: playerX, y: midY, angle: 0.4, radius: 42, color: '#f43f5e', life: 0 });
        addSparks(playerX, midY, '#f43f5e', 14);
        if (label) {
          s.texts.push({ x: playerX, y: midY - 22, vy: -42, text: label, color: '#fda4af', life: 0 });
        }
      } else if (kind === 'SHOCKWAVE') {
        s.rings.push({ x: w * 0.5, y: midY, r: 12, maxR: w * 0.45, color: '#a855f7', life: 0 });
        s.slashes.push({ x: enemyX, y: midY, angle: 0.1, radius: 64, color: '#fde047', life: 0 });
        addSparks(enemyX, midY, '#c084fc', 24);
        if (label) {
          s.texts.push({ x: enemyX, y: midY - 28, vy: -46, text: label, color: '#fde047', life: 0, big: true });
        }
      }
      wakeRef.current?.();
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let resizeRaf = 0;
    const resize = () => {
      resizeRaf = 0;
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = Math.max(220, parent.clientWidth);
      const h = Math.max(160, parent.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);
      if (canvas.width === targetW && canvas.height === targetH) return;
      sizeRef.current = { w, h };
      canvas.width = targetW;
      canvas.height = targetH;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const scheduleResize = () => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(resize);
    };

    const ro = typeof ResizeObserver !== 'undefined' && canvas.parentElement
      ? new ResizeObserver(scheduleResize)
      : null;
    if (ro && canvas.parentElement) {
      ro.observe(canvas.parentElement);
    }
    window.addEventListener('resize', scheduleResize);

    let rafId = 0;
    let lastTs = performance.now();
    let needsClear = false;

    const hasEffects = () => {
      const s = stateRef.current;
      return (
        s.projectiles.length > 0 ||
        s.slashes.length > 0 ||
        s.rings.length > 0 ||
        s.sparks.length > 0 ||
        s.texts.length > 0
      );
    };

    const loop = (now: number) => {
      rafId = 0;
      if (document.hidden) return;
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;
      const s = stateRef.current;
      const { w, h } = sizeRef.current;

      if (!hasEffects()) {
        if (needsClear) {
          ctx.clearRect(0, 0, w, h);
          needsClear = false;
        }
        return;
      }

      needsClear = true;
      ctx.clearRect(0, 0, w, h);

      // Update & draw projectiles
      for (let i = s.projectiles.length - 1; i >= 0; i--) {
        const p = s.projectiles[i];
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.radius * 2.4);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, p.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const reached = (p.vx < 0 && p.x <= p.tx) || (p.vx > 0 && p.x >= p.tx) || p.life > 0.45;
        if (reached) {
          s.rings.push({ x: p.tx, y: p.ty, r: 4, maxR: p.kind === 'CRIT' ? 56 : 36, color: p.color, life: 0 });
          for (let k = 0; k < (p.kind === 'CRIT' ? 14 : 7); k++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 50 + Math.random() * 140;
            s.sparks.push({
              x: p.tx,
              y: p.ty,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              color: p.color,
              size: 2.5,
              life: 0,
              maxLife: 0.35,
            });
          }
          s.projectiles.splice(i, 1);
        }
      }

      // Crescent slash waves
      for (let i = s.slashes.length - 1; i >= 0; i--) {
        const sl = s.slashes[i];
        sl.life += dt * 3.2;
        const alpha = Math.max(0, 1 - sl.life);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        ctx.translate(sl.x, sl.y);
        ctx.rotate(sl.angle);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4.5 * (1 - sl.life * 0.5);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, sl.radius * (0.7 + sl.life * 0.45), -Math.PI * 0.42, Math.PI * 0.42);
        ctx.stroke();
        ctx.strokeStyle = sl.color;
        ctx.lineWidth = 8 * (1 - sl.life * 0.6);
        ctx.beginPath();
        ctx.arc(0, 0, sl.radius * (0.7 + sl.life * 0.45), -Math.PI * 0.38, Math.PI * 0.38);
        ctx.stroke();
        ctx.restore();
        if (sl.life >= 1) s.slashes.splice(i, 1);
      }

      // Update & draw shockwaves
      for (let i = s.rings.length - 1; i >= 0; i--) {
        const rg = s.rings[i];
        rg.life += dt * 2.5;
        const curR = rg.r + (rg.maxR - rg.r) * rg.life;
        ctx.save();
        ctx.strokeStyle = rg.color;
        ctx.globalAlpha = Math.max(0, 1 - rg.life);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(rg.x, rg.y, curR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        if (rg.life >= 1) s.rings.splice(i, 1);
      }

      // Update & draw sparks
      for (let i = s.sparks.length - 1; i >= 0; i--) {
        const sp = s.sparks[i];
        sp.life += dt;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.vy += 120 * dt;
        const alpha = Math.max(0, 1 - sp.life / sp.maxLife);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha;
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (sp.life >= sp.maxLife) s.sparks.splice(i, 1);
      }

      // Floating numbers
      for (let i = s.texts.length - 1; i >= 0; i--) {
        const tx = s.texts[i];
        tx.life += dt;
        tx.y += tx.vy * dt;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - tx.life / 0.85);
        ctx.font = tx.big ? '900 18px "JetBrains Mono", monospace' : '800 14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#090b11';
        ctx.fillText(tx.text, tx.x + 1.5, tx.y + 1.5);
        ctx.fillStyle = tx.color;
        ctx.fillText(tx.text, tx.x, tx.y);
        ctx.restore();
        if (tx.life >= 0.85) s.texts.splice(i, 1);
      }

      if (hasEffects() || needsClear) {
        rafId = requestAnimationFrame(loop);
      }
    };

    const wake = () => {
      if (document.hidden || rafId) return;
      lastTs = performance.now();
      rafId = requestAnimationFrame(loop);
    };
    wakeRef.current = wake;

    const onVisChange = () => {
      if (!document.hidden && (hasEffects() || needsClear)) {
        wake();
      }
    };
    document.addEventListener('visibilitychange', onVisChange);

    return () => {
      wakeRef.current = null;
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(resizeRaf);
      ro?.disconnect();
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('resize', scheduleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 z-20 w-full h-full ${className}`} />;
});

ArenaVfxCanvas.displayName = 'ArenaVfxCanvas';
