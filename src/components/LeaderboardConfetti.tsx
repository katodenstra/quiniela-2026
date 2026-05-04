import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const fifa2026Palette = [
  "#751312",
  "#6101EB",
  "#1A247D",
  "#004C3F",
  "#D60000",
  "#B387FF",
  "#304FFF",
  "#00C752",
  "#FF3D00",
  "#BA69C7",
  "#2296F3",
  "#B1EB00",
  "#FF9E81",
  "#E81F63",
  "#63FFD8",
  "#ECFF43",
];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  opacity: number;
};

type ViewportRect = {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
};

const effectDuration = 2800;
const fadeDuration = 800;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function shuffle<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function getViewportRect(): ViewportRect {
  if (typeof window === "undefined") {
    return { width: 0, height: 0, offsetTop: 0, offsetLeft: 0 };
  }

  const viewport = window.visualViewport;

  return {
    width: Math.round(viewport?.width ?? window.innerWidth),
    height: Math.round(viewport?.height ?? window.innerHeight),
    offsetTop: Math.round(viewport?.offsetTop ?? 0),
    offsetLeft: Math.round(viewport?.offsetLeft ?? 0),
  };
}

function createEmitterParticles(
  side: "left" | "right",
  width: number,
  height: number,
) {
  const colors = shuffle(fifa2026Palette.flatMap((color) => [color, color]));
  const originX = side === "left" ? 18 : width - 18;
  const originY = height - 14;
  const minAngle = side === "left" ? 42 : 108;
  const maxAngle = side === "left" ? 72 : 138;

  return colors.map((color): Particle => {
    const angle = (randomBetween(minAngle, maxAngle) * Math.PI) / 180;
    const speed = randomBetween(720, 1040);

    return {
      x: originX + randomBetween(-12, 12),
      y: originY + randomBetween(-12, 12),
      vx: Math.cos(angle) * speed,
      vy: -Math.sin(angle) * speed,
      width: randomBetween(6, 10),
      height: randomBetween(14, 26),
      rotation: randomBetween(0, Math.PI * 2),
      rotationSpeed: randomBetween(-8, 8),
      color,
      opacity: randomBetween(0.88, 1),
    };
  });
}

function createParticles(width: number, height: number) {
  return [
    ...createEmitterParticles("left", width, height),
    ...createEmitterParticles("right", width, height),
  ];
}

function LeaderboardConfetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const viewportRectRef = useRef<ViewportRect>({
    width: 0,
    height: 0,
    offsetTop: 0,
    offsetLeft: 0,
  });
  const [active, setActive] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (!active) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    const canvasElement = canvas;
    const drawingContext = context;

    function syncCanvasToViewport() {
      const pixelRatio = window.devicePixelRatio || 1;
      const viewportRect = getViewportRect();
      viewportRectRef.current = viewportRect;

      canvasElement.width = Math.floor(viewportRect.width * pixelRatio);
      canvasElement.height = Math.floor(viewportRect.height * pixelRatio);
      canvasElement.style.width = `${viewportRect.width}px`;
      canvasElement.style.height = `${viewportRect.height}px`;
      canvasElement.style.left = `${viewportRect.offsetLeft}px`;
      canvasElement.style.top = `${viewportRect.offsetTop}px`;
      drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    function resizeCanvas() {
      syncCanvasToViewport();
      if (particlesRef.current.length > 0) {
        particlesRef.current = createParticles(
          viewportRectRef.current.width,
          viewportRectRef.current.height,
        );
        startTimeRef.current = null;
        previousTimeRef.current = null;
      }
    }

    syncCanvasToViewport();
    particlesRef.current = createParticles(
      viewportRectRef.current.width,
      viewportRectRef.current.height,
    );

    function stop() {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setActive(false);
    }

    function animate(time: number) {
      if (startTimeRef.current === null) {
        startTimeRef.current = time;
        previousTimeRef.current = time;
      }

      const elapsed = time - startTimeRef.current;
      const previousTime = previousTimeRef.current ?? time;
      const deltaSeconds = Math.min((time - previousTime) / 1000, 0.033);
      previousTimeRef.current = time;

      const { width: viewportWidth, height: viewportHeight } =
        viewportRectRef.current;
      drawingContext.clearRect(0, 0, viewportWidth, viewportHeight);

      const fadeProgress = Math.max(
        0,
        (elapsed - (effectDuration - fadeDuration)) / fadeDuration,
      );
      const gravity = 620;
      const drag = 0.994;

      particlesRef.current = particlesRef.current.filter((particle) => {
        particle.vx *= drag;
        particle.vy = particle.vy * drag + gravity * deltaSeconds;
        particle.x += particle.vx * deltaSeconds;
        particle.y += particle.vy * deltaSeconds;
        particle.rotation += particle.rotationSpeed * deltaSeconds;

        if (
          particle.y > viewportHeight + 48 ||
          particle.x < -48 ||
          particle.x > viewportWidth + 48
        ) {
          return false;
        }

        drawingContext.save();
        drawingContext.globalAlpha = particle.opacity * (1 - fadeProgress);
        drawingContext.translate(particle.x, particle.y);
        drawingContext.rotate(particle.rotation);
        drawingContext.fillStyle = particle.color;
        drawingContext.fillRect(
          -particle.width / 2,
          -particle.height / 2,
          particle.width,
          particle.height,
        );
        drawingContext.restore();

        return true;
      });

      if (elapsed >= effectDuration || particlesRef.current.length === 0) {
        stop();
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    window.addEventListener("resize", resizeCanvas);
    window.visualViewport?.addEventListener("resize", resizeCanvas);
    window.visualViewport?.addEventListener("scroll", syncCanvasToViewport);
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.visualViewport?.removeEventListener("resize", resizeCanvas);
      window.visualViewport?.removeEventListener("scroll", syncCanvasToViewport);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [active]);

  if (!active) return null;

  return createPortal(
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />,
    document.body,
  );
}

export default LeaderboardConfetti;
