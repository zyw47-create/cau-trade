'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function HeroRibbon() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    let animationFrame: number;
    let time = 0;

    const drawRibbon = () => {
      ctx.clearRect(0, 0, width, height);

      // Create gradient background
      const bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, 'rgba(250, 247, 242, 0.1)');
      bgGradient.addColorStop(0.5, 'rgba(209, 107, 165, 0.08)');
      bgGradient.addColorStop(1, 'rgba(95, 251, 241, 0.08)');

      // Flowing ribbon paths
      ctx.save();
      ctx.globalAlpha = 0.6;

      // First ribbon - cyan
      ctx.strokeStyle = 'rgba(95, 251, 241, 0.4)';
      ctx.lineWidth = 60;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(0, height / 2 + Math.sin(time * 0.003) * 40);
      for (let x = 0; x <= width; x += 20) {
        const y =
          height / 2 +
          Math.sin((x * 0.01 + time * 0.002) * Math.PI) * 80 +
          Math.cos((x * 0.005 + time * 0.001) * Math.PI) * 40;
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Second ribbon - pink
      ctx.strokeStyle = 'rgba(209, 107, 165, 0.4)';
      ctx.beginPath();
      ctx.moveTo(0, height / 2 + Math.sin(time * 0.0025) * 50 - 50);
      for (let x = 0; x <= width; x += 20) {
        const y =
          height / 2 -
          50 +
          Math.sin((x * 0.012 + time * 0.0018) * Math.PI) * 70 +
          Math.cos((x * 0.006 + time * 0.0012) * Math.PI) * 50;
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Third ribbon - purple gradient
      ctx.strokeStyle = 'rgba(170, 143, 216, 0.3)';
      ctx.lineWidth = 40;
      ctx.beginPath();
      ctx.moveTo(0, height / 2 + Math.sin(time * 0.0028) * 45 + 50);
      for (let x = 0; x <= width; x += 20) {
        const y =
          height / 2 +
          50 +
          Math.sin((x * 0.014 + time * 0.002) * Math.PI) * 60 +
          Math.cos((x * 0.007 + time * 0.0014) * Math.PI) * 45;
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.restore();

      // Particles
      ctx.fillStyle = 'rgba(95, 251, 241, 0.5)';
      for (let i = 0; i < 5; i++) {
        const px =
          (width / 5) * i +
          Math.sin(time * 0.002 + i) * 30 +
          (mousePos.x - width / 2) * 0.05;
        const py =
          height / 2 +
          Math.cos(time * 0.002 + i) * 60 +
          (mousePos.y - height / 2) * 0.05;
        ctx.beginPath();
        ctx.arc(px, py, 3 + Math.sin(time * 0.005 + i) * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      time++;
      animationFrame = requestAnimationFrame(drawRibbon);
    };

    canvas.width = window.innerWidth;
    canvas.height = 600;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    drawRibbon();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [mousePos]);

  return (
    <div className="relative w-full bg-white overflow-hidden">
      {/* Mobile and Desktop Height */}
      <div className="h-screen md:h-[700px] max-h-[600px] md:max-h-none relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/15 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/3 right-1/3 w-72 h-72 bg-secondary/8 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

        {/* Central text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4">
          <div className="relative">
            {/* Main heading - Mobile optimized */}
            <h1 className="text-6xl md:text-7xl lg:text-9xl font-black tracking-tighter text-center leading-none relative z-10">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-secondary">
                CAMPUS
              </span>
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-secondary via-accent to-primary">
                MARKET
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-center mt-6 md:mt-8 text-sm md:text-lg text-muted-foreground max-w-xl mx-auto font-light tracking-wide">
              AI-Powered Campus Marketplace
              <br />
              <span className="text-primary/80">智能校园交易平台</span>
            </p>

            {/* CTA Buttons - Mobile friendly */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mt-8 md:mt-12 w-full max-w-sm md:max-w-none">
              <button className="glass-effect glass-effect-hover px-6 md:px-8 py-2.5 md:py-3 rounded-full font-semibold text-foreground hover:text-primary transition-colors duration-300 text-sm md:text-base flex-1 sm:flex-none">
                开始逛逛
              </button>
              <button className="bg-gradient-to-r from-primary to-accent px-6 md:px-8 py-2.5 md:py-3 rounded-full font-semibold text-white hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 text-sm md:text-base flex-1 sm:flex-none">
                发布商品
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
