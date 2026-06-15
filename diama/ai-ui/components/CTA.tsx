'use client';

import React from 'react';

export default function CTA() {
  return (
    <section className="relative bg-white py-12 md:py-16 px-4 md:px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          准备好开始了吗？
        </h2>

        <p className="text-base md:text-lg text-muted-foreground mb-8 md:mb-10 max-w-2xl mx-auto">
          加入数万校园用户，体验 AI 驱动的智能交易体验。安全、高效、有趣。
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center mb-10 md:mb-12 w-full max-w-sm sm:max-w-none mx-auto">
          <button className="flex-1 sm:flex-none px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold text-sm md:text-base bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg hover:shadow-primary/30 transition-all duration-300">
            立即下载应用
          </button>

          <button className="flex-1 sm:flex-none px-6 md:px-8 py-3 md:py-4 rounded-full font-semibold text-sm md:text-base bg-white border-2 border-primary/30 text-foreground hover:border-primary/60 transition-all duration-300">
            浏览商品
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
          {[
            { label: '校园覆盖', value: '50+' },
            { label: '用户评分', value: '4.8/5' },
            { label: '日均成交', value: '¥50万+' },
          ].map((stat) => (
            <div key={stat.label} className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-3 md:p-4">
              <div className="text-xs md:text-sm text-muted-foreground mb-1">{stat.label}</div>
              <div className="text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
