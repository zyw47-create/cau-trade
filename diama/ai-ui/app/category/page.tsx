'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { SearchBar } from '@/components/campus/SearchBar'
import { GoodsWaterfall } from '@/components/campus/GoodsWaterfall'
import { categories, goodsList } from '@/lib/mock-campus-data'

export default function CategoryPage() {
  const searchParams = useSearchParams()
  const [keyword, setKeyword] = useState(searchParams.get('keyword') ?? '')
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') ?? 'all')

  useEffect(() => {
    setKeyword(searchParams.get('keyword') ?? '')
    setActiveCategory(searchParams.get('category') ?? 'all')
  }, [searchParams])

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
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8fb_0%,#ffffff_18%,#fffafc_100%)] pb-32">
      <section className="sticky top-0 z-30 border-b border-pink-200/40 bg-white/86 px-4 py-4 backdrop-blur-xl">
        <SearchBar
          value={keyword}
          placeholder="搜索商品..."
          onChange={setKeyword}
          onCancel={() => setKeyword('')}
        />
      </section>

      <section className="flex min-h-[calc(100vh-6rem)]">
        <aside className="w-24 shrink-0 border-r border-pink-100 bg-[linear-gradient(180deg,rgba(248,187,208,0.18),rgba(255,255,255,0.85))] px-2 py-4">
          <div className="space-y-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`w-full rounded-2xl px-2 py-3 text-left transition ${
                  activeCategory === category.id
                    ? 'bg-white text-pink-700 shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                <p className="text-sm font-semibold">{category.name}</p>
                <p className="mt-1 text-xs">{category.count}</p>
              </button>
            ))}
          </div>
        </aside>

        <div className="flex-1 px-4 py-5">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {categories.find((item) => item.id === activeCategory)?.name ?? '全部商品'}
              </h1>
              <p className="text-sm text-muted-foreground">
                搜索防抖、分页和瀑布流结构已按文档对应到当前界面层级
              </p>
            </div>
            <div className="rounded-full bg-pink-50 px-3 py-2 text-xs text-pink-700">
              {list.length} 件
            </div>
          </div>

          {list.length > 0 ? (
            <GoodsWaterfall goodsList={list} />
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-pink-200 bg-white/80 p-8 text-center text-sm text-muted-foreground">
              没有找到符合条件的商品，试试更换关键词或分类。
            </div>
          )}
        </div>
      </section>

      <BottomNav />
    </main>
  )
}
