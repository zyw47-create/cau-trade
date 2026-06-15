"use client"

import { useState, use } from "react"
import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Heart,
  Share2,
  MessageCircle,
  MapPin,
  Eye,
  Clock,
  Shield,
  Star,
  ChevronLeft,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"

// Mock data for a single goods item
const mockGoodsDetail = {
  id: "1",
  title: "iPad Pro 11寸 2022款 M2芯片 256G 国行 带Apple Pencil和妙控键盘",
  description: `出售自用iPad Pro，2022年购入，使用一年半，成色非常好，屏幕无划痕。

配件：
- 原装充电器和数据线
- Apple Pencil 二代
- 妙控键盘
- 官方保护壳

使用情况：
- 主要用于上课记笔记和绘图
- 一直贴着钢化膜和壳
- 电池健康度 96%
- 无任何维修记录

可以当面验货，支持刷机验证。东区二号楼可面交。

非诚勿扰，不接受大刀。`,
  price: 4999,
  originalPrice: 6999,
  images: [
    "/placeholder.svg?height=600&width=600",
    "/placeholder.svg?height=600&width=600",
    "/placeholder.svg?height=600&width=600",
    "/placeholder.svg?height=600&width=600",
  ],
  seller: {
    id: "u1",
    name: "李同学",
    avatar: "/placeholder.svg?height=100&width=100",
    college: "信息与电气工程学院",
    creditScore: 98,
    isVerified: true,
    totalSales: 15,
    responseRate: 98,
    avgResponseTime: "5分钟内",
    joinedAt: "2022-09-01",
  },
  category: "数码电子",
  condition: "几乎全新",
  location: "东区",
  views: 328,
  likes: 45,
  comments: 12,
  isAiAudit: true,
  status: "on_sale",
  createdAt: "2024-01-15 14:30",
  tags: ["iPad", "平板", "Apple", "学习工具"],
}

const relatedGoods = [
  { id: "2", title: "Apple Pencil 二代 单独出", price: 599, image: "/placeholder.svg?height=200&width=200" },
  { id: "3", title: "iPad 保护壳 全新", price: 49, image: "/placeholder.svg?height=200&width=200" },
  { id: "4", title: "MacBook Air M2", price: 7499, image: "/placeholder.svg?height=200&width=200" },
]

export default function GoodsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(mockGoodsDetail.likes)
  const [selectedImage, setSelectedImage] = useState(0)

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)
  }

  const conditionColors: Record<string, string> = {
    "全新": "bg-primary/10 text-primary",
    "几乎全新": "bg-blue-500/10 text-blue-600",
    "轻微使用": "bg-amber-500/10 text-amber-600",
    "明显使用": "bg-gray-500/10 text-gray-600",
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-primary">首页</Link>
          <span>/</span>
          <Link href="/goods" className="hover:text-primary">闲置集市</Link>
          <span>/</span>
          <span className="text-foreground">{mockGoodsDetail.category}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
              <Image
                src={mockGoodsDetail.images[selectedImage]}
                alt={mockGoodsDetail.title}
                fill
                className="object-cover"
              />
              
              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <Badge className={conditionColors[mockGoodsDetail.condition]}>
                  {mockGoodsDetail.condition}
                </Badge>
                {mockGoodsDetail.isAiAudit && (
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI审核通过
                  </Badge>
                )}
              </div>
            </div>

            {/* Thumbnail Gallery */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {mockGoodsDetail.images.map((image, index) => (
                <button
                  key={index}
                  className={`relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === index ? "border-primary" : "border-transparent"
                  }`}
                  onClick={() => setSelectedImage(index)}
                >
                  <Image
                    src={image}
                    alt={`图片 ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Right: Details */}
          <div className="space-y-6">
            {/* Title & Price */}
            <div>
              <h1 className="text-2xl font-bold leading-tight">
                {mockGoodsDetail.title}
              </h1>
              <div className="flex items-baseline gap-3 mt-4">
                <span className="text-4xl font-bold text-primary">
                  ¥{mockGoodsDetail.price}
                </span>
                {mockGoodsDetail.originalPrice && (
                  <span className="text-lg text-muted-foreground line-through">
                    ¥{mockGoodsDetail.originalPrice}
                  </span>
                )}
                <Badge variant="destructive" className="ml-2">
                  省 ¥{mockGoodsDetail.originalPrice - mockGoodsDetail.price}
                </Badge>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {mockGoodsDetail.views} 次浏览
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                {likeCount} 人收藏
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {mockGoodsDetail.createdAt}
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {mockGoodsDetail.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">交易地点</p>
                    <p className="font-medium">{mockGoodsDetail.location}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">交易保障</p>
                    <p className="font-medium">平台担保</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Seller Info */}
            <div>
              <h3 className="font-semibold mb-4">卖家信息</h3>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={mockGoodsDetail.seller.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {mockGoodsDetail.seller.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{mockGoodsDetail.seller.name}</span>
                          {mockGoodsDetail.seller.isVerified && (
                            <Badge variant="secondary" className="text-[10px] gap-1">
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                              已实名
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {mockGoodsDetail.seller.college}
                        </p>
                      </div>
                    </div>
                    <Link href={`/user/${mockGoodsDetail.seller.id}`}>
                      <Button variant="outline" size="sm">
                        查看主页
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="font-semibold">{mockGoodsDetail.seller.creditScore}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">信用分</p>
                    </div>
                    <div className="text-center">
                      <span className="font-semibold">{mockGoodsDetail.seller.totalSales}</span>
                      <p className="text-xs text-muted-foreground mt-1">成功交易</p>
                    </div>
                    <div className="text-center">
                      <span className="font-semibold">{mockGoodsDetail.seller.responseRate}%</span>
                      <p className="text-xs text-muted-foreground mt-1">回复率</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-4">商品详情</h3>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm whitespace-pre-line leading-relaxed">
                    {mockGoodsDetail.description}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Safety Tips */}
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">安全提醒</p>
                    <p className="text-amber-700 mt-1">
                      建议使用平台担保交易，确认收货后再确认付款。当面交易时请选择校内公共场所，注意人身和财产安全。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Related Items */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold mb-6">相关推荐</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {relatedGoods.map((item) => (
              <Link key={item.id} href={`/goods/${item.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <div className="aspect-square relative bg-muted rounded-t-lg overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <CardContent className="p-3">
                    <h3 className="text-sm font-medium line-clamp-2">{item.title}</h3>
                    <p className="text-primary font-bold mt-1">¥{item.price}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 md:relative md:border-0 md:bg-transparent md:p-0 md:mt-6">
        <div className="container mx-auto flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={handleLike}
          >
            <Heart className={isLiked ? "fill-red-500 text-red-500" : ""} />
          </Button>
          <Button variant="outline" size="icon" className="shrink-0">
            <Share2 className="h-5 w-5" />
          </Button>
          <Button variant="outline" className="flex-1 gap-2">
            <MessageCircle className="h-5 w-5" />
            联系卖家
          </Button>
          <Button className="flex-1">
            立即购买
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
