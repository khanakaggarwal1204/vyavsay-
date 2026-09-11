import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import "./guide3d.css";
import { keepAvatarVisible } from "./guideAsset.js";

const clips = { idle: "/avatars/idle.fbx", talking: "/avatars/Talking.fbx", walking: "/avatars/walking.fbx", waving: "/avatars/Waving.fbx" };

export default function Guide3D({ state = "idle", fallback, zoom = 1.55 }) {
  const host = useRef(null), actions = useRef({}), current = useRef(null), stateRef = useRef(state), cameraRef = useRef(null);
  const [ready, setReady] = useState(false), [hasError, setHasError] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element) return undefined;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100), renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    cameraRef.current = camera; camera.zoom = zoom; camera.position.set(0, 1.15, 4.2); camera.lookAt(0, 1.05, 0); camera.updateProjectionMatrix(); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; element.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xf4ffff, 0x315f66, 2.2)); const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(2, 4, 3); scene.add(key);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.15, 48), new THREE.MeshBasicMaterial({ color: 0x8bbdb7, transparent: true, opacity: 0.32 })); floor.rotation.x = -Math.PI / 2; floor.position.y = 0.02; scene.add(floor);
    let mixer, disposed = false, welcomeTimer; const gltfLoader = new GLTFLoader(), fbxLoader = new FBXLoader(); const loadFbx = (url) => new Promise((resolve, reject) => fbxLoader.load(url, resolve, undefined, reject));
    const failSafe = window.setTimeout(() => { if (!disposed) setHasError(true); }, 8000);
    Promise.all([new Promise((resolve, reject) => gltfLoader.load("/avatars/vyavsay-guide.glb", resolve, undefined, reject)), ...Object.entries(clips).map(([name, url]) => loadFbx(url).then((asset) => [name, asset]).catch(() => [name, null]))]).then(([gltf, ...loadedClips]) => {
      if (disposed) return; const model = gltf.scene; let hasMesh = false; model.position.y = 0; model.scale.setScalar(1.18); model.traverse((child) => { if (child.isMesh) { hasMesh = true; child.castShadow = true; child.frustumCulled = false; } }); if (!hasMesh) throw new Error("Guide model has no visible meshes"); scene.add(model); const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3()); model.position.y -= bounds.min.y; camera.position.z = Math.max(3.2, size.y * 1.7); camera.lookAt(center.x, size.y * 0.48, center.z); mixer = new THREE.AnimationMixer(model);
      loadedClips.forEach(([name, asset]) => { if (asset?.animations?.[0]) { try { const clip = SkeletonUtils.retargetClip(model, asset, asset.animations[0]); actions.current[name] = mixer.clipAction(clip); } catch { actions.current[name] = mixer.clipAction(asset.animations[0]); } } });
      if (!actions.current.idle && gltf.animations?.[0]) actions.current.idle = mixer.clipAction(gltf.animations[0]);
      setReady(true); window.clearTimeout(failSafe); play(stateRef.current === "idle" ? "waving" : stateRef.current === "listening" ? "waving" : stateRef.current);
      welcomeTimer = window.setTimeout(() => { if (!disposed) play(stateRef.current === "listening" ? "waving" : stateRef.current); }, 2200);
    }).catch(() => { if (!disposed) { window.clearTimeout(failSafe); setHasError(true); } });
    const resize = () => { const width = element.clientWidth || 320, height = element.clientHeight || 480; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); }; resize(); const observer = new ResizeObserver(resize); observer.observe(element); const clock = new THREE.Clock();
    const loop = () => { if (disposed) return; requestAnimationFrame(loop); mixer?.update(clock.getDelta()); renderer.render(scene, camera); }; loop();
    return () => { disposed = true; cameraRef.current = null; window.clearTimeout(failSafe); window.clearTimeout(welcomeTimer); observer.disconnect(); renderer.dispose(); renderer.domElement.remove(); scene.traverse((object) => { object.geometry?.dispose?.(); if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => material.dispose?.()); }); };
    function play(name) { const next = actions.current[name] || actions.current.idle; if (!next || current.current === next) return; current.current?.fadeOut(0.25); next.reset().fadeIn(0.25).play(); current.current = next; }
  }, []);
  useEffect(() => { if (cameraRef.current) { cameraRef.current.zoom = zoom; cameraRef.current.updateProjectionMatrix(); } }, [zoom]);
  useEffect(() => { stateRef.current = state; const requested = state === "listening" ? "waving" : state; const next = actions.current[requested] || actions.current.idle; if (!next || current.current === next) return; current.current?.fadeOut(0.25); next.reset().fadeIn(0.25).play(); current.current = next; }, [state]);
  return <div ref={host} className={`guide-3d guide-state-${state} ${ready ? "is-ready" : ""} ${hasError ? "has-error" : ""}`} aria-label="Animated Neerja guide"><img className="guide-3d-fallback" src={fallback} onError={keepAvatarVisible} alt=""/><span className="guide-3d-loading">Loading guide...</span></div>;
}
