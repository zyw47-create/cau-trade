"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { GoodsCard, type GoodsItem } from "@/components/goods-card"
import { CategoryList } from "@/components/category-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Search, SlidersHorizontal, Grid3X3, LayoutList } from "lucide-react"

// Mock data
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
  {
    id: "7",
    title: "MacBook Air M2 256G 午夜色 带Apple Care+",
    price: 7499,
    originalPrice: 9499,
    images: ["/placeholder.svg?height=400&width=400"],
    seller: {
      id: "u7",
      name: "赵同学",
      college: "信息学院",
      creditScore: 99,
      isVerified: true,
    },
    category: "computers",
    condition: "几乎全新",
    location: "东区",
    views: 456,
    likes: 78,
    comments: 19,
    isAiAudit: true,
    status: "on_sale",
    createdAt: "2024-01-09",
  },
  {
    id: "8",
    title: "Nike Air Force 1 白色 42码 只穿过一次",
    price: 459,
    originalPrice: 799,
    images: ["/placeholder.svg?height=400&width=400"],
    seller: {
      id: "u8",
      name: "孙同学",
      college: "体育学院",
      creditScore: 91,
      isVerified: true,
    },
    category: "clothing",
    condition: "几乎全新",
    location: "西区",
    views: 198,
    likes: 35,
    comments: 7,
    status: "on_sale",
    createdAt: "2024-01-08",
  },
]

const conditions = ["全新", "几乎全新", "轻微使用", "明显使用"]
const locations = ["东区", "西区", "北区", "学院路"]

export default function GoodsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [sortBy, setSortBy] = useState<string>("default")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000])
  const [selectedConditions, setSelectedConditions] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [onlyVerified, setOnlyVerified] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredGoods = mockGoods.filter((item) => {
    if (selectedCategory && item.category !== selectedCategory) return false
    if (item.price < priceRange[0] || item.price > priceRange[1]) return false
    if (selectedConditions.length > 0 && !selectedConditions.includes(item.condition)) return false
    if (selectedLocations.length > 0 && item.location && !selectedLocations.includes(item.location)) return false
    if (onlyVerified && !item.seller.isVerified) return false
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const sortedGoods = [...filteredGoods].sort((a, b) => {
    switch (sortBy) {
      case "price_asc":
        return a.price - b.price
      case "price_desc":
        return b.price - a.price
      case "views":
        return b.views - a.views
      case "new":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      default:
        return 0
    }
  })

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索商品..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="排序方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">默认排序</SelectItem>
                <SelectItem value="new">最新发布</SelectItem>
                <SelectItem value="price_asc">价格从低到高</SelectItem>
                <SelectItem value="price_desc">价格从高到低</SelectItem>
                <SelectItem value="views">浏览量最多</SelectItem>
              </SelectContent>
            </Select>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>筛选条件</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  {/* Price Range */}
                  <div>
                    <Label className="text-sm font-medium">价格区间</Label>
                    <div className="mt-3 px-2">
                      <Slider
                        value={priceRange}
                        onValueChange={(value) => setPriceRange(value as [number, number])}
                        max={10000}
                        step={100}
                        className="w-full"
                      />
                      <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                        <span>¥{priceRange[0]}</span>
                        <span>¥{priceRange[1]}</span>
                      </div>
                    </div>
                  </div>

                  {/* Condition */}
                  <div>
                    <Label className="text-sm font-medium">商品成色</Label>
                    <div className="mt-3 space-y-2">
                      {conditions.map((condition) => (
                        <div key={condition} className="flex items-center space-x-2">
                          <Checkbox
                            id={condition}
                            checked={selectedConditions.includes(condition)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedConditions([...selectedConditions, condition])
                              } else {
                                setSelectedConditions(selectedConditions.filter((c) => c !== condition))
                              }
                            }}
                          />
                          <Label htmlFor={condition} className="text-sm font-normal">
                            {condition}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <Label className="text-sm font-medium">交易地点</Label>
                    <div className="mt-3 space-y-2">
                      {locations.map((location) => (
                        <div key={location} className="flex items-center space-x-2">
                          <Checkbox
                            id={location}
                            checked={selectedLocations.includes(location)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedLocations([...selectedLocations, location])
                              } else {
                                setSelectedLocations(selectedLocations.filter((l) => l !== location))
                              }
                            }}
                          />
                          <Label htmlFor={location} className="text-sm font-normal">
                            {location}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Only Verified */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="verified"
                      checked={onlyVerified}
                      onCheckedChange={(checked) => setOnlyVerified(checked as boolean)}
                    />
                    <Label htmlFor="verified" className="text-sm font-normal">
                      只看实名认证卖家
                    </Label>
                  </div>

                  {/* Reset */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setPriceRange([0, 10000])
                      setSelectedConditions([])
                      setSelectedLocations([])
                      setOnlyVerified(false)
                    }}
                  >
                    重置筛选
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <div className="hidden md:flex border rounded-lg">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <CategoryList
          selectedId={selectedCategory}
          onSelect={setSelectedCategory}
        />

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            共找到 <span className="font-medium text-foreground">{sortedGoods.length}</span> 件商品
          </p>
        </div>

        {/* Goods Grid */}
        {sortedGoods.length > 0 ? (
          <div className={
            viewMode === "grid"
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
              : "flex flex-col gap-4"
          }>
            {sortedGoods.map((item) => (
              <GoodsCard
                key={item.id}
                item={item}
                variant={viewMode === "list" ? "compact" : "default"}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Search className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">没有找到相关商品</p>
            <p className="text-sm mt-1">试试调整筛选条件或搜索其他关键词</p>
          </div>
        )}

        {/* Load More */}
        {sortedGoods.length > 0 && (
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
