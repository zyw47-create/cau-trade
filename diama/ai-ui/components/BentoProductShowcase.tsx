'use client';

import React from 'react';
import BentoCard from './BentoCard';
import DynamicBackground from './DynamicBackground';

interface BentoProduct {
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

const BENTO_PRODUCTS: BentoProduct[] = [
  {
    id: '1',
    title: '热销降噪耳机',
    price: 1299,
    category: '音频设备',
    image: '🎧',
    credit: 98,
    size: 'lg',
    sellerName: '张三',
    aiReason: '校园最受欢迎的音频产品，99%用户给好评',
    tags: ['热销', 'AI推荐'],
  },
  {
    id: '2',
    title: '宿舍神器投影仪',
    price: 899,
    category: '电子产品',
    image: '🎬',
    credit: 96,
    size: 'md',
    aiReason: '寝室必备，看剧神器',
    tags: ['热销'],
  },
  {
    id: '3',
    title: 'AI推荐专区',
    price: 0,
    category: '推荐',
    image: '✨',
    credit: 100,
    size: 'sm',
    tags: ['AI精选'],
  },
  {
    id: '4',
    title: '今日热门榜',
    price: 0,
    category: '热门',
    image: '🔥',
    credit: 100,
    size: 'sm',
    tags: ['热门'],
  },
  {
    id: '5',
    title: 'iPhone 15 Pro',
    price: 2999,
    category: '手机',
    image: '📱',
    credit: 97,
    size: 'md',
    aiReason: '高信用卖家，全新未激活',
    tags: ['热销'],
  },
  {
    id: '6',
    title: '高信用卖家精选',
    price: 0,
    category: '精选',
    image: '👑',
    credit: 100,
    size: 'sm',
    tags: ['精选'],
  },
  {
    id: '7',
    title: 'MacBook Air M3',
    price: 5999,
    category: '笔记本',
    image: '💻',
    credit: 95,
    size: 'md',
    aiReason: '性能怪兽，轻薄便携',
    tags: ['热销'],
  },
  {
    id: '8',
    title: 'iPad Pro',
    price: 3999,
    category: '平板',
    image: '📖',
    credit: 94,
    size: 'sm',
    tags: ['推荐'],
  },
];

export default function BentoProductShowcase() {
  return (
    <section className="relative w-full min-h-screen bg-white pt-20 pb-32 overflow-hidden">
      {/* 动态背景 */}
      <DynamicBackground />

      {/* 内容层 */}
      <div className="relative z-10">
        {/* 标题区域 */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            <span className="bg-gradient-to-r from-pink-600 via-purple-500 to-pink-500 bg-clip-text text-transparent font-serif-sc">
              AI Curated Picks
            </span>
          </h2>
          <p className="text-lg text-muted-foreground font-serif-sc">
            AI智能精选，发现校园热门商品
          </p>
        </div>

        {/* Bento Grid 布局 */}
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 auto-rows-auto gap-4 md:gap-6">
            {BENTO_PRODUCTS.map((product) => (
              <BentoCard key={product.id} {...product} />
            ))}
          </div>
        </div>

        {/* 底部装饰文字 */}
        <div className="text-center mt-16 px-6">
          <p className="text-muted-foreground font-serif-sc">
            向下滑动探索更多校园热门商品 ✨
          </p>
        </div>
      </div>
    </section>
  );
}
