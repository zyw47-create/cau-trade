"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Smartphone,
  BookOpen,
  Shirt,
  Dumbbell,
  Sofa,
  Bike,
  Gift,
  Music,
  Camera,
  Gamepad2,
  Watch,
  Laptop,
  type LucideIcon,
} from "lucide-react"

export interface Category {
  id: string
  name: string
  icon: LucideIcon
  color: string
  count?: number
}

export const categories: Category[] = [
  { id: "electronics", name: "数码电子", icon: Smartphone, color: "bg-blue-500/10 text-blue-600" },
  { id: "books", name: "图书教材", icon: BookOpen, color: "bg-amber-500/10 text-amber-600" },
  { id: "clothing", name: "服饰鞋包", icon: Shirt, color: "bg-pink-500/10 text-pink-600" },
  { id: "sports", name: "运动健身", icon: Dumbbell, color: "bg-green-500/10 text-green-600" },
  { id: "furniture", name: "家居日用", icon: Sofa, color: "bg-orange-500/10 text-orange-600" },
  { id: "transport", name: "代步工具", icon: Bike, color: "bg-cyan-500/10 text-cyan-600" },
  { id: "gifts", name: "美妆护肤", icon: Gift, color: "bg-rose-500/10 text-rose-600" },
  { id: "music", name: "乐器音响", icon: Music, color: "bg-purple-500/10 text-purple-600" },
  { id: "camera", name: "摄影器材", icon: Camera, color: "bg-indigo-500/10 text-indigo-600" },
  { id: "games", name: "游戏娱乐", icon: Gamepad2, color: "bg-red-500/10 text-red-600" },
  { id: "watches", name: "钟表配饰", icon: Watch, color: "bg-slate-500/10 text-slate-600" },
  { id: "computers", name: "电脑配件", icon: Laptop, color: "bg-teal-500/10 text-teal-600" },
]

interface CategoryListProps {
  className?: string
  selectedId?: string
  onSelect?: (id: string) => void
  variant?: "scroll" | "grid"
}

export function CategoryList({ 
  className, 
  selectedId, 
  onSelect,
  variant = "scroll" 
}: CategoryListProps) {
  if (variant === "grid") {
    return (
      <div className={cn("grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-4", className)}>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant="ghost"
            className={cn(
              "flex flex-col h-auto py-3 px-2 gap-2 hover:bg-secondary",
              selectedId === category.id && "bg-secondary ring-2 ring-primary"
            )}
            onClick={() => onSelect?.(category.id)}
          >
            <div className={cn("p-2 rounded-xl", category.color)}>
              <category.icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium">{category.name}</span>
          </Button>
        ))}
      </div>
    )
  }

  return (
    <ScrollArea className={cn("w-full whitespace-nowrap", className)}>
      <div className="flex gap-3 pb-3">
        <Button
          variant={!selectedId ? "default" : "outline"}
          size="sm"
          className="shrink-0"
          onClick={() => onSelect?.("")}
        >
          全部
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedId === category.id ? "default" : "outline"}
            size="sm"
            className={cn(
              "shrink-0 gap-2",
              selectedId === category.id ? "" : "hover:bg-secondary"
            )}
            onClick={() => onSelect?.(category.id)}
          >
            <category.icon className="h-4 w-4" />
            {category.name}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}

interface CategoryGridProps {
  className?: string
  onSelect?: (id: string) => void
}

export function CategoryGrid({ className, onSelect }: CategoryGridProps) {
  return (
    <div className={cn("grid grid-cols-4 sm:grid-cols-6 gap-4", className)}>
      {categories.slice(0, 8).map((category) => (
        <button
          key={category.id}
          className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-secondary transition-colors"
          onClick={() => onSelect?.(category.id)}
        >
          <div className={cn("p-3 rounded-2xl", category.color)}>
            <category.icon className="h-6 w-6" />
          </div>
          <span className="text-xs font-medium text-center">{category.name}</span>
        </button>
      ))}
    </div>
  )
}
