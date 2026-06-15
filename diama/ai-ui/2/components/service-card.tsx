"use client"

import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, MapPin, Clock } from "lucide-react"

export interface ServiceItem {
  id: string
  title: string
  description: string
  price: number
  unit: string
  images: string[]
  provider: {
    id: string
    name: string
    avatar?: string
    college?: string
    rating: number
    reviewCount: number
    isVerified?: boolean
  }
  category: string
  tags: string[]
  location?: string
  availability: string
  completedOrders: number
  status: "active" | "paused" | "closed"
}

interface ServiceCardProps {
  item: ServiceItem
  className?: string
}

export function ServiceCard({ item, className }: ServiceCardProps) {
  return (
    <Link href={`/services/${item.id}`}>
      <Card className={cn("group overflow-hidden hover:shadow-lg transition-all duration-300", className)}>
        {/* Image */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          <Image
            src={item.images[0] || "/placeholder.svg"}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Category Badge */}
          <Badge className="absolute top-2 left-2 bg-primary">
            {item.category}
          </Badge>

          {/* Status */}
          {item.status !== "active" && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="secondary" className="text-sm">
                {item.status === "paused" ? "暂停服务" : "已关闭"}
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
            {item.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {item.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {item.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Price & Stats */}
          <div className="flex items-baseline justify-between mt-3">
            <div>
              <span className="text-xl font-bold text-primary">¥{item.price}</span>
              <span className="text-xs text-muted-foreground">/{item.unit}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              已完成 {item.completedOrders} 单
            </span>
          </div>

          {/* Provider Info */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={item.provider.avatar} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {item.provider.name.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{item.provider.name}</span>
                <div className="flex items-center gap-1 text-xs">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span>{item.provider.rating}</span>
                  <span className="text-muted-foreground">({item.provider.reviewCount})</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {item.location && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {item.location}
                </span>
              )}
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {item.availability}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
