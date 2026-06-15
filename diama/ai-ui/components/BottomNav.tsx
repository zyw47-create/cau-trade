'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, MessageCircle, PlusCircle, User } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { id: 'home', label: '首页', icon: Home, href: '/' },
    { id: 'category', label: '分类', icon: LayoutGrid, href: '/category' },
    { id: 'publish', label: '发布', icon: PlusCircle, href: '/publish', isCenter: true },
    { id: 'messages', label: '消息', icon: MessageCircle, href: '/messages' },
    { id: 'profile', label: '我的', icon: User, href: '/profile' },
  ]

  return (
    <nav className="fixed bottom-5 left-1/2 z-50 w-[min(92vw,32rem)] -translate-x-1/2 px-2">
      <div className="rounded-[2rem] border border-white/60 bg-white/55 px-4 py-3 shadow-[0_18px_50px_rgba(233,30,99,0.16)] backdrop-blur-2xl">
        <div className="flex items-end justify-between">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            if (item.isCenter) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex flex-col items-center justify-center -mt-8 transition hover:scale-105"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 shadow-[0_12px_28px_rgba(233,30,99,0.35)]">
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <span className="mt-2 text-xs font-medium text-foreground">{item.label}</span>
                </Link>
              )
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                className="relative flex min-w-14 flex-col items-center rounded-2xl px-3 py-2 transition"
              >
                {isActive ? (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500/16 to-rose-500/16" />
                ) : null}
                <Icon className={`relative h-5 w-5 ${isActive ? 'text-pink-600' : 'text-foreground/55'}`} />
                <span className={`relative mt-1 text-xs font-medium ${isActive ? 'text-pink-600' : 'text-foreground/55'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
