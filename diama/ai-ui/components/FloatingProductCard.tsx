'use client';

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

interface FloatingProductCardProps {
  id: string;
  title: string;
  price: number;
  category: string;
  image: string;
  credit: number;
  index?: number;
}

export default function FloatingProductCard({
  id,
  title,
  price,
  category,
  image,
  credit,
  index = 0,
}: FloatingProductCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleScroll = () => {
      setScroll(window.scrollY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 视差效果计算
  const parallaxOffset = scroll * 0.3 + index * 5;

  return (
    <div className="relative h-full flex-shrink-0 snap-center" style={{ perspective: '1200px' }}>
        {/* 浮动容器 */}
      <div
        className="relative w-64 h-80 transition-transform duration-700 ease-out"
        style={{
          transform: `translateY(${parallaxOffset * -0.1}px) rotateX(${tilt.x * 0.3}deg) rotateY(${tilt.y * 0.3}deg) rotateZ(${-2}deg)`,
          transformStyle: 'preserve-3d',
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientY - rect.top - rect.height / 2) / 30;
          const y = -(e.clientX - rect.left - rect.width / 2) / 30;
          setTilt({ x, y });
        }}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      >
        {/* 发光光晕 */}
        <div className="absolute -inset-4 bg-gradient-to-r from-pink-300/20 via-purple-300/20 to-pink-300/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* 卡片 */}
        <div className="relative w-full h-full bg-white/90 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/50 shadow-2xl hover:shadow-pink-300/40 transition-all duration-500">
          {/* 顶部渐变装饰 */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-100/30 via-transparent to-purple-100/20 pointer-events-none" />

          {/* 图片区域 */}
          <div className="relative h-44 bg-gradient-to-br from-pink-100 to-purple-100 overflow-hidden">
            <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-transparent bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text transition-transform duration-700 hover:scale-110">
              {image}
            </div>

            {/* 浮动Like按钮 */}
            <button
              onClick={() => setIsLiked(!isLiked)}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-all duration-300 hover:scale-110 shadow-lg"
            >
              <Heart
                size={18}
                className={isLiked ? 'fill-pink-500 text-pink-500' : 'text-foreground/60'}
              />
            </button>

            {/* 分类标签 */}
            <div className="absolute bottom-3 left-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/95 backdrop-blur-sm text-foreground border border-pink-200/50 shadow-lg">
                {category}
              </span>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 flex flex-col justify-between p-4 relative z-10">
            {/* 标题 */}
            <h3 className="text-base font-bold text-foreground line-clamp-2 group-hover:text-pink-600 transition-colors duration-300 min-h-8">
              {title}
            </h3>

            {/* 底部信息 */}
            <div className="space-y-3 pt-3 border-t border-pink-100/50">
              {/* 价格 */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">价格</p>
                <p className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  ¥{price}
                </p>
              </div>

              {/* 信用 */}
              <div className="flex items-center gap-2 px-3 py-2 bg-pink-50/80 rounded-lg border border-pink-200/50">
                <span className="text-xs text-muted-foreground">信用</span>
                <span className="text-sm font-bold text-pink-600">{credit}%</span>
              </div>
            </div>
          </div>

          {/* 底部装饰线 */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-pink-300/50 to-transparent" />
        </div>
      </div>
    </div>
  );
}
