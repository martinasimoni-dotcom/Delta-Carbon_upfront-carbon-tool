import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useBuilding } from "@/state/building";

export function BuildingViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const dims = useBuilding((s) => s.dims);
  const dimsRef = useRef(dims);
  dimsRef.current = dims;

  // true while no real OBJ has been loaded into the scene yet
  const [waiting, setWaiting] = useState(true);
  // flipping this boolean restarts polling (used by the refresh button)
  const [pollKey, setPollKey] = useState(0);

  // Refs shared between the Three.js effect and the polling effect
  const loadModelRef = useRef<((objText: string) => void) | null>(null);

  // ── Three.js scene (mount once) ──────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd4d0c8);

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      10000,
    );
    camera.position.set(0, 80, 150);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    // touch-action: none is required for OrbitControls pointer events on both
    // touch devices and browsers that use pointer events (e.g. Chrome).
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(80, 120, 60);
    sun.castShadow = true;
    scene.add(sun);

    const grid = new THREE.GridHelper(200, 20, 0xa8a49c, 0xb8b4ac);
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.rotateSpeed = 1.0;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.minDistance = 5;
    controls.maxDistance = 2000;

    let modelGroup: THREE.Group | null = null;

    const material = new THREE.MeshPhongMaterial({
      color: 0x3cb371,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    });

    // Expose loadModel so the polling effect can call it
    loadModelRef.current = (objText: string) => {
      if (modelGroup) {
        scene.remove(modelGroup);
        modelGroup.traverse((o) => {
          if (o instanceof THREE.Mesh) o.geometry.dispose();
        });
        modelGroup = null;
      }

      const loader = new OBJLoader();
      const obj = loader.parse(objText);

      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = material;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      const box = new THREE.Box3().setFromObject(obj);
      const size = new THREE.Vector3();
      box.getSize(size);

      const targetHeight = dimsRef.current.height;
      const scaleFactor = size.y > 0 ? targetHeight / size.y : 1;
      obj.scale.setScalar(scaleFactor);

      box.setFromObject(obj);
      const center = new THREE.Vector3();
      box.getCenter(center);
      obj.position.sub(center);
      box.setFromObject(obj);
      obj.position.y -= box.min.y;

      modelGroup = obj;
      scene.add(modelGroup);

      controls.target.set(0, targetHeight / 2, 0);
      camera.position.set(0, targetHeight * 0.8, targetHeight * 2);
      controls.update();
    };

    const ro = new ResizeObserver(() => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    });
    ro.observe(mount);

    let rafId: number;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      loadModelRef.current = null;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  // ── Polling effect — reruns when pollKey changes ─────────────────────────
  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval>;

    const tryFetch = async () => {
      try {
        const res = await fetch("/api/model/current");
        if (!res.ok) return;
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("model/obj")) return;
        const text = await res.text();
        if (!text.trim() || cancelled) return;
        loadModelRef.current?.(text);
        setWaiting(false);
        clearInterval(intervalId); // stop polling once loaded
      } catch {
        // server not ready yet — keep polling
      }
    };

    // Immediate attempt, then every 2 s
    tryFetch();
    intervalId = setInterval(tryFetch, 2000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [pollKey]);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" style={{ touchAction: "none" }} />

      {waiting && (
        <div className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none">
          <div className="flex items-center gap-2 rounded-md bg-black/60 px-4 py-2 text-sm text-white/70 backdrop-blur-sm">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-400" />
            Waiting for Rhino...
            <button
              className="pointer-events-auto ml-3 text-white/50 underline hover:text-white/90 transition-colors"
              onClick={() => setPollKey((k) => k + 1)}
            >
              refresh
            </button>
          </div>
        </div>
      )}

      {!waiting && (
        <div className="absolute bottom-4 right-4">
          <button
            className="rounded-md bg-black/50 px-3 py-1 text-xs text-white/60 backdrop-blur-sm hover:text-white/90 transition-colors"
            onClick={() => { setWaiting(true); setPollKey((k) => k + 1); }}
          >
            ↺ refresh model
          </button>
        </div>
      )}
    </div>
  );
}
