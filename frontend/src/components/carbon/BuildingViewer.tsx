import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useBuilding } from "@/state/building";
import { registerCapture } from "@/lib/viewer-screenshot";

export function BuildingViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const dims = useBuilding((s) => s.dims);
  const dimsRef = useRef(dims);
  dimsRef.current = dims;
  const selectedElement = useBuilding((s) => s.selectedElement);
  const setSelectedElement = useBuilding((s) => s.setSelectedElement);

  // true while no real OBJ has been loaded into the scene yet
  const [waiting, setWaiting] = useState(true);
  // flipping this boolean restarts polling (used by the refresh button)
  const [pollKey, setPollKey] = useState(0);

  // Refs shared between the Three.js effect and the highlight/polling effects
  const loadModelRef = useRef<((objText: string) => void) | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // ── Three.js scene (mount once) ──────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xE8E8E8);
    sceneRef.current = scene;

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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    // touch-action: none is required for OrbitControls pointer events on both
    // touch devices and browsers that use pointer events (e.g. Chrome).
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    cameraRef.current = camera;

    registerCapture(() => {
      renderer.render(scene, camera);
      const canvas = renderer.domElement;
      const scale = Math.min(1, 1024 / canvas.width);
      if (scale >= 1) return canvas.toDataURL("image/jpeg", 0.85);
      const tmp = document.createElement("canvas");
      tmp.width = Math.round(canvas.width * scale);
      tmp.height = Math.round(canvas.height * scale);
      tmp.getContext("2d")!.drawImage(canvas, 0, 0, tmp.width, tmp.height);
      return tmp.toDataURL("image/jpeg", 0.85);
    });

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(1, 2, 1);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(-1, 0.5, -1);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xcccccc, 0.15);
    dirLight3.position.set(0, -1, 0);
    scene.add(dirLight3);

    const grid = new THREE.GridHelper(200, 40, 0xAAAAAA, 0xCCCCCC);
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

    const ELEMENT_COLORS: Record<string, number> = {
      foundation: 0xAAAAAA,
      structure:  0xBBBBBB,
      envelope:   0xCCCCCC,
      floors:     0xB8B8B8,
      roof:       0xD5D5D5,
      default:    0xC8C8C8,
    };

    function makeMaterial(color: number) {
      return new THREE.MeshPhongMaterial({
        color,
        specular: 0x222222,
        shininess: 15,
        side: THREE.DoubleSide,
      });
    }

    function resolveElementType(name: string): string {
      const n = name.toLowerCase();
      if (n.includes("foundation") || n.includes("footing")) return "foundation";
      if (n.includes("structure") || n.includes("column") || n.includes("beam")) return "structure";
      if (n.includes("envelope") || n.includes("facade") || n.includes("wall") || n.includes("cladding")) return "envelope";
      if (n.includes("floor") || n.includes("slab")) return "floors";
      if (n.includes("roof")) return "roof";
      return "default";
    }

    // Expose loadModel so the polling effect can call it
    loadModelRef.current = (objText: string) => {
      if (modelGroup) {
        scene.remove(modelGroup);
        modelGroup.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
            else o.material.dispose();
          }
        });
        modelGroup = null;
      }

      const loader = new OBJLoader();
      const obj = loader.parse(objText);

      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const elementType = resolveElementType(child.name || child.parent?.name || "");
          child.material = makeMaterial(ELEMENT_COLORS[elementType] ?? ELEMENT_COLORS.default);
          child.userData.elementType = elementType;
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
      registerCapture(() => null);
      loadModelRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  // ── Highlight effect — reruns when selectedElement changes ──────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const ELEMENT_COLORS_HIGHLIGHT: Record<string, number> = {
      foundation: 0xAAAAAA,
      structure:  0xBBBBBB,
      envelope:   0xCCCCCC,
      floors:     0xB8B8B8,
      roof:       0xD5D5D5,
      default:    0xC8C8C8,
    };

    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const elementType: string = child.userData.elementType ?? "default";

      if (selectedElement === null) {
        child.material = new THREE.MeshPhongMaterial({
          color: ELEMENT_COLORS_HIGHLIGHT[elementType] ?? ELEMENT_COLORS_HIGHLIGHT.default,
          specular: 0x222222,
          shininess: 15,
          side: THREE.DoubleSide,
          transparent: false,
          opacity: 1,
        });
      } else if (elementType === selectedElement) {
        child.material = new THREE.MeshPhongMaterial({
          color: 0x1a4731,
          specular: 0x444444,
          shininess: 30,
          side: THREE.DoubleSide,
          transparent: false,
          opacity: 1,
        });
      } else {
        child.material = new THREE.MeshPhongMaterial({
          color: 0x888888,
          specular: 0x111111,
          shininess: 5,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.4,
        });
      }
    });
  }, [selectedElement]);

  // ── Raycasting — click on mesh selects/deselects element ────────────────────
  useEffect(() => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!renderer || !camera || !scene) return;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const canvas = renderer.domElement;

    const onClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const clicked = intersects[0].object;
        const elementType: string | undefined = clicked.userData.elementType;
        if (elementType) {
          setSelectedElement(
            sceneRef.current ? (elementType === (useBuilding.getState().selectedElement) ? null : elementType) : null
          );
          return;
        }
      }
      // Click on empty space — deselect
      setSelectedElement(null);
    };

    canvas.addEventListener("click", onClick);
    return () => canvas.removeEventListener("click", onClick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
