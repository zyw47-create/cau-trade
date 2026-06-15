'use client';

import React, { useEffect, useRef } from 'react';

export default function ArtisticHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    let animationId: number;
    let time = 0;

    const drawRainbowWaves = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      ctx!.clearRect(0, 0, width, height);

      const colors = ['#FF6B6B', '#FFA500', '#FFD700', '#4169E1', '#8A2BE2', '#FF69B4'];
      const waveCount = 6;

      for (let i = 0; i < waveCount; i++) {
        ctx!.strokeStyle = colors[i % colors.length];
        ctx!.lineWidth = 12;
        ctx!.beginPath();

        const amplitude = 30 + i * 10;
        const frequency = 0.01;
        const phase = time * 0.02 + i * 0.5;

        let isFirst = true;
        for (let x = 0; x <= width; x += 5) {
          const y = height * 0.5 + Math.sin(x * frequency + phase) * amplitude + i * 20;
          if (isFirst) {
            ctx!.moveTo(x, y);
            isFirst = false;
          } else {
            ctx!.lineTo(x, y);
          }
        }
        ctx!.stroke();
      }

      time++;
    };

    const animate = () => {
      drawRainbowWaves();
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-white overflow-hidden pt-20">
      {/* Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 opacity-40"
      />

      {/* Content Container */}
      <div className="relative z-10 flex items-center justify-between px-6 md:px-12 lg:px-20 min-h-[calc(100vh-80px)]">
        {/* Left Content - Title & Description */}
        <div className="w-full md:w-1/2 mb-12 md:mb-0">
          <div className="space-y-6 md:space-y-8">
            {/* Main Title */}
            <div className="space-y-4 animate-fadeInUp">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black font-serif-sc leading-tight text-black">
                Campus
              </h1>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black font-serif-sc text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-violet-500 bg-clip-text">
                Market
              </h2>
            </div>

            {/* Subtitle */}
            <p className="text-base md:text-lg text-muted-foreground font-light max-w-md leading-relaxed">
              校园生态交易平台
              <br />
              <span className="text-sm md:text-base font-serif italic text-foreground/60">Campus Trading Ecosystem</span>
            </p>

            {/* Description */}
            <p className="text-sm md:text-base text-foreground/70 max-w-lg leading-relaxed font-light">
              汇聚校园文化与创意交易，发现独特商品、连接志同道合的伙伴。
              <br />
              <span className="font-serif italic text-foreground/60 text-xs md:text-sm">Discover unique campus treasures & connect with fellow creators.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300 text-sm md:text-base">
                开始探索 / Explore
              </button>
              <button className="px-8 py-3 border border-foreground/30 text-foreground rounded-full font-semibold hover:border-foreground/60 hover:bg-foreground/5 transition-all duration-300 text-sm md:text-base">
                了解更多 / Learn More
              </button>
            </div>
          </div>
        </div>

        {/* Right Content - 3D Art Element */}
        <div className="hidden md:flex w-1/2 items-center justify-center h-full">
          <div className="relative w-96 h-96">
            {/* Gradient Blob */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-200/30 to-purple-200/30 rounded-3xl blur-3xl animate-pulse" />
            
            {/* 3D Numbers/Shapes - SVG Art */}
            <svg
              viewBox="0 0 400 400"
              className="w-full h-full animate-float"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Large colorful "CAMPUS" text-like shapes using gradients */}
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#FF6B9D' }} />
                  <stop offset="50%" style={{ stopColor: '#4169E1' }} />
                  <stop offset="100%" style={{ stopColor: '#FFD700' }} />
                </linearGradient>
                <linearGradient id="grad2" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" style={{ stopColor: '#8A2BE2' }} />
                  <stop offset="50%" style={{ stopColor: '#FF1493' }} />
                  <stop offset="100%" style={{ stopColor: '#00CED1' }} />
                </linearGradient>
              </defs>

              {/* Wavy shapes - representing stylized letters */}
              <path
                d="M 80 150 Q 120 80, 160 150 T 240 150"
                stroke="url(#grad1)"
                strokeWidth="20"
                strokeLinecap="round"
                opacity="0.8"
              />
              <path
                d="M 100 200 Q 150 120, 200 200 T 300 200"
                stroke="url(#grad2)"
                strokeWidth="18"
                strokeLinecap="round"
                opacity="0.9"
              />
              <path
                d="M 60 280 Q 120 200, 180 280 T 320 280"
                stroke="url(#grad1)"
                strokeWidth="16"
                strokeLinecap="round"
                opacity="0.7"
              />

              {/* Decorative circles */}
              <circle cx="350" cy="80" r="30" fill="none" stroke="url(#grad2)" strokeWidth="8" opacity="0.6" />
              <circle cx="40" cy="320" r="40" fill="none" stroke="url(#grad1)" strokeWidth="8" opacity="0.5" />
            </svg>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-foreground/30 rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-foreground/50 rounded-full animate-scroll" />
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(2deg);
          }
        }

        @keyframes scroll {
          0% {
            transform: translateY(0);
            opacity: 1;
          }
          100% {
            transform: translateY(8px);
            opacity: 0;
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out;
        }

        .animate-float {
          animation: float 4s ease-in-out infinite;
        }

        .animate-scroll {
          animation: scroll 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
