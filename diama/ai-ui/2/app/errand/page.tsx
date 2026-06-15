"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { ErrandCard, type ErrandItem } from "@/components/errand-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Plus,
  Bike,
  Package,
  ShoppingCart,
  HelpCircle,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"

// Mock data
const mockErrands: ErrandItem[] = [
  {
    id: "1",
    type: "delivery",
    title: "帮取快递 菜鸟驿站",
    description: "东区菜鸟驿站有个包裹，麻烦帮忙取一下送到西区3号楼",
    reward: 5,
    deadline: "今天 18:00 前",
    from: "东区菜鸟驿站",
    to: "西区3号楼",
    weight: "约2kg",
    publisher: {
      id: "u1",
      name: "张同学",
      creditScore: 95,
    },
    status: "pending",
    createdAt: "2024-01-15 14:30",
  },
  {
    id: "2",
    type: "purchase",
    title: "代买食堂午餐",
    description: "帮忙在东区食堂买一份红烧肉盖饭+一杯豆浆，送到图书馆门口",
    reward: 8,
    deadline: "今天 12:00 前",
    to: "图书馆北门",
    publisher: {
      id: "u2",
      name: "李同学",
      creditScore: 92,
    },
    status: "pending",
    createdAt: "2024-01-15 11:00",
  },
  {
    id: "3",
    type: "help",
    title: "帮打印论文",
    description: "帮忙打印毕业论文初稿，A4双面，约50页，送到西区2号楼",
    reward: 10,
    deadline: "今天 20:00 前",
    to: "西区2号楼",
    publisher: {
      id: "u3",
      name: "王同学",
      creditScore: 98,
    },
    status: "pending",
    createdAt: "2024-01-15 10:30",
  },
  {
    id: "4",
    type: "delivery",
    title: "送文件到行政楼",
    description: "有一份资料需要送到行政楼3楼办公室",
    reward: 6,
    deadline: "今天 16:00 前",
    from: "信电楼",
    to: "行政楼3楼",
    weight: "轻便",
    publisher: {
      id: "u4",
      name: "赵老师",
      creditScore: 100,
    },
    status: "accepted",
    createdAt: "2024-01-15 09:00",
  },
  {
    id: "5",
    type: "purchase",
    title: "代买奶茶",
    description: "帮买一杯茶百道的杨枝甘露，去冰少糖，送到东区6号楼",
    reward: 5,
    deadline: "今天 15:00 前",
    to: "东区6号楼",
    publisher: {
      id: "u5",
      name: "陈同学",
      creditScore: 88,
    },
    status: "pending",
    createdAt: "2024-01-15 14:00",
  },
]

const stats = [
  { label: "今日发布", value: "128", icon: Package },
  { label: "正在进行", value: "45", icon: Bike },
  { label: "已完成", value: "1,280", icon: TrendingUp },
]

export default function ErrandPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [sortBy, setSortBy] = useState("new")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredErrands = mockErrands.filter((item) => {
    if (activeTab !== "all" && item.type !== activeTab) return false
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Hero Section */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-0">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Bike className="h-7 w-7 text-primary" />
                  校园跑腿
                </h1>
                <p className="text-muted-foreground mt-1">
                  发布任务或接单赚取零花钱
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/errand/publish">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    发布任务
                  </Button>
                </Link>
                <Link href="/errand/rider">
                  <Button variant="outline" className="gap-2">
                    <Bike className="h-4 w-4" />
                    骑手中心
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <stat.icon className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{stat.value}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索任务..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">最新发布</SelectItem>
              <SelectItem value="reward_high">赏金最高</SelectItem>
              <SelectItem value="deadline">即将截止</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start h-auto p-1 bg-secondary/50">
            <TabsTrigger value="all" className="gap-2">
              全部
              <Badge variant="secondary" className="ml-1">{mockErrands.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="delivery" className="gap-2">
              <Package className="h-4 w-4" />
              取送件
            </TabsTrigger>
            <TabsTrigger value="purchase" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              代购买
            </TabsTrigger>
            <TabsTrigger value="help" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              帮帮忙
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredErrands.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredErrands.map((item) => (
                  <ErrandCard key={item.id} item={item} isRider />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Bike className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">暂无相关任务</p>
                <p className="text-sm mt-1">试试发布一个新任务吧</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Load More */}
        {filteredErrands.length > 0 && (
          <div className="flex justify-center pt-4">
            <Button variant="outline" size="lg">
              加载更多
            </Button>
          </div>
        )}

        {/* How it works */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold mb-6 text-center">如何使用校园跑腿</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center p-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-2xl font-bold text-primary">
                1
              </div>
              <h3 className="font-semibold">发布任务</h3>
              <p className="text-sm text-muted-foreground mt-2">
                描述你的需求，设置合理的跑腿费和截止时间
              </p>
            </Card>
            <Card className="text-center p-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-2xl font-bold text-primary">
                2
              </div>
              <h3 className="font-semibold">骑手接单</h3>
              <p className="text-sm text-muted-foreground mt-2">
                校园骑手查看任务并接单，开始为你服务
              </p>
            </Card>
            <Card className="text-center p-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-2xl font-bold text-primary">
                3
              </div>
              <h3 className="font-semibold">完成交付</h3>
              <p className="text-sm text-muted-foreground mt-2">
                确认收货后，跑腿费自动结算给骑手
              </p>
            </Card>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
