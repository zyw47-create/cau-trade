"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Package, Banknote } from "lucide-react"

export interface ErrandItem {
  id: string
  type: "delivery" | "purchase" | "help"
  title: string
  description: string
  reward: number
  deadline: string
  from?: string
  to: string
  weight?: string
  publisher: {
    id: string
    name: string
    avatar?: string
    creditScore: number
  }
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled"
  createdAt: string
}

interface ErrandCardProps {
  item: ErrandItem
  className?: string
  isRider?: boolean
}

const typeLabels: Record<string, { label: string; color: string }> = {
  delivery: { label: "取送件", color: "bg-blue-500/10 text-blue-600" },
  purchase: { label: "代购买", color: "bg-amber-500/10 text-amber-600" },
  help: { label: "帮帮忙", color: "bg-purple-500/10 text-purple-600" },
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "待接单", color: "bg-primary" },
  accepted: { label: "已接单", color: "bg-blue-500" },
  in_progress: { label: "进行中", color: "bg-amber-500" },
  completed: { label: "已完成", color: "bg-gray-500" },
  cancelled: { label: "已取消", color: "bg-red-500" },
}

export function ErrandCard({ item, className, isRider = false }: ErrandCardProps) {
  return (
    <Card className={cn("group overflow-hidden hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge className={cn("text-[10px]", typeLabels[item.type].color)}>
                {typeLabels[item.type].label}
              </Badge>
              <Badge className={cn("text-[10px]", statusLabels[item.status].color)}>
                {statusLabels[item.status].label}
              </Badge>
            </div>
            <h3 className="font-semibold mt-2 line-clamp-1">{item.title}</h3>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-primary">
              <Banknote className="h-4 w-4" />
              <span className="text-xl font-bold">¥{item.reward}</span>
            </div>
            <span className="text-xs text-muted-foreground">跑腿费</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
          {item.description}
        </p>

        {/* Location Info */}
        <div className="mt-3 space-y-2">
          {item.from && (
            <div className="flex items-center gap-2 text-sm">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <span className="text-muted-foreground">取件:</span>
              <span className="font-medium">{item.from}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10">
              <MapPin className="h-3 w-3 text-destructive" />
            </div>
            <span className="text-muted-foreground">送达:</span>
            <span className="font-medium">{item.to}</span>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {item.deadline}
          </span>
          {item.weight && (
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {item.weight}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={item.publisher.avatar} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {item.publisher.name.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-xs font-medium">{item.publisher.name}</span>
              <span className="text-[10px] text-muted-foreground">
                信用分: {item.publisher.creditScore}
              </span>
            </div>
          </div>
          
          {isRider && item.status === "pending" && (
            <Button size="sm">
              接单
            </Button>
          )}
          
          {!isRider && (
            <Link href={`/errand/${item.id}`}>
              <Button variant="outline" size="sm">
                查看详情
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
