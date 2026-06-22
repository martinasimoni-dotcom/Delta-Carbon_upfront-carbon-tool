import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { useBuilding } from "@/state/building";
import { getMaterial } from "@/lib/materials";
import { materialHex } from "@/lib/swatches";

const PINE = new THREE.Color("#2C5F4C");
const PLOT_SIZE = 50;

// Simplified Diagonal Mar context block layout (lat/lon → local meters baked)
// X+ = east, Z+ = south, sea is east of plot.
type Ctx = { x: number; z: number; w: number; d: number; h: number };
const CONTEXT_BLOCKS: Ctx[] = [
  // Diagonal Mar towers (north-west)
  { x: -120, z: -90, w: 35, d: 35, h: 110 },
  { x: -70, z: -110, w: 28, d: 28, h: 85 },
  { x: -160, z: -40, w: 40, d: 30, h: 70 },
  // Mall + low blocks (west)
  { x: -180, z: 60, w: 90, d: 60, h: 25 },
  { x: -90, z: 80, w: 50, d: 45, h: 35 },
  // Residential strip (south)
  { x: -40, z: 140, w: 60, d: 25, h: 45 },
  { x: 40, z: 150, w: 55, d: 22, h: 50 },
  { x: 110, z: 145, w: 45, d: 22, h: 40 },
  // Front Marítim (north)
  { x: -20, z: -180, w: 70, d: 30, h: 60 },
  { x: 80, z: -170, w: 45, d: 28, h: 75 },
  // Hotel-like (north-east)
  { x: 140, z: -100, w: 35, d: 35, h: 95 },
  // Parc del Forum edge (south-east low)
  { x: 200, z: 100, w: 60, d: 50, h: 12 },
  { x: 180, z: 180, w: 80, d: 40, h: 8 },
];

