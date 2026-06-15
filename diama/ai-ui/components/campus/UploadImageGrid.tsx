'use client'

import { Camera, ImagePlus, LoaderCircle, RefreshCcw, X } from 'lucide-react'

export type UploadImage = {
  id: string
  label: string
  status: 'done' | 'uploading' | 'error'
}

type UploadImageGridProps = {
  images: UploadImage[]
  onAdd: () => void
  onRetry: (id: string) => void
  onRemove: (id: string) => void
}

export function UploadImageGrid({
  images,
  onAdd,
  onRetry,
  onRemove,
}: UploadImageGridProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      <button
        onClick={onAdd}
        className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-[1.25rem] border-2 border-dashed border-pink-300 bg-white/80 text-pink-600 transition hover:bg-pink-50"
      >
        <Camera className="h-6 w-6" />
        <span className="mt-1 text-xs">拍照/相册</span>
      </button>
      {images.map((image) => (
        <div
          key={image.id}
          className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] border border-pink-200 bg-gradient-to-br from-pink-100 to-cyan-50 text-center"
        >
          <ImagePlus className="h-8 w-8 text-pink-400" />
          <span className="absolute inset-x-2 bottom-2 text-[10px] text-pink-700">{image.label}</span>
          <button
            onClick={() => onRemove(image.id)}
            className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-pink-600"
            aria-label="删除图片"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          {image.status === 'uploading' ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <LoaderCircle className="h-5 w-5 animate-spin text-pink-600" />
            </div>
          ) : null}
          {image.status === 'error' ? (
            <button
              onClick={() => onRetry(image.id)}
              className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/70 text-white"
            >
              <RefreshCcw className="h-4 w-4" />
              <span className="mt-1 text-[10px]">重试</span>
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}
