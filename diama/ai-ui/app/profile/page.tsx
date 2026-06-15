'use client'

import Link from 'next/link'
import { ChevronRight, CreditCard, Heart, HelpCircle, Package, Settings, ShieldCheck, Wallet } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { profile } from '@/lib/mock-campus-data'

const menuItems = [
  { label: '我的发布', href: '/goods', icon: Package },
  { label: '我的收藏', href: '/goods', icon: Heart },
  { label: '我的订单', href: '/orders', icon: CreditCard },
  { label: '我的钱包', href: '/wallet', icon: Wallet },
  { label: '帮助中心', href: '/services', icon: HelpCircle },
]

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8fb_0%,#ffffff_20%,#fffafc_100%)] pb-32">
      <section className="relative overflow-hidden px-4 pt-5">
        <div className="absolute inset-x-0 top-0 h-52 bg-gradient-to-br from-pink-500 via-rose-400 to-orange-300" />
        <div className="relative mx-auto max-w-3xl">
          <div className="flex justify-end">
            <button className="rounded-full bg-white/20 p-3 text-white backdrop-blur">
              <Settings className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 rounded-[2rem] border border-white/60 bg-white/92 p-6 shadow-[0_24px_60px_rgba(233,30,99,0.16)]">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-pink-200 to-rose-100 text-3xl font-bold text-pink-700">
                张
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">{profile.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{profile.grade}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-medium text-pink-700">
                    {profile.badge}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    实名认证
                  </span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    信用 {profile.creditScore}
                  </span>
                </div>
              </div>
              <Link href="/publish" className="rounded-full border border-pink-200 px-4 py-2 text-sm font-medium text-pink-700">
                去发布
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-4 gap-3 border-t border-pink-100 pt-5">
              {profile.stats.map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-2xl font-bold text-[#C2185B]">{item.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-3xl space-y-3 px-4">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-4 rounded-[1.5rem] border border-pink-200/50 bg-white/90 px-4 py-4 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-pink-600">
              <item.icon className="h-5 w-5" />
            </div>
            <span className="flex-1 font-medium text-foreground">{item.label}</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        ))}
      </section>

      <BottomNav />
    </main>
  )
}
