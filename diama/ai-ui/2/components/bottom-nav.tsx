"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Home,
  ShoppingBag,
  Plus,
  MessageCircle,
  User,
} from "lucide-react"
import { usePathname } from "next/navigation"

interface BottomNavProps {
  className?: string
}

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname()

  const navItems = [
    { href: "/", label: "首页", icon: Home },
    { href: "/goods", label: "集市", icon: ShoppingBag },
    { href: "/publish", label: "发布", icon: Plus, isCenter: true },
    { href: "/messages", label: "消息", icon: MessageCircle, badge: 3 },
    { href: "/profile", label: "我的", icon: User },
  ]

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 safe-area-pb",
      className
    )}>
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          
          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg">
                  <item.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-[10px] mt-1 text-primary font-medium">{item.label}</span>
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center py-2 px-3"
            >
              <div className="relative">
                <item.icon className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] mt-1 transition-colors",
                isActive ? "text-primary font-medium" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
