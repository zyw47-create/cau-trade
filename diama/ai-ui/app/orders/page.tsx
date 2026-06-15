'use client'

import Link from 'next/link'
import { CheckCircle2, Clock3, Package, Truck } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { orderList } from '@/lib/mock-campus-data'

const statusMap = {
  paid: { icon: Package, color: 'text-sky-600', bg: 'bg-sky-50' },
  shipped: { icon: Truck, color: 'text-violet-600', bg: 'bg-violet-50' },
  completed: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  refunding: { icon: Clock3, color: 'text-amber-600', bg: 'bg-amber-50' },
}

export default function OrdersPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8fb_0%,#ffffff_18%,#fffafc_100%)] pb-32">
      <section className="mx-auto max-w-4xl px-4 pt-5">
        <h1 className="text-2xl font-bold text-foreground">我的订单</h1>
        <p className="mt-1 text-sm text-muted-foreground">覆盖待发货、待收货、已完成等交易状态</p>
      </section>

      <section className="mx-auto mt-5 max-w-4xl space-y-4 px-4">
        {orderList.map((order) => {
          const status = statusMap[order.status]
          const StatusIcon = status.icon

          return (
            <div key={order.id} className="rounded-[1.75rem] border border-pink-200/50 bg-white/90 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{order.orderSn}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{order.createdAt}</p>
                </div>
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${status.bg} ${status.color}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {order.statusLabel}
                </span>
              </div>

              <div className="mt-4 flex gap-4">
                <div className="h-24 w-24 rounded-[1.25rem] bg-gradient-to-br from-pink-100 via-white to-cyan-50" />
                <div className="flex-1">
                  <h2 className="font-semibold text-foreground">{order.goodsTitle}</h2>
                  <p className="mt-2 text-lg font-bold text-[#C2185B]">￥{order.price}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {order.role === 'buy' ? '卖家' : '买家'}：{order.otherParty}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <Link href="/messages" className="rounded-full border border-pink-200 px-4 py-2 text-sm font-medium text-pink-700">
                  联系对方
                </Link>
                <button className="rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white">
                  查看详情
                </button>
              </div>
            </div>
          )
        })}
      </section>

      <BottomNav />
    </main>
  )
}
