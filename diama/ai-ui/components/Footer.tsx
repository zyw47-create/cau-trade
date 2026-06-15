'use client';

import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-white border-t border-muted/30">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-8 md:mb-10">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <div className="text-lg md:text-2xl font-bold mb-2 md:mb-4">
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Campus Market
              </span>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              AI校园交易平台
            </p>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 md:mb-4 text-sm">产品</h4>
            <ul className="space-y-2 text-xs md:text-sm text-muted-foreground">
              {['首页', '商品广场', 'AI推荐', '跑腿服务'].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-primary transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 md:mb-4 text-sm">公司</h4>
            <ul className="space-y-2 text-xs md:text-sm text-muted-foreground">
              {['关于我们', '联系我们', '新闻动态', '加入我们'].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-primary transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 md:mb-4 text-sm">法律</h4>
            <ul className="space-y-2 text-xs md:text-sm text-muted-foreground">
              {['隐私政策', '服务条款', '用户协议', '投诉反馈'].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-primary transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-muted/30 mb-6 md:mb-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs md:text-sm text-muted-foreground">
          <p>
            © {currentYear} Campus Market. All rights reserved.
          </p>

          {/* Social Links */}
          <div className="flex gap-4 md:gap-6">
            {['微博', 'WeChat', '小红书', '抖音'].map((social) => (
              <a
                key={social}
                href="#"
                className="hover:text-primary transition-colors"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
