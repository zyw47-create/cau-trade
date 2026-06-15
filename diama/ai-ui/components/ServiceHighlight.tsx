'use client';

import React from 'react';
import { Zap, Sparkles, MessageSquare, Target } from 'lucide-react';

export default function ServiceHighlight() {
  const services = [
    {
      id: 1,
      title: '跑腿服务',
      subtitle: '帮取帮送，足不出户',
      icon: Zap,
    },
    {
      id: 2,
      title: 'AI 辅助创作',
      subtitle: '智能生成商品标题和描述',
      icon: Sparkles,
    },
    {
      id: 3,
      title: '实时聊天',
      subtitle: '秒速沟通，安全交易',
      icon: MessageSquare,
    },
    {
      id: 4,
      title: '校园服务市场',
      subtitle: '专业服务提供商入驻',
      icon: Target,
    },
  ];

  return (
    <section className="relative bg-white py-12 md:py-16 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            多维度服务生态
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            不仅是交易平台，更是校园生活服务的完整解决方案
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                className="group bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6 md:p-8 border border-pink-200/50 hover:border-pink-300 hover:shadow-lg transition-all duration-300"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-200/50 to-purple-200/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-6 h-6 text-pink-600" />
                </div>

                {/* Content */}
                <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1">
                  {service.title}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  {service.subtitle}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
