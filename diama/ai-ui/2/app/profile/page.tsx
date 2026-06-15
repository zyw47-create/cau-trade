"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Settings,
  ChevronRight,
  Star,
  Shield,
  Wallet,
  Package,
  Heart,
  History,
  MessageSquare,
  HelpCircle,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Camera,
  Edit2,
} from "lucide-react"

// Mock user data
const mockUser = {
  id: "u1",
  name: "张三",
  avatar: "/placeholder.svg?height=200&width=200",
  studentId: "2021****3456",
  college: "信息与电气工程学院",
  grade: "2021级",
  phone: "138****1234",
  isVerified: true,
  role: "user",
  creditScore: 98,
  balance: 128.5,
  joinedAt: "2022-09-01",
  stats: {
    published: 15,
    sold: 12,
    bought: 8,
    favorites: 26,
  },
}

const menuItems = [
  {
    title: "我的订单",
    icon: Package,
    href: "/orders",
    badge: "2",
  },
  {
    title: "我的钱包",
    icon: Wallet,
    href: "/wallet",
    badge: null,
    value: `¥${mockUser.balance}`,
  },
  {
    title: "我的收藏",
    icon: Heart,
    href: "/favorites",
    badge: null,
  },
  {
    title: "浏览历史",
    icon: History,
    href: "/history",
    badge: null,
  },
  {
    title: "我的消息",
    icon: MessageSquare,
    href: "/messages",
    badge: "5",
  },
]

const settingItems = [
  {
    title: "账号设置",
    icon: Settings,
    href: "/settings",
  },
  {
    title: "帮助与反馈",
    icon: HelpCircle,
    href: "/help",
  },
]

const recentOrders = [
  {
    id: "o1",
    title: "iPad Pro 11寸 2022款",
    price: 4999,
    status: "待发货",
    statusColor: "bg-amber-500",
    image: "/placeholder.svg?height=100&width=100",
  },
  {
    id: "o2",
    title: "考研数学全套教材",
    price: 120,
    status: "已完成",
    statusColor: "bg-primary",
    image: "/placeholder.svg?height=100&width=100",
  },
]

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("selling")

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20 border-4 border-background">
                    <AvatarImage src={mockUser.avatar} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      {mockUser.name.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground">
                    <Camera className="h-3 w-3" />
                  </button>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">{mockUser.name}</h1>
                    {mockUser.isVerified && (
                      <Badge className="gap-1 bg-primary">
                        <CheckCircle2 className="h-3 w-3" />
                        已实名
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {mockUser.college} · {mockUser.grade}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    学号: {mockUser.studentId}
                  </p>
                </div>
              </div>
              <Link href="/profile/edit">
                <Button variant="outline" size="sm" className="gap-1">
                  <Edit2 className="h-3 w-3" />
                  编辑
                </Button>
              </Link>
            </div>

            {/* Credit Score */}
            <div className="mt-6 p-4 rounded-xl bg-background/80 backdrop-blur">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-medium">信用分</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-xl font-bold text-primary">{mockUser.creditScore}</span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
              </div>
              <Progress value={mockUser.creditScore} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                信用良好，享受平台全部功能
              </p>
            </div>
          </div>

          {/* Stats */}
          <CardContent className="p-0">
            <div className="grid grid-cols-4 divide-x">
              <Link href="/profile/published" className="py-4 text-center hover:bg-secondary/50 transition-colors">
                <div className="text-xl font-bold">{mockUser.stats.published}</div>
                <div className="text-xs text-muted-foreground">发布</div>
              </Link>
              <Link href="/profile/sold" className="py-4 text-center hover:bg-secondary/50 transition-colors">
                <div className="text-xl font-bold">{mockUser.stats.sold}</div>
                <div className="text-xs text-muted-foreground">卖出</div>
              </Link>
              <Link href="/orders?type=buy" className="py-4 text-center hover:bg-secondary/50 transition-colors">
                <div className="text-xl font-bold">{mockUser.stats.bought}</div>
                <div className="text-xs text-muted-foreground">买入</div>
              </Link>
              <Link href="/favorites" className="py-4 text-center hover:bg-secondary/50 transition-colors">
                <div className="text-xl font-bold">{mockUser.stats.favorites}</div>
                <div className="text-xs text-muted-foreground">收藏</div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">最近订单</CardTitle>
            <Link href="/orders" className="text-sm text-primary flex items-center">
              全部订单
              <ChevronRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-muted shrink-0">
                      <Image
                        src={order.image}
                        alt={order.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-1">{order.title}</h3>
                      <p className="text-primary font-semibold mt-1">¥{order.price}</p>
                    </div>
                    <Badge className={order.statusColor}>{order.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Menu */}
        <Card>
          <CardContent className="p-0">
            {menuItems.map((item, index) => (
              <div key={item.title}>
                <Link href={item.href}>
                  <div className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.value && (
                        <span className="text-sm font-semibold text-primary">{item.value}</span>
                      )}
                      {item.badge && (
                        <Badge className="h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                          {item.badge}
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
                {index < menuItems.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardContent className="p-0">
            {settingItems.map((item, index) => (
              <div key={item.title}>
                <Link href={item.href}>
                  <div className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <item.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
                {index < settingItems.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Logout */}
        <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive">
          <LogOut className="h-4 w-4" />
          退出登录
        </Button>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-4">
          <p>农大集市 v1.0.0</p>
          <p className="mt-1">© 2024 中国农业大学 校园数字服务开发组</p>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
