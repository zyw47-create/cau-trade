'use client';

import React from 'react';
import ProductCard from './ProductCard';

export default function ProductGrid() {
  const products = [
    {
      id: '1',
      title: '全新Apple MacBook Pro 14"',
      price: 4500,
      category: '数码',
      image: '💻',
      credit: 98,
    },
    {
      id: '2',
      title: '高等数学教科书+详解笔记',
      price: 45,
      category: '图书',
      image: '📚',
      credit: 95,
    },
    {
      id: '3',
      title: '宜家美式风格实木书桌',
      price: 320,
      category: '生活',
      image: '🛏️',
      credit: 92,
    },
    {
      id: '4',
      title: 'Sony WH-1000XM5降噪耳机',
      price: 1200,
      category: '数码',
      image: '🎧',
      credit: 99,
    },
    {
      id: '5',
      title: '托福备考全套资料',
      price: 89,
      category: '教材',
      image: '📖',
      credit: 90,
    },
    {
      id: '6',
      title: 'GoPro Hero 11运动摄像机',
      price: 2800,
      category: '数码',
      image: '📷',
      credit: 97,
    },
  ];

  return (
    <section className="relative bg-white py-12 md:py-16 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="mb-10 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            AI 智能推荐
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            基于您的兴趣，AI为您精选最匹配的商品
          </p>
        </div>

        {/* Products Grid - Mobile optimized */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-6">
          {products.map((product) => (
            <div key={product.id}>
              <ProductCard {...product} />
            </div>
          ))}
        </div>

        {/* View More Button */}
        <div className="flex justify-center mt-10 md:mt-12">
          <button className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold text-sm md:text-base bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:shadow-lg hover:shadow-pink-300/50 transition-all duration-300">
            查看全部商品
          </button>
        </div>
      </div>
    </section>
  );
}
