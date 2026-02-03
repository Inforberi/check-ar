"use client";

import { useEffect, useState, Suspense } from "react";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { USDLoader } from "three/examples/jsm/loaders/USDLoader.js";

interface ModelViewer3dProps {
  src: string;
  alt: string;
  /** Высота области в пикселях */
  height?: number;
  className?: string;
  /** Исходный URL (для fallback) */
  rawUrl?: string;
  /** Компонент для показа при ошибке (например, для .usdz в не-Safari) */
  onErrorFallback?: () => ReactNode;
}

function Model3d({ url, onLoad, onError }: { url: string; onLoad: () => void; onError: (e: Error) => void }) {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const isUsdz = url.toLowerCase().includes(".usdz") || url.toLowerCase().includes("usdz");

  useEffect(() => {
    let mounted = true;

    const loadModel = async () => {
      try {
        let loadedModel: THREE.Group;

        if (isUsdz) {
          // Для .usdz используем USDLoader
          const loader = new USDLoader();
          loadedModel = await loader.loadAsync(url);
        } else {
          // Для .glb используем GLTFLoader
          const loader = new GLTFLoader();
          const gltf = await loader.loadAsync(url);
          loadedModel = gltf.scene;
        }

        if (mounted) {
          // Сразу вычисляем и применяем трансформацию, чтобы модель была правильного размера
          const box = new THREE.Box3().setFromObject(loadedModel);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = maxDim > 0 ? 2 / maxDim : 1;

          // Применяем трансформацию к модели сразу
          loadedModel.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
          loadedModel.scale.setScalar(scale);
          loadedModel.updateMatrixWorld();

          setModel(loadedModel);
          onLoad();
        }
      } catch (e) {
        if (mounted) {
          const errorMsg = isUsdz
            ? "Failed to load USDZ model"
            : "Failed to load GLB model";
          onError(e instanceof Error ? e : new Error(errorMsg));
        }
      }
    };

    loadModel();
    return () => {
      mounted = false;
    };
  }, [url, isUsdz, onLoad, onError]);

  if (!model) return null;

  // Модель уже отцентрована и масштабирована
  return <primitive object={model} />;
}

export function ModelViewer3d({
  src,
  alt,
  height = 280,
  className = "",
  rawUrl,
  onErrorFallback,
}: ModelViewer3dProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkUrl = rawUrl || src;
  const isUsdz = checkUrl.toLowerCase().includes(".usdz") || checkUrl.toLowerCase().includes("usdz");

  const handleLoad = () => {
    setLoaded(true);
    setError(null);
  };

  const handleError = (e?: Error | string) => {
    const errorMsg = typeof e === "string" ? e : e?.message || "Не удалось загрузить модель";
    console.error("[ModelViewer3d] Load error:", errorMsg);
    setError(errorMsg);
  };

  if (error) {
    if (onErrorFallback) {
      return <>{onErrorFallback()}</>;
    }
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-border bg-muted/20 text-muted-foreground text-sm ${className}`}
        style={{ minHeight: height }}
      >
        {error}
      </div>
    );
  }

  // Используем Three.js для всех моделей (.glb и .usdz)
  return (
    <div className={`relative rounded-xl border border-border overflow-hidden bg-[#121212] ${className}`} style={{ height }}>
      {!loaded && !error && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm z-10"
          aria-hidden
        >
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <span>Загрузка модели…</span>
        </div>
      )}
      <Canvas
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%", background: "#121212" }}
      >
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
          <ambientLight intensity={1.2} />
          <directionalLight position={[10, 10, 5]} intensity={2} />
          <directionalLight position={[-10, 10, -5]} intensity={1.5} />
          <directionalLight position={[0, -10, 0]} intensity={0.8} />
          <pointLight position={[5, 5, 5]} intensity={1} />
          <pointLight position={[-5, 5, -5]} intensity={0.8} />
          <Model3d url={src} onLoad={handleLoad} onError={handleError} />
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={10}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
