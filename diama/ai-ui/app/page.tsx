'use client'

import Link from 'next/link'
import { useState } from 'react'
import BottomNav from '@/components/BottomNav'
import { SearchBar } from '@/components/campus/SearchBar'
import { GoodsWaterfall } from '@/components/campus/GoodsWaterfall'
import { categories, goodsList, serviceList, errandList } from '@/lib/mock-campus-data'
import { ArrowRight, Bike, GraduationCap, Sparkles, Wrench } from 'lucide-react'

const quickServices = [
  { label: '跑腿代办', href: '/errand', icon: Bike, color: 'from-sky-500 to-cyan-400' },
  { label: '维修服务', href: '/services', icon: Wrench, color: 'from-amber-500 to-orange-400' },
  { label: '家教辅导', href: '/services', icon: GraduationCap, color: 'from-violet-500 to-fuchsia-400' },
  { label: 'AI 发布', href: '/publish', icon: Sparkles, color: 'from-pink-500 to-rose-400' },
]

export default function Home() {
  const [keyword, setKeyword] = useState('')
  const recommendGoods = goodsList.slice(0, 6)

  return (
    <main className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#fff8fb_0%,#ffffff_24%,#fffafc_100%)] pb-32">
      <section className="relative overflow-hidden px-4 pt-5">
        <div className="absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top_left,rgba(233,30,99,0.24),transparent_36%),radial-gradient(circle_at_top_right,rgba(95,251,241,0.18),transparent_34%),linear-gradient(180deg,rgba(255,248,251,1),rgba(255,255,255,0))]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="rounded-[2rem] border border-white/60 bg-white/70 p-5 shadow-[0_24px_60px_rgba(233,30,99,0.10)] backdrop-blur-xl">
            <p className="text-sm font-medium tracking-[0.25em] text-pink-600">CAMPUS TRADE</p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-foreground md:text-6xl">
              校园二手交易
              <br />
              微信小程序平台
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              保留现有前端视觉风格，按详细设计专章重构为符合微信小程序信息结构的校园交易平台。
              首页聚焦搜索入口、推荐商品、服务和发布引导，覆盖商品、服务、跑腿与站内沟通场景。
            </p>

            <div className="mt-5">
              <SearchBar
                value={keyword}
                placeholder="搜索商品、教材、耳机、服务..."
                onChange={setKeyword}
                onCancel={() => setKeyword('')}
              />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.5rem] bg-gradient-to-br from-pink-500 to-rose-400 p-5 text-white">
                <p className="text-sm opacity-90">推荐商品</p>
                <p className="mt-2 text-3xl font-bold">{goodsList.length}+</p>
                <p className="mt-3 text-sm opacity-90">首页推荐位按照文档要求保留商品发现与收藏入口。</p>
              </div>
              <div className="rounded-[1.5rem] bg-white p-5 shadow-sm">
                <p className="text-sm text-muted-foreground">校园服务</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{serviceList.length} 类</p>
                <p className="mt-3 text-sm text-muted-foreground">维修、家教、设计等服务统一接入业务页。</p>
              </div>
              <div className="rounded-[1.5rem] bg-white p-5 shadow-sm">
                <p className="text-sm text-muted-foreground">跑腿任务</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{errandList.length} 条</p>
                <p className="mt-3 text-sm text-muted-foreground">支持任务大厅、接单状态与赏金展示。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-6xl px-4">
        <div className="grid grid-cols-4 gap-3">
          {quickServices.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-[1.5rem] border border-pink-100 bg-white/85 p-4 text-center shadow-sm transition hover:-translate-y-1"
            >
              <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} text-white`}>
                <item.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xs font-medium text-foreground">{item.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-6xl px-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">热门分类</h2>
            <p className="text-sm text-muted-foreground">分类页采用左侧类目 + 右侧瀑布流结构</p>
          </div>
          <Link href="/category" className="inline-flex items-center gap-1 text-sm font-medium text-pink-600">
            进入分类
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category?category=${category.id}`}
              className="shrink-0 rounded-full bg-pink-50 px-4 py-2 text-sm text-pink-700"
            >
              {category.name} · {category.count}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-6xl px-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">推荐商品</h2>
            <p className="text-sm text-muted-foreground">商品卡片保留当前圆角渐变风格，并补齐 AI 审核、收藏、卖家信用信息。</p>
          </div>
          <Link href="/goods" className="inline-flex items-center gap-1 text-sm font-medium text-pink-600">
            查看更多
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <GoodsWaterfall goodsList={recommendGoods} />
      </section>

      <BottomNav />
    </main>
  )
}
