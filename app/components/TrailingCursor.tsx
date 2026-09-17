'use client';

import { useEffect, useRef } from 'react';

interface CustomCursorProps {
  element?: HTMLElement;
}

const TrailingCursor: React.FC<CustomCursorProps> = ({ element }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetPosRef = useRef({ x: -100, y: -100 });
  const currentPosRef = useRef({ x: -100, y: -100 });
  const isHoveringRef = useRef(false);
  const animationFrameRef = useRef<number>(undefined);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hasWrapperEl = element !== undefined;
    const targetElement = hasWrapperEl ? element : document.body;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    canvasRef.current = canvas;
    canvas.style.position = hasWrapperEl ? 'absolute' : 'fixed';
    canvas.style.top = '0px';
    canvas.style.left = '0px';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';

    if (hasWrapperEl) {
      targetElement.appendChild(canvas);
      canvas.width = targetElement.clientWidth;
      canvas.height = targetElement.clientHeight;
    } else {
      document.body.appendChild(canvas);
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    const onMouseMove = (e: MouseEvent) => {
      if (hasWrapperEl && element) {
        const rect = element.getBoundingClientRect();
        targetPosRef.current.x = e.clientX - rect.left;
        targetPosRef.current.y = e.clientY - rect.top;
      } else {
        targetPosRef.current.x = e.clientX;
        targetPosRef.current.y = e.clientY;
      }

      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest(
          'a, button, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])'
        );
        isHoveringRef.current = !!interactive;
      }
    };

    const onWindowResize = () => {
      if (hasWrapperEl && element) {
        canvas.width = element.clientWidth;
        canvas.height = element.clientHeight;
      } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    const LERP = 0.25;
    let hoverScale = 1;

    const render = () => {
      const targetX = targetPosRef.current.x;
      const targetY = targetPosRef.current.y;

      if (currentPosRef.current.x === -100) {
        currentPosRef.current.x = targetX;
        currentPosRef.current.y = targetY;
      } else {
        currentPosRef.current.x += (targetX - currentPosRef.current.x) * LERP;
        currentPosRef.current.y += (targetY - currentPosRef.current.y) * LERP;
      }

      const targetScale = isHoveringRef.current ? 1.5 : 1.0;
      hoverScale += (targetScale - hoverScale) * 0.15;

      const cx = currentPosRef.current.x;
      const cy = currentPosRef.current.y;

      context.clearRect(0, 0, canvas.width, canvas.height);

      if (cx > 0 && cy > 0) {
        context.save();

        context.beginPath();
        context.arc(cx, cy, 14 * hoverScale, 0, Math.PI * 2);
        context.fillStyle = isHoveringRef.current
          ? 'rgba(177, 141, 208, 0.35)'
          : 'rgba(255, 255, 255, 0.12)';
        context.fill();

        context.beginPath();
        context.arc(cx, cy, 8 * hoverScale, 0, Math.PI * 2);
        context.strokeStyle = isHoveringRef.current
          ? 'rgba(255, 255, 255, 0.95)'
          : 'rgba(177, 141, 208, 0.75)';
        context.lineWidth = 1.5;
        context.stroke();

        context.beginPath();
        context.arc(cx, cy, 2.5 * (isHoveringRef.current ? 1.2 : 1), 0, Math.PI * 2);
        context.fillStyle = '#ffffff';
        context.fill();

        context.restore();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    const cursorStyle = document.createElement('style');
    cursorStyle.textContent = '*, *::before, *::after { cursor: none !important; }';

    if (!prefersReducedMotion.matches) {
      document.head.appendChild(cursorStyle);
      targetElement.addEventListener('mousemove', onMouseMove, { passive: true });
      window.addEventListener('resize', onWindowResize, { passive: true });
      animationFrameRef.current = requestAnimationFrame(render);
    }

    return () => {
      cursorStyle.remove();
      if (canvasRef.current) {
        canvasRef.current.remove();
        canvasRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      targetElement.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onWindowResize);
    };
  }, [element]);

  return null;
};

export default TrailingCursor;