export function Viewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const buildingGroupRef = useRef<THREE.Group | null>(null);
  const plotRef = useRef<THREE.Mesh | null>(null);

  const dims = useBuilding((s) => s.dims);
  const modelUrl = useBuilding((s) => s.modelUrl);
  const modelKind = useBuilding((s) => s.modelKind);
  const elements = useBuilding((s) => s.elements);
  const transform = useBuilding((s) => s.transform);
  const setUploadOpen = useBuilding((s) => s.setUploadOpen);
  const setModelSize = useBuilding((s) => s.setModelSize);

  // Init
  useEffect(() => {
    const container = containerRef.current!;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeaf2f7);
    scene.fog = new THREE.Fog(0xeaf2f7, 600, 1400);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.5, 5000);
    camera.position.set(280, 280, 280);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 20, 0);
    controls.minDistance = 50;
    controls.maxDistance = 800;
    controls.maxPolarAngle = Math.PI / 2.05;
    controlsRef.current = controls;

    // Lights — Barcelona southwest sun
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc7d4dc, 0.7));
    const sun = new THREE.DirectionalLight(0xfff3e0, 1.1);
    sun.position.set(-180, 250, -150);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -400;
    sun.shadow.camera.right = 400;
    sun.shadow.camera.top = 400;
    sun.shadow.camera.bottom = -400;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 800;
    scene.add(sun);

    // ── Ground tiles ─────────────────────────────────────────
    // Urban base
    const urban = new THREE.Mesh(
      new THREE.PlaneGeometry(800, 800),
      new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 1 })
    );
    urban.rotation.x = -Math.PI / 2;
    urban.position.y = -0.05;
    urban.receiveShadow = true;
    scene.add(urban);

    // Sea (east side)
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 1000),
      new THREE.MeshStandardMaterial({ color: 0xb3d9ff, roughness: 0.4, transparent: true, opacity: 0.92 })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(550, 0, 0);
    scene.add(sea);

    // Beach strip
    const beach = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 800),
      new THREE.MeshStandardMaterial({ color: 0xf0e6cf, roughness: 1 })
    );
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(230, 0.01, 0);
    scene.add(beach);

    // Parc del Fòrum (south-east green)
    const park = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 200),
      new THREE.MeshStandardMaterial({ color: 0xdce9d4, roughness: 1 })
    );
    park.rotation.x = -Math.PI / 2;
    park.position.set(160, 0.02, 220);
    scene.add(park);

    // Tree dots
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x6b8f5a });
    for (let i = 0; i < 30; i++) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(2, 5, 6), treeMat);
      t.position.set(60 + Math.random() * 200, 2.5, 130 + Math.random() * 180);
      scene.add(t);
    }

    // ── Streets ──────────────────────────────────────────────
    const streetMat = new THREE.MeshBasicMaterial({ color: 0x999999 });
    const addStreet = (w: number, d: number, x: number, z: number, rotY = 0) => {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(w, d), streetMat);
      s.rotation.x = -Math.PI / 2;
      s.rotation.z = rotY;
      s.position.set(x, 0.03, z);
      scene.add(s);
    };
    // Avinguda Diagonal — diagonal NW-SE
    addStreet(800, 16, 0, 0, Math.PI / 4);
    // Ronda Litoral — coastal
    addStreet(12, 800, 200, 0);
    // Cross streets
    addStreet(800, 7, 0, -60);
    addStreet(800, 7, 0, 60);
    addStreet(7, 800, -100, 0);
    addStreet(7, 800, 100, 0);

    // ── Context buildings ───────────────────────────────────
    const ctxMat = new THREE.MeshStandardMaterial({ color: 0xe2e2e0, roughness: 0.95 });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xb8b8b8, transparent: true, opacity: 0.6 });
    for (const b of CONTEXT_BLOCKS) {
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const m = new THREE.Mesh(geo, ctxMat);
      m.position.set(b.x, b.h / 2, b.z);
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
      e.position.copy(m.position);
      scene.add(e);
    }

    // ── Empty plot ──────────────────────────────────────────
    const plotGeo = new THREE.PlaneGeometry(PLOT_SIZE, PLOT_SIZE);
    const plotMat = new THREE.MeshBasicMaterial({
      color: 0x2c5f4c,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const plot = new THREE.Mesh(plotGeo, plotMat);
    plot.rotation.x = -Math.PI / 2;
    plot.position.y = 0.06;
    plot.userData.clickable = true;
    scene.add(plot);
    plotRef.current = plot;

    // Plot border
    const borderPts = [
      new THREE.Vector3(-PLOT_SIZE / 2, 0.07, -PLOT_SIZE / 2),
      new THREE.Vector3(PLOT_SIZE / 2, 0.07, -PLOT_SIZE / 2),
      new THREE.Vector3(PLOT_SIZE / 2, 0.07, PLOT_SIZE / 2),
      new THREE.Vector3(-PLOT_SIZE / 2, 0.07, PLOT_SIZE / 2),
      new THREE.Vector3(-PLOT_SIZE / 2, 0.07, -PLOT_SIZE / 2),
    ];
    const border = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(borderPts),
      new THREE.LineBasicMaterial({ color: 0x2c5f4c, linewidth: 2 })
    );
    scene.add(border);

    // ── Building group ──────────────────────────────────────
    const bg = new THREE.Group();
    buildingGroupRef.current = bg;
    scene.add(bg);

    // ── Click raycasting ────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(plot);
      if (hits.length > 0 && !useBuilding.getState().modelUrl) {
        // Zoom toward plot
        const target = new THREE.Vector3(0, 30, 0);
        const desired = new THREE.Vector3(60, 70, 80);
        animateCamera(camera, controls, desired, target);
        setUploadOpen(true);
      }
    };
    renderer.domElement.addEventListener("click", onClick);

    // Cursor hint
    const onMove = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(plot);
      renderer.domElement.style.cursor = hits.length && !useBuilding.getState().modelUrl ? "pointer" : "grab";
    };
    renderer.domElement.addEventListener("mousemove", onMove);

    let raf = 0;
    const animate = () => {
      // pulse plot opacity when empty
      if (!useBuilding.getState().modelUrl) {
        plotMat.opacity = 0.3 + Math.sin(performance.now() * 0.002) * 0.15;
      } else {
        plotMat.opacity = 0.15;
      }
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("mousemove", onMove);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [setUploadOpen]);

  // Update building geometry
  useEffect(() => {
    const bg = buildingGroupRef.current;
    if (!bg) return;
    while (bg.children.length) {
      const c = bg.children.pop()!;
      (c as THREE.Mesh).geometry?.dispose?.();
    }

    const colorOf = (kind: string) => {
      const el = elements.find((e) => e.kind === kind);
      return el ? new THREE.Color(materialHex(getMaterial(el.materialId))) : PINE;
    };
    const envColor = colorOf("envelope");
    const envMat = new THREE.MeshStandardMaterial({ color: envColor, roughness: 0.7 });

    if (modelUrl) {
      const onLoaded = (obj: THREE.Object3D) => {
        const box = new THREE.Box3().setFromObject(obj);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        obj.position.sub(center);
        obj.position.y += size.y / 2;
        obj.traverse((c) => {
          const m = c as THREE.Mesh;
          if (m.isMesh) {
            m.material = envMat;
            m.castShadow = true;
            m.receiveShadow = true;
          }
        });
        bg.add(obj);
        setModelSize({ x: size.x, y: size.y, z: size.z });
      };
      if (modelKind === "gltf") {
        new GLTFLoader().load(modelUrl, (g) => onLoaded(g.scene), undefined, (e) => console.error(e));
      } else if (modelKind === "obj") {
        new OBJLoader().load(modelUrl, onLoaded, undefined, (e) => console.error(e));
      }
    } else {
      // Default massing on plot
      const foundationH = 1.5;
      const roofH = 1.2;
      const bodyH = Math.max(1, dims.height - foundationH - roofH);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.4 });
      const addBox = (w: number, h: number, d: number, y: number, color: THREE.Color) => {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.75 }));
        mesh.position.y = y;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        bg.add(mesh);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
        edges.position.copy(mesh.position);
        bg.add(edges);
      };
      addBox(dims.width + 1, foundationH, dims.depth + 1, foundationH / 2, colorOf("foundation"));
      addBox(dims.width, bodyH, dims.depth, foundationH + bodyH / 2, envColor);
      addBox(dims.width + 0.6, roofH, dims.depth + 0.6, foundationH + bodyH + roofH / 2, colorOf("roof"));
    }
  }, [dims, modelUrl, modelKind, elements, setModelSize]);

  // Apply transform to model group
  useEffect(() => {
    const bg = buildingGroupRef.current;
    if (!bg || !modelUrl) return;
    bg.scale.setScalar(transform.scale);
    bg.rotation.y = (transform.rotationY * Math.PI) / 180;
    bg.position.set(transform.x, 0, transform.z);
  }, [transform, modelUrl]);

  return <div ref={containerRef} className="h-full w-full" data-viewport />;
}

// Smooth camera tween
function animateCamera(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  toPos: THREE.Vector3,
  toTarget: THREE.Vector3,
  duration = 1500
) {
  const fromPos = camera.position.clone();
  const fromTarget = controls.target.clone();
  const start = performance.now();
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const step = () => {
    const t = Math.min(1, (performance.now() - start) / duration);
    const k = ease(t);
    camera.position.lerpVectors(fromPos, toPos, k);
    controls.target.lerpVectors(fromTarget, toTarget, k);
    if (t < 1) requestAnimationFrame(step);
  };
  step();
}

export const captureViewport = (): string | null => {
  const canvas = document.querySelector<HTMLCanvasElement>("[data-viewport] canvas");
  return canvas ? canvas.toDataURL("image/png") : null;
};
