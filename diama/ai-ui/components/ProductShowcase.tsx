'use client';

import React, { useRef, useState } from 'react';
import FloatingProductCard from './FloatingProductCard';
import DynamicBackground from './DynamicBackground';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  image: string;
  credit: number;
}

const PRODUCTS: Product[] = [
  { id: '1', title: 'iPhone 15 Pro', price: 2999, category: '电子产品', image: '📱', credit: 98 },
  { id: '2', title: 'MacBook Air M3', price: 8999, category: '电脑', image: '💻', credit: 96 },
  { id: '3', title: '降噪耳机', price: 1299, category: '音频', image: '🎧', credit: 95 },
  { id: '4', title: 'iPad Pro', price: 5999, category: '平板', image: '📖', credit: 97 },
  { id: '5', title: 'Apple Watch', price: 2999, category: '穿戴', image: '⌚', credit: 94 },
  { id: '6', title: '相机镜头', price: 3499, category: '摄影', image: '📷', credit: 93 },
];

export default function ProductShowcase() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      const newScrollLeft =
        scrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      
      scrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  return (
    <section className="relative w-full min-h-screen bg-white pt-20 pb-32 overflow-hidden">
      {/* 动态背景 */}
      <DynamicBackground />

      {/* 内容层 */}
      <div className="relative z-10">
        {/* 标题区域 */}
        <div className="max-w-7xl mx-auto px-6 mb-16">
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            <span className="bg-gradient-to-r from-pink-600 via-purple-500 to-pink-500 bg-clip-text text-transparent font-serif-sc">
              推荐热销
            </span>
          </h2>
          <p className="text-lg text-muted-foreground font-serif-sc">
            精选校园热门商品，智能推荐为您服务
          </p>
        </div>

        {/* 水平滚动容器 */}
        <div className="relative group">
          {/* 左滚动箭头 */}
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/80 backdrop-blur-xl border border-pink-200/50 hover:bg-white shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
            >
              <ChevronLeft size={24} className="text-pink-600" />
            </button>
          )}

          {/* 右滚动箭头 */}
          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white/80 backdrop-blur-xl border border-pink-200/50 hover:bg-white shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
            >
              <ChevronRight size={24} className="text-pink-600" />
            </button>
          )}

          {/* 卡片滚动区域 */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-6 overflow-x-auto scroll-smooth px-6 py-8 snap-x snap-mandatory scroll-py-8"
            style={{ scrollBehavior: 'smooth' }}
          >
            {PRODUCTS.map((product, index) => (
              <div key={product.id} className="flex-shrink-0 group">
                <FloatingProductCard {...product} index={index} />
              </div>
            ))}
          </div>

          {/* 滚动指示器 */}
          <div className="flex justify-center gap-2 mt-6 px-6">
            {Array.from({ length: Math.ceil(PRODUCTS.length / 2) }).map((_, i) => (
              <button
                key={i}
                className="w-2 h-2 rounded-full bg-pink-300/50 hover:bg-pink-500 transition-all duration-300"
                onClick={() => {
                  if (scrollRef.current) {
                    scrollRef.current.scrollTo({
                      left: i * 640,
                      behavior: 'smooth',
                    });
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* 底部装饰文字 */}
        <div className="text-center mt-16 px-6">
          <p className="text-muted-foreground font-serif-sc">
            向左滑动查看更多商品 ✨
          </p>
        </div>
      </div>
    </section>
  );
}
