'use client';

import React, { useState } from 'react';

interface Product {
  id: string;
  title: string;
  price: string;
  image: string;
  aspectRatio: 'square' | 'portrait' | 'landscape';
  credit: number;
}

export default function PinterestProductFlow({ categoryId }: { categoryId: string }) {
  // Generate Pinterest-style products with varying aspect ratios
  const generateProducts = (): Product[] => {
    const baseProducts = [
      { title: '高端商务手机', price: '3500', credit: 98 },
      { title: '专业摄像机', price: '8000', credit: 95 },
      { title: '无线降噪耳机', price: '1200', credit: 99 },
      { title: '平板电脑', price: '2500', credit: 92 },
      { title: '4K超高清', price: '5000', credit: 97 },
      { title: '便携充电宝', price: '129', credit: 88 },
      { title: '机械键盘', price: '450', credit: 94 },
      { title: '无线鼠标', price: '200', credit: 89 },
      { title: 'USB-C集线器', price: '180', credit: 91 },
      { title: '屏幕挂灯', price: '300', credit: 93 },
      { title: '笔记本支架', price: '120', credit: 86 },
      { title: '护眼显示器', price: '1800', credit: 96 },
    ];

    return baseProducts.map((prod, idx) => ({
      id: `${categoryId}-${idx}`,
      title: prod.title,
      price: prod.price,
      credit: prod.credit,
      image: `🛍️`,
      aspectRatio: ['square', 'portrait', 'landscape'][idx % 3] as 'square' | 'portrait' | 'landscape',
    }));
  };

  const products = generateProducts();

  // Calculate column heights for waterfall layout
  const getColumnClasses = (index: number) => {
    const aspectRatio = products[index]?.aspectRatio;
    if (aspectRatio === 'portrait') return 'md:col-span-1 md:row-span-2';
    if (aspectRatio === 'landscape') return 'md:col-span-2 md:row-span-1';
    return 'md:col-span-1 md:row-span-1';
  };

  const getAspectRatio = (aspectRatio: string) => {
    if (aspectRatio === 'portrait') return 'aspect-[3/4]';
    if (aspectRatio === 'landscape') return 'aspect-[16/9]';
    return 'aspect-square';
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-max gap-3 px-4">
        {products.map((product, index) => (
          <div
            key={product.id}
            className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg ${getColumnClasses(index)}`}
          >
            {/* Product Image */}
            <div
              className={`relative w-full ${getAspectRatio(products[index].aspectRatio)} bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-6xl overflow-hidden`}
            >
              {product.image}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Product Info Overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
              <h3 className="text-sm md:text-base font-semibold text-white line-clamp-2 mb-2">
                {product.title}
              </h3>
              <div className="flex items-center justify-between">
                <p className="text-lg md:text-xl font-bold text-transparent bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text">
                  ¥{product.price}
                </p>
                <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg">
                  <span className="text-xs text-yellow-300">⭐</span>
                  <span className="text-xs font-semibold text-white">{product.credit}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
