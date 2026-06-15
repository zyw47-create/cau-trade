'use client';

import React from 'react';
import { Zap, Shield, Sparkles, TrendingUp } from 'lucide-react';

export default function Features() {
  const features = [
    {
      id: 1,
      icon: Sparkles,
      title: 'AI 智能推荐',
      description: '机器学习为你推荐最匹配的商品',
    },
    {
      id: 2,
      icon: Zap,
      title: '闪电配送',
      description: '校园内最快30分钟送达',
    },
    {
      id: 3,
      icon: Shield,
      title: '安全交易',
      description: '资金托管 + 买家保护',
    },
    {
      id: 4,
      icon: TrendingUp,
      title: '信用体系',
      description: '透明的卖家信用评分',
    },
  ];

  return (
    <section className="relative py-16 md:py-24 px-4 md:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            为什么选择我们
          </h2>
          <p className="text-base md:text-lg text-muted-foreground">
            四大核心优势，让交易更简单
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 md:mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className="group bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6 md:p-8 border border-pink-200/50 hover:border-pink-300 hover:shadow-lg transition-all duration-300"
              >
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-200/50 to-purple-200/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-7 h-7 text-pink-600" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Stats Section - Minimalist Design with pink accent */}
        <div className="rounded-2xl bg-gradient-to-r from-pink-100/50 via-purple-100/50 to-violet-100/50 border border-pink-300/30 p-8 md:p-12">
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            {[
              { label: '活跃用户', value: '50K+' },
              { label: '商品数量', value: '100K+' },
              { label: '日成交额', value: '¥500K+' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
