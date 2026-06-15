'use client'

import { Search, X } from 'lucide-react'

type SearchBarProps = {
  value: string
  placeholder?: string
  onChange: (value: string) => void
  onSearch?: () => void
  onCancel?: () => void
}

export function SearchBar({
  value,
  placeholder = '搜索商品...',
  onChange,
  onSearch,
  onCancel,
}: SearchBarProps) {
  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSearch?.()
          }}
          placeholder={placeholder}
          className="h-11 w-full rounded-full border border-pink-200/60 bg-white/85 pl-10 pr-10 text-sm outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-200"
        />
        {value ? (
          <button
            onClick={onCancel}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
            aria-label="清空搜索"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
