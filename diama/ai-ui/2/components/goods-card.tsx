"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Heart, MessageCircle, Eye, MapPin, Sparkles } from "lucide-react"

export interface GoodsItem {
  id: string
  title: string
  price: number
  originalPrice?: number
  images: string[]
  seller: {
    id: string
    name: string
    avatar?: string
    college?: string
    creditScore?: number
    isVerified?: boolean
  }
  category: string
  condition: "全新" | "几乎全新" | "轻微使用" | "明显使用"
  location?: string
  views: number
  likes: number
  comments: number
  isAiAudit?: boolean
  status: "on_sale" | "reserved" | "sold"
  createdAt: string
}

interface GoodsCardProps {
  item: GoodsItem
  className?: string
  variant?: "default" | "compact"
}

export function GoodsCard({ item, className, variant = "default" }: GoodsCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(item.likes)

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsLiked(!isLiked)
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)
  }

  const conditionColors: Record<string, string> = {
    "全新": "bg-primary/10 text-primary",
    "几乎全新": "bg-blue-500/10 text-blue-600",
    "轻微使用": "bg-amber-500/10 text-amber-600",
    "明显使用": "bg-gray-500/10 text-gray-600",
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    "on_sale": { label: "在售", color: "bg-primary" },
    "reserved": { label: "已预定", color: "bg-amber-500" },
    "sold": { label: "已售出", color: "bg-gray-500" },
  }

  if (variant === "compact") {
    return (
      <Link href={`/goods/${item.id}`}>
        <Card className={cn("group overflow-hidden hover:shadow-md transition-shadow", className)}>
          <div className="flex gap-3 p-3">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
              <Image
                src={item.images[0] || "/placeholder.svg"}
                alt={item.title}
                fill
                className="object-cover"
              />
              {item.status !== "on_sale" && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-xs font-medium text-white">
                    {statusLabels[item.status].label}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                {item.title}
              </h3>
              <p className="text-primary font-bold mt-1">
                ¥{item.price}
                {item.originalPrice && (
                  <span className="text-xs text-muted-foreground line-through ml-2">
                    ¥{item.originalPrice}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Eye className="h-3 w-3" />
                <span>{item.views}</span>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    )
  }

  return (
    <Link href={`/goods/${item.id}`}>
      <Card className={cn("group overflow-hidden hover:shadow-lg transition-all duration-300", className)}>
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <Image
            src={item.images[0] || "/placeholder.svg"}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Status Overlay */}
          {item.status !== "on_sale" && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge className={cn("text-sm", statusLabels[item.status].color)}>
                {statusLabels[item.status].label}
              </Badge>
            </div>
          )}

          {/* Top Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <Badge className={cn("text-[10px]", conditionColors[item.condition])}>
              {item.condition}
            </Badge>
            {item.isAiAudit && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Sparkles className="h-3 w-3" />
                AI审核
              </Badge>
            )}
          </div>

          {/* Like Button */}
          <button
            onClick={handleLike}
            className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors"
          >
            <Heart
              className={cn(
                "h-4 w-4 transition-colors",
                isLiked ? "fill-red-500 text-red-500" : "text-white"
              )}
            />
          </button>

          {/* Image Count */}
          {item.images.length > 1 && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/50 text-white text-xs">
              {item.images.length}图
            </div>
          )}
        </div>

        <CardContent className="p-3">
          {/* Title */}
          <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
            {item.title}
          </h3>

          {/* Price */}
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-lg font-bold text-primary">¥{item.price}</span>
            {item.originalPrice && (
              <span className="text-xs text-muted-foreground line-through">
                ¥{item.originalPrice}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {item.views}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {likeCount}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {item.comments}
            </span>
          </div>

          {/* Seller Info */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={item.seller.avatar} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {item.seller.name.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-xs font-medium">{item.seller.name}</span>
                {item.seller.isVerified && (
                  <span className="text-[10px] text-primary">已实名</span>
                )}
              </div>
            </div>
            {item.location && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {item.location}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
