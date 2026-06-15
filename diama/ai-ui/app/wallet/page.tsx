'use client'

import BottomNav from '@/components/BottomNav'
import { walletRecords } from '@/lib/mock-campus-data'
import { ArrowDownLeft, ArrowUpRight, Shield, Wallet } from 'lucide-react'

export default function WalletPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8fb_0%,#ffffff_20%,#fffafc_100%)] pb-32">
      <section className="mx-auto max-w-4xl px-4 pt-5">
        <div className="rounded-[2rem] bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 p-6 text-white shadow-[0_24px_60px_rgba(233,30,99,0.22)]">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            <span className="font-medium">我的钱包</span>
          </div>
          <p className="mt-4 text-sm text-white/80">可用余额</p>
          <p className="mt-2 text-4xl font-bold">￥1,285.50</p>
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-white/80">
            <Shield className="h-4 w-4" />
            冻结金额 ￥100.00
          </p>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-4xl px-4">
        <div className="rounded-[1.75rem] border border-pink-200/50 bg-white/90 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">交易流水</h2>
          <div className="mt-4 space-y-4">
            {walletRecords.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-pink-100 pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
                    {item.amount >= 0 ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${item.amount >= 0 ? 'text-emerald-600' : 'text-foreground'}`}>
                    {item.amount >= 0 ? '+' : '-'}￥{Math.abs(item.amount).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.status === 'frozen' ? '冻结中' : '已完成'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BottomNav />
    </main>
  )
}
