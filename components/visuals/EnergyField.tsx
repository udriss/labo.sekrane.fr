// @ts-nocheck
"use client";

import React, { useEffect, useRef } from "react";

// EnergyField: lightweight Three.js background with curved beams and optional mobile sparks.
// - Follows pointer (desktop) and optionally device orientation (mobile).
// - Animation runs only after interaction and pauses when idle.
// - Sparks emit on touch move and decay over time.

export type EnergyFieldProps = {
  height?: number;
  beams?: number;
  maxLength?: number;
  curvature?: number; // 0..1
  segments?: number; // >= 3
  opacity?: number; // 0..1
  colorHueStart?: number;
  colorHueEnd?: number;
  colorSaturation?: number; // 0..1
  colorLightness?: number; // 0..1
  reactionSpeed?: number; // 0..1
  jitterMagnitude?: number;
  idleDelayMs?: number;
  lingerMs?: number;
  dprMax?: number;
  disableCore?: boolean; // hide core sphere
  // Sparks
  sparksEnabled?: boolean;
  sparksCount?: number;
  sparksPerMove?: number;
  sparksLifeMs?: number;
  sparksSpeed?: number;
  sparksSpread?: number;
  sparksColor?: number;
};

export default function EnergyField({
  height = 420,
  beams = 120,
  maxLength = 5,
  curvature = 0.35,
  segments = 12,
  opacity = 0.8,
  colorHueStart = 270,
  colorHueEnd = 0,
  colorSaturation = 0.85,
  colorLightness = 0.55,
  reactionSpeed = 0.18,
  jitterMagnitude = 0.08,
  idleDelayMs = 900,
  lingerMs = 400,
  dprMax = 2,
  disableCore = false,
  sparksEnabled = true,
  sparksCount = 200,
  sparksPerMove = 8,
  sparksLifeMs = 600,
  sparksSpeed = 3.2,
  sparksSpread = 0.4,
  sparksColor = 0x66ccff,
}: EnergyFieldProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const groupRef = useRef<any>(null);
  const linesRef = useRef<any>(null);
  const beamsRef = useRef<Array<{ dir: any; normal: any; baseLen: number }>>([]);
  const pointerRef = useRef<any>(null);
  const lastInputRef = useRef<number>(0);
  const runningRef = useRef<boolean>(false);
  // Sparks
  const pointsRef = useRef<any>(null);
  const sparksRef = useRef<Array<{ p: any; v: any; t: number; alive: boolean }>>([]);
  const sparksAliveRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let THREE: any;
    let raf = 0;
    let lastFrame = performance.now();

    const init = async () => {
      THREE = await import("three");

      pointerRef.current = new THREE.Vector3();

      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(
        55,
        container.clientWidth / height,
        0.1,
        100
      );
      camera.position.set(0, 0, 8);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        alpha: true, // active l'alpha pour rendre le canvas transparent
      });
      // rendre le clear fully transparent
      renderer.setClearColor(0x000000, 0); // couleur 0 + alpha 0
      renderer.setClearAlpha(0);
      // Forcer le container DOM à rester transparent (sécurité CSS)
      container.style.background = "transparent";

      renderer.setPixelRatio(Math.min(dprMax, window.devicePixelRatio || 1));
      renderer.setSize(container.clientWidth, height);
      rendererRef.current = renderer;
      container.appendChild(renderer.domElement);

      const group = new THREE.Group();
      groupRef.current = group;
      scene.add(group);
      scene.add(new THREE.AmbientLight(0x404060, 0.6));
      scene.add(new THREE.PointLight(0x6aa4ff, 1.2, 50));
  // Noyau discret (petite sphère, optionnel)
  const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 20, 20),
        new THREE.MeshPhongMaterial({
          color: 0x6aa4ff,
          emissive: 0x1a2a66,
          emissiveIntensity: 0.9,
          shininess: 60,
        })
      );
  if (!disableCore) group.add(core);

      // Lignes courbées (spaghetti) via segments de Bézier quadratique [p0, p1, p2]
      const segs = Math.max(3, Math.floor(segments));
      const pairPerBeam = segs - 1; // nombre de segments
      const positions = new Float32Array(beams * pairPerBeam * 2 * 3); // p[k] -> p[k+1]
      const colors = new Float32Array(beams * pairPerBeam * 2 * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
      });
      const lines = new THREE.LineSegments(geometry, material);
      linesRef.current = lines;
      group.add(lines);

      const tmpColor = new THREE.Color();
      const spectrum = (i: number) => {
        const hue =
          colorHueStart +
          (colorHueEnd - colorHueStart) * (i / Math.max(1, beams - 1));
        tmpColor.setHSL((hue % 360) / 360, colorSaturation, colorLightness);
        return { r: tmpColor.r, g: tmpColor.g, b: tmpColor.b };
      };

      beamsRef.current = [];
      let writeIdx = 0;
      for (let i = 0; i < beams; i++) {
        // Direction de base aléatoire
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const dir = new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.sin(phi) * Math.sin(theta),
          Math.cos(phi)
        ).normalize();
        // Vecteur normal pour la courbure (orthogonal approximatif)
        const rand = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize();
        const normal = new THREE.Vector3().crossVectors(dir, rand).normalize();
        const baseLen = maxLength * (0.5 + 0.5 * Math.random());
        const col = spectrum(i);
        beamsRef.current.push({ dir, normal, baseLen });

        // Init courbe droite (pas de courbure) p0->p2 pour remplir le buffer
        const p0 = new THREE.Vector3(0, 0, 0);
        const p2 = dir.clone().multiplyScalar(baseLen);
        for (let s = 0; s < segs - 1; s++) {
          const t0 = s / (segs - 1);
          const t1 = (s + 1) / (segs - 1);
          const q0 = p0.clone().lerp(p2, t0);
          const q1 = p0.clone().lerp(p2, t1);
          positions.set([q0.x, q0.y, q0.z], writeIdx);
          colors.set([col.r, col.g, col.b], writeIdx); // start
          writeIdx += 3;
          positions.set([q1.x, q1.y, q1.z], writeIdx);
          colors.set([col.r, col.g, col.b], writeIdx); // end
          writeIdx += 3;
        }
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;

      // Sparks (mobile slide)
      if (sparksEnabled) {
        const spPositions = new Float32Array(sparksCount * 3);
        const spGeometry = new THREE.BufferGeometry();
        spGeometry.setAttribute("position", new THREE.BufferAttribute(spPositions, 3));
        spGeometry.setDrawRange(0, 0);
        const spMaterial = new THREE.PointsMaterial({
          color: sparksColor,
          size: 2,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
        });
        const points = new THREE.Points(spGeometry, spMaterial);
        pointsRef.current = points;
        group.add(points);
        sparksRef.current = new Array(sparksCount)
          .fill(0)
          .map(() => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), t: 0, alive: false }));
        sparksAliveRef.current = 0;
      }

      const emitSparks = (dir: any, count: number) => {
        if (!sparksEnabled || sparksRef.current.length === 0) return;
        const base = dir.clone().normalize();
        for (let n = 0; n < count; n++) {
          const idx = sparksRef.current.findIndex((s) => !s.alive);
          if (idx === -1) break;
          const s = sparksRef.current[idx];
          s.p.set(0, 0, 0);
          const rnd = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
          const v = base.clone().add(rnd.multiplyScalar(sparksSpread)).normalize().multiplyScalar(sparksSpeed);
          s.v.copy(v);
          s.t = sparksLifeMs;
          s.alive = true;
        }
      };

      const onPointerMove = (e: PointerEvent) => {
        const rect = container.getBoundingClientRect();
        const xRaw = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const yRaw = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        const x = Math.max(-1, Math.min(1, xRaw));
        const y = Math.max(-1, Math.min(1, yRaw));
        pointerRef.current.set(x, y, 0.5).unproject(camera).sub(camera.position).normalize();
        lastInputRef.current = performance.now();
        startLoop();
      };
  // Gate listeners by device capability
  const supportsTouch = 'ontouchstart' in window || (navigator as any).maxTouchPoints > 0;
  const supportsFinePointer = typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (supportsFinePointer) window.addEventListener("pointermove", onPointerMove, { passive: true });

      const onTouchMove = (e: TouchEvent) => {
        if (!e.touches[0]) return;
        const rect = container.getBoundingClientRect();
        const xRaw = ((e.touches[0].clientX - rect.left) / rect.width) * 2 - 1;
        const yRaw = -(((e.touches[0].clientY - rect.top) / rect.height) * 2 - 1);
        const x = Math.max(-1, Math.min(1, xRaw));
        const y = Math.max(-1, Math.min(1, yRaw));
        pointerRef.current.set(x, y, 0.5).unproject(camera).sub(camera.position).normalize();
        lastInputRef.current = performance.now();
        if (sparksEnabled && pointsRef.current) emitSparks(pointerRef.current, sparksPerMove);
        startLoop();
      };
  if (supportsTouch) window.addEventListener("touchmove", onTouchMove, { passive: true });

  // Gyroscope removed to save resources

      const onResize = () => {
        const w = container.clientWidth;
        const h = height;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);

      // Animation contrôlée (pause quand inactif)
      const tmp = new THREE.Vector3();
      const computeCurvePoint = (
        p0: any,
        p1: any,
        p2: any,
        t: number,
        out: any
      ) => {
        const u = 1 - t;
        out
          .copy(p0)
          .multiplyScalar(u * u)
          .add(p1.clone().multiplyScalar(2 * u * t))
          .add(p2.clone().multiplyScalar(t * t));
        return out;
      };
      const updateFrame = () => {
        const now = performance.now();
        const dt = Math.min(0.033, (now - lastFrame) / 1000);
        lastFrame = now;
        const elapsed = now - lastInputRef.current;
        const pos = geometry.getAttribute("position");

        if (groupRef.current) {
          tmp.copy(pointerRef.current).multiplyScalar(0.15);
          groupRef.current.position.lerp(tmp, 0.12);
        }

        let idx = 0;
        for (let i = 0; i < beamsRef.current.length; i++) {
          const b = beamsRef.current[i];
          const decay = Math.max(0, 1 - Math.max(0, elapsed - idleDelayMs) / Math.max(1, lingerMs));
          const j = jitterMagnitude * decay;
          b.dir.add(new THREE.Vector3((Math.random() - 0.5) * j, (Math.random() - 0.5) * j, (Math.random() - 0.5) * j)).normalize();
          const target = pointerRef.current && pointerRef.current.lengthSq() > 0 ? pointerRef.current : new THREE.Vector3(0, 0, 1);
          b.dir.lerp(target, reactionSpeed * (decay > 0 ? 1 : 0)).normalize();

          const len = b.baseLen;
          const p0 = new THREE.Vector3(0, 0, 0);
          const p2 = b.dir.clone().multiplyScalar(len);
          const curveMag = curvature * len * 0.5;
          const p1 = p0.clone().lerp(p2, 0.5).add(b.normal.clone().multiplyScalar(curveMag));

          let prev = new THREE.Vector3();
          let curr = new THREE.Vector3();
          computeCurvePoint(p0, p1, p2, 0, prev);
          for (let s = 1; s < segs; s++) {
            const t = s / (segs - 1);
            computeCurvePoint(p0, p1, p2, t, curr);
            pos.setXYZ(idx++, prev.x, prev.y, prev.z);
            pos.setXYZ(idx++, curr.x, curr.y, curr.z);
            prev.copy(curr);
          }
        }
        pos.needsUpdate = true;

        // Update sparks
        if (sparksEnabled && pointsRef.current) {
          const pGeo = pointsRef.current.geometry as any;
          const pAttr = pGeo.getAttribute("position");
          let aliveCount = 0;
          for (let i = 0; i < sparksRef.current.length; i++) {
            const s = sparksRef.current[i];
            if (!s.alive) continue;
            s.t -= dt * 1000;
            if (s.t <= 0) {
              s.alive = false;
              continue;
            }
            s.p.add(s.v.clone().multiplyScalar(dt));
            pAttr.setXYZ(aliveCount++, s.p.x, s.p.y, s.p.z);
          }
          pGeo.setDrawRange(0, aliveCount);
          pAttr.needsUpdate = true;
          sparksAliveRef.current = aliveCount;
        }

        renderer.render(scene, camera);

        // Pause si inactif au-delà du délai + estompation
        if (elapsed > idleDelayMs + lingerMs) {
          runningRef.current = false;
          cancelAnimationFrame(raf);
          return;
        }
        raf = requestAnimationFrame(updateFrame);
      };

      const startLoop = () => {
        if (runningRef.current) return;
        runningRef.current = true;
        raf = requestAnimationFrame(updateFrame);
      };

      // Démarrer uniquement sur interaction
      onResize();

      return () => {
        runningRef.current = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("pointermove", onPointerMove as any);
        window.removeEventListener("touchmove", onTouchMove as any);
        if (rendererRef.current) {
          container.removeChild(rendererRef.current.domElement);
          rendererRef.current.dispose();
        }
        if (linesRef.current) {
          linesRef.current.geometry?.dispose?.();
          linesRef.current.material?.dispose?.();
        }
      };
    };

    let dispose: (() => void) | undefined;
    init().then((d) => {
      dispose = d as any;
    });

    return () => {
      dispose?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    height,
    beams,
    maxLength,
    curvature,
    segments,
    opacity,
    colorHueStart,
    colorHueEnd,
    colorSaturation,
    colorLightness,
    reactionSpeed,
    jitterMagnitude,
    idleDelayMs,
    lingerMs,
    dprMax,
  disableCore,
  ]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height, position: "relative" }}
    />
  );
}
