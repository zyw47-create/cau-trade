"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { ServiceCard, type ServiceItem } from "@/components/service-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
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
  GraduationCap,
  Wrench,
  Camera,
  Palette,
  Code,
  Music,
  Scissors,
  Dumbbell,
} from "lucide-react"
import Link from "next/link"

// Mock data
const mockServices: ServiceItem[] = [
  {
    id: "1",
    title: "考研数学一对一辅导",
    description: "985数学系研究生，擅长高等数学、线性代数、概率论，帮助你轻松拿下考研数学",
    price: 100,
    unit: "小时",
    images: ["/placeholder.svg?height=300&width=400"],
    provider: {
      id: "u1",
      name: "王学长",
      college: "理学院",
      rating: 4.9,
      reviewCount: 56,
      isVerified: true,
    },
    category: "家教辅导",
    tags: ["考研数学", "一对一", "线上/线下"],
    location: "东区/线上",
    availability: "周末全天",
    completedOrders: 48,
    status: "active",
  },
  {
    id: "2",
    title: "电脑维修 系统重装 硬件升级",
    description: "计算机专业，5年维修经验，可上门服务。系统重装、病毒清理、硬件升级、数据恢复等",
    price: 50,
    unit: "次",
    images: ["/placeholder.svg?height=300&width=400"],
    provider: {
      id: "u2",
      name: "李同学",
      college: "信息学院",
      rating: 4.8,
      reviewCount: 89,
      isVerified: true,
    },
    category: "维修服务",
    tags: ["电脑维修", "系统重装", "上门服务"],
    location: "全校区",
    availability: "随时可约",
    completedOrders: 126,
    status: "active",
  },
  {
    id: "3",
    title: "证件照 形象照 写真拍摄",
    description: "摄影专业学生，自带专业设备和灯光，可拍摄证件照、形象照、个人写真等",
    price: 30,
    unit: "组",
    images: ["/placeholder.svg?height=300&width=400"],
    provider: {
      id: "u3",
      name: "张同学",
      college: "人文学院",
      rating: 4.9,
      reviewCount: 134,
      isVerified: true,
    },
    category: "摄影服务",
    tags: ["证件照", "形象照", "修图"],
    location: "校内工作室",
    availability: "提前预约",
    completedOrders: 210,
    status: "active",
  },
  {
    id: "4",
    title: "PPT设计 海报制作",
    description: "设计专业，精通PS/AI/PPT，可承接PPT美化、海报设计、Logo设计等",
    price: 80,
    unit: "份",
    images: ["/placeholder.svg?height=300&width=400"],
    provider: {
      id: "u4",
      name: "陈同学",
      college: "艺术学院",
      rating: 4.7,
      reviewCount: 67,
      isVerified: true,
    },
    category: "设计服务",
    tags: ["PPT设计", "海报", "Logo"],
    location: "线上",
    availability: "工作日晚上",
    completedOrders: 85,
    status: "active",
  },
  {
    id: "5",
    title: "Python/Java编程辅导",
    description: "大厂实习经历，擅长Python、Java、数据结构与算法，可辅导课程作业或项目开发",
    price: 80,
    unit: "小时",
    images: ["/placeholder.svg?height=300&width=400"],
    provider: {
      id: "u5",
      name: "赵学长",
      college: "信息学院",
      rating: 4.9,
      reviewCount: 45,
      isVerified: true,
    },
    category: "编程辅导",
    tags: ["Python", "Java", "算法"],
    location: "东区/线上",
    availability: "周末",
    completedOrders: 62,
    status: "active",
  },
  {
    id: "6",
    title: "吉他入门教学",
    description: "校乐团吉他手，8年琴龄，可教民谣吉他入门、弹唱、指弹基础",
    price: 60,
    unit: "课时",
    images: ["/placeholder.svg?height=300&width=400"],
    provider: {
      id: "u6",
      name: "刘同学",
      college: "经管学院",
      rating: 4.8,
      reviewCount: 38,
      isVerified: true,
    },
    category: "音乐教学",
    tags: ["吉他", "弹唱", "零基础"],
    location: "琴房/宿舍",
    availability: "晚上/周末",
    completedOrders: 45,
    status: "active",
  },
]

const serviceCategories = [
  { id: "all", label: "全部", icon: null },
  { id: "tutor", label: "家教辅导", icon: GraduationCap },
  { id: "repair", label: "维修服务", icon: Wrench },
  { id: "photo", label: "摄影服务", icon: Camera },
  { id: "design", label: "设计服务", icon: Palette },
  { id: "coding", label: "编程辅导", icon: Code },
  { id: "music", label: "音乐教学", icon: Music },
  { id: "beauty", label: "美容美发", icon: Scissors },
  { id: "fitness", label: "健身陪练", icon: Dumbbell },
]

export default function ServicesPage() {
  const [activeCategory, setActiveCategory] = useState("all")
  const [sortBy, setSortBy] = useState("recommend")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredServices = mockServices.filter((item) => {
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
                <h1 className="text-2xl font-bold">校园服务</h1>
                <p className="text-muted-foreground mt-1">
                  发现校园里的各种技能服务
                </p>
              </div>
              <Link href="/services/publish">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  发布服务
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索服务..."
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
              <SelectItem value="recommend">综合推荐</SelectItem>
              <SelectItem value="rating">评分最高</SelectItem>
              <SelectItem value="orders">成交最多</SelectItem>
              <SelectItem value="price_asc">价格从低到高</SelectItem>
              <SelectItem value="price_desc">价格从高到低</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="w-full justify-start h-auto p-1 bg-secondary/50 flex-wrap">
            {serviceCategories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
                {cat.icon && <cat.icon className="h-4 w-4" />}
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeCategory} className="mt-6">
            {filteredServices.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.map((item) => (
                  <ServiceCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Search className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">暂无相关服务</p>
                <p className="text-sm mt-1">试试其他分类或发布你的服务</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Load More */}
        {filteredServices.length > 0 && (
          <div className="flex justify-center pt-4">
            <Button variant="outline" size="lg">
              加载更多
            </Button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
