"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { GoodsCard, type GoodsItem } from "@/components/goods-card"
import { CategoryGrid } from "@/components/category-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { 
  ChevronRight,
  Bike,
  Wrench,
  GraduationCap,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowRight,
} from "lucide-react"

// Mock data for demonstration
const mockGoods: GoodsItem[] = [
  {
    id: "1",
    title: "iPad Pro 11寸 2022款 M2芯片 256G 国行",
    price: 4999,
    originalPrice: 6999,
    images: ["/placeholder.svg?height=400&width=400"],
    seller: {
      id: "u1",
      name: "李同学",
      college: "信息学院",
      creditScore: 98,
      isVerified: true,
    },
    category: "electronics",
    condition: "几乎全新",
    location: "东区",
    views: 328,
    likes: 45,
    comments: 12,
    isAiAudit: true,
    status: "on_sale",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    title: "考研数学全套教材 张宇、汤家凤等",
    price: 120,
    originalPrice: 350,
    images: ["/placeholder.svg?height=400&width=400"],
    seller: {
      id: "u2",
      name: "王学姐",
      college: "理学院",
      creditScore: 95,
      isVerified: true,
    },
    category: "books",
    condition: "轻微使用",
    location: "西区",
    views: 256,
    likes: 38,
    comments: 8,
    status: "on_sale",
    createdAt: "2024-01-14",
  },
  {
    id: "3",
    title: "小米14 Pro 12+256G 白色 全新未拆封",
    price: 4299,
    originalPrice: 4999,
    images: ["/placeholder.svg?height=400&width=400"],
    seller: {
      id: "u3",
      name: "张同学",
      college: "工学院",
      creditScore: 92,
      isVerified: true,
    },
    category: "electronics",
    condition: "全新",
    location: "东区",
    views: 512,
    likes: 89,
    comments: 23,
    isAiAudit: true,
    status: "on_sale",
    createdAt: "2024-01-13",
  },
  {
    id: "4",
    title: "捷安特自行车 ATX860 九成新 刚保养过",
    price: 800,
    originalPrice: 1599,
    images: ["/placeholder.svg?height=400&width=400"],
    seller: {
      id: "u4",
      name: "陈同学",
      college: "农学院",
      creditScore: 88,
      isVerified: true,
    },
    category: "transport",
    condition: "几乎全新",
    location: "西区",
    views: 178,
    likes: 25,
    comments: 6,
    status: "on_sale",
    createdAt: "2024-01-12",
  },
  {
    id: "5",
    title: "索尼WH-1000XM5 无线降噪耳机 黑色",
    price: 1899,
    originalPrice: 2999,
    images: ["/placeholder.svg?height=400&width=400"],
    seller: {
      id: "u5",
      name: "刘同学",
      college: "人文学院",
      creditScore: 96,
      isVerified: true,
    },
    category: "electronics",
    condition: "几乎全新",
    location: "东区",
    views: 234,
    likes: 52,
    comments: 15,
    isAiAudit: true,
    status: "on_sale",
    createdAt: "2024-01-11",
  },
  {
    id: "6",
    title: "Lululemon 瑜伽垫 5mm厚 全新带包装",
    price: 299,
    originalPrice: 580,
    images: ["/placeholder.svg?height=400&width=400"],
    seller: {
      id: "u6",
      name: "周同学",
      college: "体育学院",
      creditScore: 94,
      isVerified: true,
    },
    category: "sports",
    condition: "全新",
    location: "西区",
    views: 145,
    likes: 28,
    comments: 4,
    status: "on_sale",
    createdAt: "2024-01-10",
  },
]

const quickServices = [
  { icon: Bike, label: "跑腿代办", href: "/errand", color: "bg-blue-500/10 text-blue-600" },
  { icon: Wrench, label: "维修服务", href: "/services?cat=repair", color: "bg-amber-500/10 text-amber-600" },
  { icon: GraduationCap, label: "家教辅导", href: "/services?cat=tutor", color: "bg-purple-500/10 text-purple-600" },
  { icon: Sparkles, label: "AI发布", href: "/publish?ai=true", color: "bg-primary/10 text-primary" },
]

const banners = [
  {
    id: "1",
    title: "毕业季特惠",
    subtitle: "学长学姐清仓大甩卖",
    image: "/placeholder.svg?height=200&width=600",
    color: "from-primary/20 to-primary/5",
  },
  {
    id: "2", 
    title: "开学季必备",
    subtitle: "教材、电子产品应有尽有",
    image: "/placeholder.svg?height=200&width=600",
    color: "from-blue-500/20 to-blue-500/5",
  },
]

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("")

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Banner Carousel */}
        <section>
          <ScrollArea className="w-full whitespace-nowrap rounded-2xl">
            <div className="flex gap-4">
              {banners.map((banner) => (
                <Card 
                  key={banner.id} 
                  className={`shrink-0 w-[85vw] md:w-[600px] overflow-hidden bg-gradient-to-r ${banner.color} border-0`}
                >
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between p-6">
                      <div>
                        <Badge className="mb-2">限时活动</Badge>
                        <h2 className="text-2xl font-bold">{banner.title}</h2>
                        <p className="text-muted-foreground mt-1">{banner.subtitle}</p>
                        <Button size="sm" className="mt-4 gap-2">
                          立即查看
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="relative h-24 w-24 md:h-32 md:w-32">
                        <Image
                          src={banner.image}
                          alt={banner.title}
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>

        {/* Quick Services */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">快捷服务</h2>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {quickServices.map((service) => (
              <Link 
                key={service.label} 
                href={service.href}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-secondary transition-colors"
              >
                <div className={`p-3 rounded-2xl ${service.color}`}>
                  <service.icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-center">{service.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">商品分类</h2>
            <Link href="/categories" className="flex items-center text-sm text-primary">
              全部分类
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <CategoryGrid onSelect={(id) => setSelectedCategory(id)} />
        </section>

        {/* Hot Items */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">热门推荐</h2>
            </div>
            <Link href="/goods?sort=hot" className="flex items-center text-sm text-primary">
              查看更多
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {mockGoods.slice(0, 4).map((item) => (
              <GoodsCard key={item.id} item={item} />
            ))}
          </div>
        </section>

        {/* Recent Items */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">最新发布</h2>
            </div>
            <Link href="/goods?sort=new" className="flex items-center text-sm text-primary">
              查看更多
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {mockGoods.slice(2).map((item) => (
              <GoodsCard key={item.id} item={item} />
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section className="mt-8">
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-0">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-primary">12,580+</div>
                  <div className="text-sm text-muted-foreground mt-1">注册用户</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">8,320+</div>
                  <div className="text-sm text-muted-foreground mt-1">在售商品</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">25,600+</div>
                  <div className="text-sm text-muted-foreground mt-1">成功交易</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">99.5%</div>
                  <div className="text-sm text-muted-foreground mt-1">好评率</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Trust Section */}
        <section className="py-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold">为什么选择农大集市?</h2>
            <p className="text-muted-foreground mt-2">校内交易 安全放心</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="text-center p-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">实名认证</h3>
              <p className="text-sm text-muted-foreground mt-2">
                全员学号实名认证，确保交易双方身份真实可信
              </p>
            </Card>
            <Card className="text-center p-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">AI智能审核</h3>
              <p className="text-sm text-muted-foreground mt-2">
                大模型智能审核商品内容，杜绝违规信息
              </p>
            </Card>
            <Card className="text-center p-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">资金安全</h3>
              <p className="text-sm text-muted-foreground mt-2">
                平台托管交易资金，确认收货后才放款给卖家
              </p>
            </Card>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
