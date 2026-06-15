'use client'

import type { GoodsItem } from '@/lib/mock-campus-data'
import { GoodsCard } from './GoodsCard'

type GoodsWaterfallProps = {
  goodsList: GoodsItem[]
  onToggleFav?: (id: string) => void
}

export function GoodsWaterfall({ goodsList, onToggleFav }: GoodsWaterfallProps) {
  const leftColumn: GoodsItem[] = []
  const rightColumn: GoodsItem[] = []

  goodsList.forEach((item, index) => {
    if (index % 2 === 0) {
      leftColumn.push(item)
      return
    }
    rightColumn.push(item)
  })

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-4">
        {leftColumn.map((item) => (
          <GoodsCard key={item.id} item={item} onToggleFav={onToggleFav} />
        ))}
      </div>
      <div className="space-y-4 pt-8">
        {rightColumn.map((item) => (
          <GoodsCard key={item.id} item={item} onToggleFav={onToggleFav} />
        ))}
      </div>
    </div>
  )
}
