'use client';

import React, { useState, useRef, useEffect } from 'react';

interface CategoryNavItem {
  id: string;
  name: string;
  count: number;
}

interface CategoryNavProps {
  categories: CategoryNavItem[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
}

export default function CategoryNav({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryNavProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let scrollPosition = 0;
    let isAutoScroll = true;

    const autoScroll = () => {
      if (!isAutoScroll || !container) return;

      scrollPosition += 0.5;

      // Reset to top when reaching bottom
      if (scrollPosition >= container.scrollHeight - container.clientHeight) {
        scrollPosition = 0;
      }

      container.scrollTop = scrollPosition;
    };

    const scrollInterval = setInterval(autoScroll, 30);

    // Pause auto-scroll on mouse enter
    const handleMouseEnter = () => {
      isAutoScroll = false;
    };

    // Resume auto-scroll on mouse leave
    const handleMouseLeave = () => {
      isAutoScroll = true;
    };

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      clearInterval(scrollInterval);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div 
      ref={scrollContainerRef}
      className="w-20 md:w-32 flex-shrink-0 bg-gradient-to-b from-pink-50/80 to-purple-50/80 border-r border-pink-200/30 overflow-y-auto scroll-smooth"
    >
      <div className="py-3 md:py-4 space-y-2 md:space-y-3">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            onMouseEnter={() => setHoveredId(cat.id)}
            onMouseLeave={() => setHoveredId(null)}
            className="relative w-full px-2 md:px-4 py-3 md:py-4 text-left transition-all group"
          >
            {/* Ripple effect on hover */}
            {hoveredId === cat.id && (
              <div className="absolute inset-0 animate-ripple">
                <div className="absolute inset-0 rounded-lg bg-pink-200/20 animate-ping" />
              </div>
            )}

            {/* Active indicator background */}
            {activeCategory === cat.id && (
              <div className="absolute inset-0 bg-white/60 rounded-lg -z-10 transition-all duration-300" />
            )}

            {/* Content */}
            <div className="relative z-10">
              <div
                className={`text-base md:text-2xl font-bold transition-all duration-300 ${
                  activeCategory === cat.id
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
                    : 'text-foreground/70 group-hover:text-foreground'
                }`}
              >
                {cat.name}
              </div>
              <div
                className={`text-xs md:text-sm transition-all duration-300 ${
                  activeCategory === cat.id
                    ? 'text-pink-600 font-semibold'
                    : 'text-muted-foreground group-hover:text-foreground/60'
                }`}
              >
                {cat.count}
              </div>
            </div>
          </button>
        ))}
      </div>

      <style>{`
        @keyframes ripple {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
        .animate-ripple {
          animation: ripple 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
