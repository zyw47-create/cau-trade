'use client'

import { useMemo, useState } from 'react'
import BottomNav from '@/components/BottomNav'
import { SearchBar } from '@/components/campus/SearchBar'
import { GoodsWaterfall } from '@/components/campus/GoodsWaterfall'
import { categories, goodsList } from '@/lib/mock-campus-data'

export default function GoodsPage() {
  const [keyword, setKeyword] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const list = useMemo(
    () =>
      goodsList.filter((item) => {
        const byCategory = activeCategory === 'all' || item.categoryId === activeCategory
        const byKeyword =
          keyword.trim().length === 0 ||
          item.title.includes(keyword) ||
          item.summary.includes(keyword)
        return byCategory && byKeyword
      }),
    [activeCategory, keyword],
  )

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8fb_0%,#ffffff_22%,#fffafc_100%)] pb-32">
      <section className="sticky top-0 z-30 border-b border-pink-200/40 bg-white/85 px-4 py-4 backdrop-blur-xl">
        <SearchBar
          value={keyword}
          placeholder="搜索商品、教材或闲置..."
          onChange={setKeyword}
          onCancel={() => setKeyword('')}
        />
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${
                activeCategory === category.id
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
                  : 'bg-pink-50 text-pink-700'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>

      <section className="px-4 py-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">商品发现</h1>
            <p className="text-sm text-muted-foreground">共找到 {list.length} 件校园好物</p>
          </div>
        </div>
        <GoodsWaterfall goodsList={list} />
      </section>
      <BottomNav />
    </main>
  )
}
