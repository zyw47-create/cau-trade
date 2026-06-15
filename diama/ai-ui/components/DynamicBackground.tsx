'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function DynamicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const particlesRef = useRef<any[]>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    const particleCount = 50;
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 3 + 1,
      opacity: Math.random() * 0.5 + 0.2,
      life: 0,
    }));

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);

    const animationFrameId = setInterval(() => {
      timeRef.current += 1;
      
      // Clear canvas with gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
      gradient.addColorStop(0.5, 'rgba(255, 250, 247, 0.99)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.98)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw animated gradient ribbons
      drawRibbons(ctx, canvas.width, canvas.height, timeRef.current);

      // Draw particles
      drawParticles(ctx, particlesRef.current, canvas.width, canvas.height, mousePos);

      // Draw breathing gradient orbs
      drawBreathingOrbs(ctx, canvas.width, canvas.height, timeRef.current);

      // Draw light spots
      drawLightSpots(ctx, canvas.width, canvas.height, timeRef.current);

      // Draw grid motion
      drawGridMotion(ctx, canvas.width, canvas.height, timeRef.current);
    }, 1000 / 60);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(animationFrameId);
    };
  }, []);

  const drawRibbons = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number
  ) => {
    const colors = [
      'rgba(209, 107, 165, 0.08)',
      'rgba(199, 119, 185, 0.06)',
      'rgba(186, 131, 202, 0.05)',
      'rgba(154, 154, 225, 0.07)',
    ];

    colors.forEach((color, i) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 80 + i * 20;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      const offsetY = (height / 4) * (i + 1);
      ctx.moveTo(0, offsetY + Math.sin(time * 0.001) * 30);

      for (let x = 0; x <= width; x += 30) {
        const y =
          offsetY +
          Math.sin((x * 0.002 + time * 0.0005) * Math.PI) * 50 +
          Math.cos((x * 0.001 + time * 0.0003) * Math.PI) * 30;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
  };

  const drawParticles = (
    ctx: CanvasRenderingContext2D,
    particles: any[],
    width: number,
    height: number,
    mousePos: { x: number; y: number }
  ) => {
    particles.forEach((particle) => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life += 0.01;

      // Breathing effect
      const breathe = Math.sin(particle.life * 0.05) * 0.5 + 0.5;
      particle.opacity = (Math.sin(particle.life * 0.02) * 0.3 + 0.2) * breathe;

      // Wrap around
      if (particle.x < 0) particle.x = width;
      if (particle.x > width) particle.x = 0;
      if (particle.y < 0) particle.y = height;
      if (particle.y > height) particle.y = 0;

      // Draw particle
      const colors = [
        `rgba(209, 107, 165, ${particle.opacity})`,
        `rgba(199, 119, 185, ${particle.opacity})`,
        `rgba(154, 154, 225, ${particle.opacity})`,
      ];

      ctx.fillStyle = colors[Math.floor(particle.life) % colors.length];
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius * breathe, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const drawBreathingOrbs = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number
  ) => {
    const orbs = [
      { x: width * 0.2, y: height * 0.3, color: 'rgba(209, 107, 165, 0.1)' },
      { x: width * 0.8, y: height * 0.6, color: 'rgba(154, 154, 225, 0.08)' },
      { x: width * 0.5, y: height * 0.2, color: 'rgba(199, 119, 185, 0.08)' },
    ];

    orbs.forEach((orb) => {
      const scale = 1 + Math.sin(time * 0.002) * 0.3;
      const radius = 200 * scale;

      const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, radius);
      gradient.addColorStop(0, orb.color);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(orb.x - radius, orb.y - radius, radius * 2, radius * 2);
    });
  };

  const drawLightSpots = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number
  ) => {
    const spots = [
      { startX: -100, startY: height * 0.3 },
      { startX: width + 100, startY: height * 0.7 },
      { startX: width * 0.5, startY: -100 },
    ];

    spots.forEach((spot, i) => {
      const x = spot.startX + (time * 0.3) * Math.cos((i * Math.PI * 2) / 3);
      const y = spot.startY + (time * 0.3) * Math.sin((i * Math.PI * 2) / 3);

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 150);
      gradient.addColorStop(0, `rgba(255, 182, 193, ${0.1 + Math.sin(time * 0.01) * 0.05})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(x - 150, y - 150, 300, 300);
    });
  };

  const drawGridMotion = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number
  ) => {
    const gridSize = 100;
    const offset = (time * 0.3) % gridSize;

    ctx.strokeStyle = 'rgba(209, 107, 165, 0.04)';
    ctx.lineWidth = 1;

    // Horizontal lines
    for (let y = -offset; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical lines
    for (let x = -offset; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ background: '#ffffff' }}
    />
  );
}
