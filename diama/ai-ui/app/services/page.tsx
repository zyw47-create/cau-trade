'use client'

import { serviceList } from '@/lib/mock-campus-data'
import BottomNav from '@/components/BottomNav'
import { SearchBar } from '@/components/campus/SearchBar'
import { Sparkles, Star } from 'lucide-react'

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8fb_0%,#ffffff_20%,#fffafc_100%)] pb-32">
      <section className="mx-auto max-w-5xl px-4 pt-5">
        <div className="rounded-[2rem] border border-pink-200/50 bg-white/85 p-6 shadow-sm">
          <p className="text-sm font-medium tracking-[0.2em] text-pink-600">CAMPUS SERVICE</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">校园服务广场</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">参考文件夹 2 的服务页功能结构，保留当前界面的轻盈渐变样式。</p>
          <div className="mt-4">
            <SearchBar value="" placeholder="搜索维修、家教、设计服务..." onChange={() => {}} />
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-5xl grid gap-4 px-4 md:grid-cols-2 xl:grid-cols-3">
        {serviceList.map((item) => (
          <div key={item.id} className="rounded-[1.75rem] border border-pink-200/50 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-medium text-pink-700">{item.category}</span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-500">
                <Star className="h-4 w-4 fill-current" />
                {item.rating}
              </span>
            </div>
            <h2 className="mt-4 text-lg font-bold text-foreground">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs text-muted-foreground shadow-sm">
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-5 flex items-end justify-between">
              <div>
                <p className="text-xl font-bold text-[#C2185B]">￥{item.price}</p>
                <p className="text-xs text-muted-foreground">/{item.unit}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{item.provider}</p>
                <p>{item.completedOrders} 单成交</p>
              </div>
            </div>
            <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4" />
              立即咨询
            </button>
          </div>
        ))}
      </section>

      <BottomNav />
    </main>
  )
}
