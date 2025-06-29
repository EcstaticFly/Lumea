"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface OrbProps {
  totalImages?: number;
  totalItems?: number;
  baseWidth?: number;
  baseHeight?: number;
  sphereRadius?: number;
  backgroundColor?: string;
}

const Orb: React.FC<OrbProps> = ({
  totalImages = 30,
  totalItems = 100,
  baseWidth = 1,
  baseHeight = 0.6,
  sphereRadius = 5,
  backgroundColor = "000000",
}) => {
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = orbRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(parseInt(backgroundColor, 16));
    renderer.setPixelRatio(window.devicePixelRatio);

    container.appendChild(renderer.domElement);

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    const rotationVelocity = { x: 0, y: 0 };
    const damping = 0.95;
    const minDistance = 1;
    const maxDistance = 11;
    let distance = 11;

    let lastTouchDistance = 0;
    let isZooming = false;

    const handleMouseDown = (event: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;

      const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y,
      };

      rotationVelocity.x = deltaMove.y * 0.01;
      rotationVelocity.y = deltaMove.x * 0.01;

      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const zoomSpeed = 0.5;
      const delta = event.deltaY > 0 ? 1 : -1;

      distance = Math.max(
        minDistance,
        Math.min(maxDistance, distance + delta * zoomSpeed)
      );
      camera.position.setLength(distance);
    };

    const getTouchDistance = (touches: TouchList): number => {
      if (touches.length < 2) return 0;

      const touch1 = touches[0];
      const touch2 = touches[1];

      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;

      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        isZooming = true;
        lastTouchDistance = getTouchDistance(event.touches);
        event.preventDefault();
      } else if (event.touches.length === 1) {
        isDragging = true;
        const touch = event.touches[0];
        previousMousePosition = { x: touch.clientX, y: touch.clientY };
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && isZooming) {
        event.preventDefault();
        const currentDistance = getTouchDistance(event.touches);

        if (lastTouchDistance > 0) {
          const deltaDistance = currentDistance - lastTouchDistance;
          const zoomSpeed = 0.02;

          distance = Math.max(
            minDistance,
            Math.min(maxDistance, distance - deltaDistance * zoomSpeed)
          );
          camera.position.setLength(distance);
        }

        lastTouchDistance = currentDistance;
      } else if (event.touches.length === 1 && isDragging && !isZooming) {
        const touch = event.touches[0];
        const deltaMove = {
          x: touch.clientX - previousMousePosition.x,
          y: touch.clientY - previousMousePosition.y,
        };

        rotationVelocity.x = deltaMove.y * 0.01;
        rotationVelocity.y = deltaMove.x * 0.01;

        previousMousePosition = { x: touch.clientX, y: touch.clientY };
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) {
        isZooming = false;
        lastTouchDistance = 0;
      }
      if (event.touches.length === 0) {
        isDragging = false;
      }
    };

    renderer.domElement.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    renderer.domElement.addEventListener("wheel", handleWheel, {
      passive: false,
    });
    renderer.domElement.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    renderer.domElement.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    renderer.domElement.addEventListener("touchend", handleTouchEnd);

    const textureLoader = new THREE.TextureLoader();
    let loadedCount = 0;
    let animationStarted = false;

    const getRandomImagePath = (): string => {
      return `/assets/img${Math.floor(Math.random() * totalImages) + 1}.jpeg`;
    };

    const createImagePlane = (texture: THREE.Texture): THREE.PlaneGeometry => {
      const imageAspect = texture.image.width / texture.image.height;
      let width = baseWidth;
      let height = baseHeight;

      if (imageAspect > 1) {
        height = width / imageAspect;
      } else {
        width = height * imageAspect;
      }

      return new THREE.PlaneGeometry(width, height);
    };

    const loadImageMesh = (phi: number, theta: number): void => {
      textureLoader.load(
        getRandomImagePath(),
        (texture: THREE.Texture) => {
          texture.generateMipmaps = false;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;

          const geometry = createImagePlane(texture);
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: false,
            depthWrite: true,
            depthTest: true,
          });

          const mesh = new THREE.Mesh(geometry, material);

          mesh.position.x = sphereRadius * Math.cos(theta) * Math.sin(phi);
          mesh.position.y = sphereRadius * Math.sin(theta) * Math.sin(phi);
          mesh.position.z = sphereRadius * Math.cos(phi);

          mesh.lookAt(0, 0, 0);
          mesh.rotateY(Math.PI);

          scene.add(mesh);

          loadedCount++;
          if (loadedCount === totalItems && !animationStarted) {
            animationStarted = true;
            animate();
          }
        },
        undefined,
        (error: unknown) => {
          console.error("Error loading texture:", error);
          loadedCount++;
          if (loadedCount === totalItems && !animationStarted) {
            animationStarted = true;
            animate();
          }
        }
      );
    };

    const createSphere = (): void => {
      for (let i = 0; i < totalItems; i++) {
        const phi = Math.acos(-1 + (2 * i) / totalItems);
        const theta = Math.sqrt(totalItems * Math.PI) * phi;
        loadImageMesh(phi, theta);
      }
    };

    camera.position.z = distance;

    const animate = (): void => {
      requestAnimationFrame(animate);
      if (
        Math.abs(rotationVelocity.x) > 0.001 ||
        Math.abs(rotationVelocity.y) > 0.001
      ) {
        scene.rotation.x += rotationVelocity.x;
        scene.rotation.y += rotationVelocity.y;

        rotationVelocity.x *= damping;
        rotationVelocity.y *= damping;
      }

      renderer.render(scene, camera);
    };

    const handleResize = (): void => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);

    createSphere();

    return () => {
      renderer.domElement.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      renderer.domElement.removeEventListener("wheel", handleWheel);
      renderer.domElement.removeEventListener("touchstart", handleTouchStart);
      renderer.domElement.removeEventListener("touchmove", handleTouchMove);
      renderer.domElement.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("resize", handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      renderer.dispose();
    };
  }, [
    totalImages,
    totalItems,
    baseHeight,
    baseWidth,
    sphereRadius,
    backgroundColor,
  ]);

  return <div className="orb" ref={orbRef}></div>;
};

export default Orb;
