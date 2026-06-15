'use client';

import React, { useState } from 'react';

export default function FloatingNav() {
  const [activeItem, setActiveItem] = useState('home');

  const navItems = [
    { id: 'home', label: 'Home', icon: '◆' },
    { id: 'marketplace', label: 'Marketplace', icon: '♦' },
    { id: 'ai-sell', label: 'AI Sell', icon: '✨' },
    { id: 'services', label: 'Services', icon: '⚡' },
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'profile', label: 'Profile', icon: '◉' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-pink-200/30 px-4 md:px-6 py-3 md:py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="font-bold text-lg md:text-xl bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
          Campus Market
        </div>

        {/* Nav Items - Hidden on mobile, shown on desktop */}
        <div className="hidden md:flex gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveItem(item.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeItem === item.id
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-pink-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden p-2">
          <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
