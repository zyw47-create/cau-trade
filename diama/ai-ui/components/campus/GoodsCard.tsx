'use client'

import Link from 'next/link'
import { Heart, MapPin, ShieldCheck, Sparkles } from 'lucide-react'
import type { GoodsItem } from '@/lib/mock-campus-data'

type GoodsCardProps = {
  item: GoodsItem
  onToggleFav?: (id: string) => void
}

export function GoodsCard({ item, onToggleFav }: GoodsCardProps) {
  return (
    <Link
      href={`/goods/${item.id}`}
      className="group block overflow-hidden rounded-[1.5rem] border border-pink-200/50 bg-white/90 shadow-[0_18px_40px_rgba(233,30,99,0.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(233,30,99,0.14)]"
    >
      <div className="relative aspect-[4/4.5] overflow-hidden bg-gradient-to-br from-pink-100 via-white to-cyan-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(233,30,99,0.18),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(95,251,241,0.22),transparent_36%)]" />
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-pink-700 shadow-sm">
          {item.categoryName}
        </div>
        <button
          onClick={(event) => {
            event.preventDefault()
            onToggleFav?.(item.id)
          }}
          className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-pink-500 shadow-sm transition hover:scale-105"
          aria-label="收藏商品"
        >
          <Heart className={`h-4 w-4 ${item.isFav ? 'fill-current' : ''}`} />
        </button>
        {item.isAiAudit ? (
          <div className="absolute bottom-4 left-4 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-medium text-white">
            <Sparkles className="h-3.5 w-3.5" />
            AI 审核
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="rounded-[1.25rem] border border-white/60 bg-white/80 p-4 backdrop-blur">
            <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</h3>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.summary}</p>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-xl font-bold text-[#C2185B]">￥{item.price}</p>
                {item.originalPrice ? (
                  <p className="text-xs text-muted-foreground line-through">￥{item.originalPrice}</p>
                ) : null}
              </div>
              <div className="rounded-full bg-pink-50 px-3 py-1 text-xs font-medium text-pink-700">
                {item.conditionLabel}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-5 py-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-sky-600" />
          <span>{item.seller.name}</span>
          <span>{item.seller.creditScore} 分</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          <span>{item.location}</span>
        </div>
      </div>
    </Link>
  )
}
