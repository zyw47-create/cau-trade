'use client';

import React, { useState } from 'react';
import { Heart, Star } from 'lucide-react';

interface BentoCardProps {
  id: string;
  title: string;
  price: number;
  category: string;
  image: string;
  credit: number;
  size: 'lg' | 'md' | 'sm';
  sellerName?: string;
  aiReason?: string;
  tags?: string[];
}

export default function BentoCard({
  id,
  title,
  price,
  category,
  image,
  credit,
  size = 'md',
  sellerName,
  aiReason,
  tags,
}: BentoCardProps) {
  const [isLiked, setIsLiked] = useState(false);

  const sizeClasses = {
    lg: 'col-span-1 md:col-span-2 row-span-2 h-96 md:h-full',
    md: 'col-span-1 md:col-span-1 row-span-1 h-64',
    sm: 'col-span-1 h-48',
  };

  return (
    <div className={`${sizeClasses[size]} group relative rounded-2xl overflow-hidden`}>
      {/* 背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-100 to-purple-100" />

      {/* 主内容 */}
      <div className="relative h-full w-full flex flex-col justify-between p-4 md:p-6 bg-white/90 backdrop-blur-xl rounded-2xl border border-white/50 hover:shadow-lg transition-all duration-300 overflow-hidden">
        {/* 顶部区域 */}
        <div className="flex-1 flex flex-col">
          {/* 标题 + Like按钮 */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="text-sm md:text-base font-bold text-foreground line-clamp-2 flex-1 group-hover:text-pink-600 transition-colors">
              {title}
            </h3>
            <button
              onClick={() => setIsLiked(!isLiked)}
              className="flex-shrink-0 p-1.5 rounded-full bg-white/70 hover:bg-white transition-all"
            >
              <Heart
                size={16}
                className={isLiked ? 'fill-pink-500 text-pink-500' : 'text-foreground/40'}
              />
            </button>
          </div>

          {/* 大卡特有：图片区域 */}
          {size === 'lg' && (
            <div className="flex-1 mb-4 -mx-6 -mt-4 bg-gradient-to-b from-pink-200 to-purple-200 flex items-center justify-center">
              <span className="text-6xl md:text-8xl font-bold text-transparent bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text group-hover:scale-110 transition-transform duration-300">
                {image}
              </span>
            </div>
          )}

          {/* 小卡片特有：标签 */}
          {size === 'sm' && tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.slice(0, 2).map((tag) => (
                <span key={tag} className="px-2 py-1 text-xs bg-pink-100 text-pink-600 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* AI推荐理由 */}
          {aiReason && (
            <p className="text-xs md:text-sm text-muted-foreground mb-2 line-clamp-2 italic">
              💡 {aiReason}
            </p>
          )}

          {/* 分类标签 */}
          <div className="flex gap-1 mb-2">
            <span className="px-2 py-0.5 text-xs bg-white border border-pink-200/50 rounded-full text-foreground">
              {category}
            </span>
          </div>
        </div>

        {/* 底部区域 */}
        <div className="border-t border-pink-100/50 pt-3 space-y-2">
          {/* 卖家信息 - Airbnb风格 */}
          {sellerName && size === 'lg' && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {sellerName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{sellerName}</p>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      className={i < Math.ceil(credit / 20) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground">信用{credit}%</span>
                </div>
              </div>
            </div>
          )}

          {/* 价格 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">¥</p>
              <p className="text-lg md:text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                {price}
              </p>
            </div>
            {size !== 'lg' && (
              <div className="flex items-center gap-1 px-2 py-1 bg-pink-50 rounded-lg border border-pink-200/50">
                <span className="text-xs text-muted-foreground">信用</span>
                <span className="text-xs font-bold text-pink-600">{credit}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
