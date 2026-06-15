'use client'

import BottomNav from '@/components/BottomNav'
import { errandList } from '@/lib/mock-campus-data'
import { Bike, Clock3, Package, ShoppingBag } from 'lucide-react'

const typeLabel = {
  delivery: { label: '取送件', icon: Package },
  purchase: { label: '代购', icon: ShoppingBag },
  help: { label: '帮忙', icon: Bike },
}

export default function ErrandPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8fb_0%,#ffffff_20%,#fffafc_100%)] pb-32">
      <section className="mx-auto max-w-5xl px-4 pt-5">
        <div className="rounded-[2rem] border border-pink-200/50 bg-white/85 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-400 text-white">
              <Bike className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">校园跑腿大厅</h1>
              <p className="text-sm text-muted-foreground">支持任务发布、赏金展示、接单状态与履约进度</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-5xl grid gap-4 px-4 md:grid-cols-2">
        {errandList.map((item) => {
          const meta = typeLabel[item.type]
          const Icon = meta.icon

          return (
            <div key={item.id} className="rounded-[1.75rem] border border-pink-200/50 bg-white/90 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-3 py-1 text-xs font-medium text-pink-700">
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                </span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  赏金 ￥{item.reward}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-bold text-foreground">{item.title}</h2>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {item.from ? <p>取件地：{item.from}</p> : null}
                <p>送达地：{item.to}</p>
                <p>发布人：{item.publisher}</p>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs text-muted-foreground shadow-sm">
                <Clock3 className="h-3.5 w-3.5" />
                {item.deadline}
              </div>
              <button className="mt-5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white">
                立即接单
              </button>
            </div>
          )
        })}
      </section>

      <BottomNav />
    </main>
  )
}
