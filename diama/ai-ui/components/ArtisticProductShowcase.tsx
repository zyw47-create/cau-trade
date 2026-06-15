'use client';

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

interface Product {
  id: number;
  title: string;
  category: string;
  price: number;
  credit: number;
  image: string;
  description: string;
  featured?: boolean;
}

const PRODUCTS: Product[] = [
  { id: 1, title: '限定款机械键盘', category: '数码', price: 599, credit: 98, image: '⌨️', description: 'Premium mechanical keyboard', featured: true },
  { id: 2, title: '高质感笔记本', category: '文创', price: 89, credit: 95, image: '📓', description: 'Premium notebook' },
  { id: 3, title: 'AirPods Pro 2', category: '数码', price: 1799, credit: 99, image: '🎧', description: 'Wireless earbuds' },
  { id: 4, title: '手工香薰蜡烛', category: '生活', price: 129, credit: 96, image: '🕯️', description: 'Handmade candle' },
  { id: 5, title: '艺术海报套装', category: '装饰', price: 199, credit: 97, image: '🖼️', description: 'Art posters collection' },
  { id: 6, title: '无线充电盘', category: '数码', price: 199, credit: 98, image: '🔌', description: 'Wireless charger' },
];

export default function ArtisticProductShowcase() {
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const toggleLike = (id: number) => {
    const newLiked = new Set(likedIds);
    if (newLiked.has(id)) {
      newLiked.delete(id);
    } else {
      newLiked.add(id);
    }
    setLikedIds(newLiked);
  };

  const featuredProduct = PRODUCTS.find((p) => p.featured);
  const otherProducts = PRODUCTS.filter((p) => !p.featured);

  return (
    <section className="relative w-full py-16 md:py-32 px-6 md:px-12 lg:px-20 bg-white">
      {/* Section Title */}
      <div className="mb-16 md:mb-24">
        <h3 className="text-4xl md:text-5xl font-black font-serif-sc text-black mb-3">
          精选商品
        </h3>
        <p className="text-lg md:text-xl text-foreground/60 font-light">
          Featured <span className="font-serif italic">Collection</span>
        </p>
      </div>

      {/* Featured Product - Large Card */}
      {featuredProduct && (
        <div className={`mb-16 md:mb-24 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="group relative rounded-3xl overflow-hidden bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200/30 p-8 md:p-12 hover:shadow-2xl hover:shadow-pink-300/20 transition-all duration-500 cursor-pointer">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-100/30 to-purple-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />

            {/* Content */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
              {/* Left - Image */}
              <div className="flex items-center justify-center">
                <div className="text-8xl md:text-9xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                  {featuredProduct.image}
                </div>
              </div>

              {/* Right - Info */}
              <div className="space-y-6">
                <div>
                  <span className="inline-block px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full text-sm font-semibold text-pink-600 mb-4">
                    {featuredProduct.category}
                  </span>
                  <h4 className="text-3xl md:text-4xl font-bold font-serif-sc text-black mb-2">
                    {featuredProduct.title}
                  </h4>
                  <p className="text-foreground/60 font-serif italic">
                    {featuredProduct.description}
                  </p>
                </div>

                <div className="flex items-end gap-8">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">价格 / Price</p>
                    <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                      ¥{featuredProduct.price}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">信用评分 / Rating</p>
                    <p className="text-2xl font-bold text-pink-600">
                      {featuredProduct.credit}%
                    </p>
                  </div>
                </div>

                <button className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full font-semibold hover:shadow-lg transition-all duration-300">
                  查看详情 / View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {otherProducts.map((product, index) => (
          <div
            key={product.id}
            className={`group relative rounded-2xl overflow-hidden bg-white border border-foreground/10 hover:border-pink-300/50 p-6 transition-all duration-500 hover:shadow-xl hover:shadow-pink-200/20 transform hover:-translate-y-2 hover:scale-105 ${
              isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-10'
            }`}
            style={{
              transitionDelay: isVisible ? `${index * 100}ms` : '0ms',
            }}
          >
            {/* Image Container */}
            <div className="relative h-48 md:h-56 bg-gradient-to-br from-pink-100/50 to-purple-100/50 rounded-xl mb-4 flex items-center justify-center group-hover:shadow-lg transition-shadow duration-300 overflow-hidden">
              <div className="text-6xl md:text-7xl group-hover:scale-125 group-hover:rotate-6 transition-transform duration-500">
                {product.image}
              </div>
            </div>

            {/* Info */}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <span className="inline-block text-xs font-semibold text-pink-600 mb-2">
                    {product.category}
                  </span>
                  <h5 className="text-lg font-bold font-serif-sc text-black line-clamp-2 group-hover:text-pink-600 transition-colors">
                    {product.title}
                  </h5>
                </div>
                <button
                  onClick={() => toggleLike(product.id)}
                  className="flex-shrink-0 p-2 hover:bg-pink-50 rounded-full transition-all"
                >
                  <Heart
                    size={20}
                    className={likedIds.has(product.id) ? 'fill-pink-500 text-pink-500' : 'text-foreground/30'}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-foreground/10">
                <p className="text-2xl font-bold text-transparent bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text">
                  ¥{product.price}
                </p>
                <p className="text-sm font-semibold text-pink-600">{product.credit}% 信用</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
