'use client';

import React, { useState } from 'react';
import { Heart } from 'lucide-react';

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  category: string;
  image: string;
  credit: number;
}

export default function ProductCard({
  id,
  title,
  price,
  category,
  image,
  credit,
}: ProductCardProps) {
  const [isLiked, setIsLiked] = useState(false);

  return (
    <div className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Card Container */}
      <div className="bg-white rounded-xl overflow-hidden flex flex-col h-full border border-muted/50 hover:border-pink-300/50 transition-colors">
        {/* Image Container - Compact on mobile */}
        <div className="relative h-32 md:h-40 bg-gradient-to-br from-pink-100 to-purple-100 overflow-hidden">
          <div className="w-full h-full flex items-center justify-center text-3xl md:text-4xl font-bold text-transparent bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text group-hover:scale-105 transition-transform duration-300">
            {image}
          </div>
          
          {/* Like Button */}
          <button
            onClick={() => setIsLiked(!isLiked)}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
          >
            <Heart
              size={16}
              className={isLiked ? 'fill-pink-500 text-pink-500' : 'text-foreground/60'}
            />
          </button>

          {/* Category Badge */}
          <div className="absolute bottom-2 left-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm text-foreground border border-muted/50">
              {category}
            </span>
          </div>
        </div>

        {/* Content - Compact layout */}
        <div className="flex-1 flex flex-col justify-between p-3 md:p-4">
          {/* Title */}
          <h3 className="text-sm md:text-base font-semibold text-foreground line-clamp-2 group-hover:text-pink-600 transition-colors">
            {title}
          </h3>

          {/* Footer with Price and Credit */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-muted/30">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">¥</p>
              <p className="text-base md:text-lg font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                {price}
              </p>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-pink-50 rounded-lg border border-pink-200/50">
              <span className="text-xs text-muted-foreground">信用</span>
              <span className="text-xs font-bold text-pink-600">{credit}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
