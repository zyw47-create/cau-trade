'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { UploadImageGrid, type UploadImage } from '@/components/campus/UploadImageGrid'
import { categories } from '@/lib/mock-campus-data'

const DRAFT_KEY = 'campus_draft'

export default function PublishPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [condition, setCondition] = useState('like_new')
  const [images, setImages] = useState<UploadImage[]>([
    { id: 'img-1', label: '宿舍实拍', status: 'done' },
    { id: 'img-2', label: '细节图', status: 'error' },
  ])
  const [showGuide, setShowGuide] = useState(true)

  useEffect(() => {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    try {
      const draft = JSON.parse(raw) as {
        title: string
        description: string
        price: string
        categoryId: string
        condition: string
      }
      setTitle(draft.title ?? '')
      setDescription(draft.description ?? '')
      setPrice(draft.price ?? '')
      setCategoryId(draft.categoryId ?? '')
      setCondition(draft.condition ?? 'like_new')
    } catch {
      window.localStorage.removeItem(DRAFT_KEY)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ title, description, price, categoryId, condition }),
    )
  }, [title, description, price, categoryId, condition])

  const handleAiFill = () => {
    setTitle('Apple MacBook Air M2 16G 512G 深空灰')
    setDescription('九成新，日常只在图书馆使用，电池健康优秀，包装盒和原装充电器都在。可现场验机，支持校内当面交易。')
    setPrice('6888')
    setCategoryId('digital')
    setCondition('like_new')
  }

  const handleSubmit = () => {
    window.localStorage.removeItem(DRAFT_KEY)
    setShowGuide(true)
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8fb_0%,#ffffff_20%,#fffafc_100%)] pb-32">
      <section className="sticky top-0 z-30 border-b border-pink-200/40 bg-white/88 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">发布商品</h1>
            <p className="text-xs text-muted-foreground">按文档保留图片、AI 填写、草稿恢复、校验提示和发布须知</p>
          </div>
          <button
            onClick={handleSubmit}
            className="rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white"
          >
            发布
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-3xl space-y-5 px-4 py-5">
        {showGuide ? (
          <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            发布页按文档要求默认进行登录与实名认证检查。当前原型页以引导卡模拟这个流程，
            <Link href="/profile" className="ml-1 font-semibold underline">
              可在“我的”页查看实名与信用信息
            </Link>
            。
          </div>
        ) : null}

        <div className="rounded-[1.75rem] border border-pink-200/50 bg-white/88 p-5 shadow-sm">
          <label className="mb-3 block text-sm font-semibold text-foreground">商品图片</label>
          <UploadImageGrid
            images={images}
            onAdd={() =>
              setImages((current) => [
                ...current,
                { id: `img-${current.length + 1}`, label: `新图 ${current.length + 1}`, status: 'uploading' },
              ])
            }
            onRetry={(id) =>
              setImages((current) =>
                current.map((item) => (item.id === id ? { ...item, status: 'done' } : item)),
              )
            }
            onRemove={(id) => setImages((current) => current.filter((item) => item.id !== id))}
          />
        </div>

        <button
          onClick={handleAiFill}
          className="flex w-full items-center justify-center gap-2 rounded-[1.5rem] border border-pink-200 bg-gradient-to-r from-pink-50 to-rose-50 px-4 py-3 text-sm font-medium text-pink-700"
        >
          <Sparkles className="h-4 w-4" />
          AI 智能填写
        </button>

        <div className="space-y-4 rounded-[1.75rem] border border-pink-200/50 bg-white/88 p-5 shadow-sm">
          <div>
            <label className="mb-2 block text-sm font-semibold">商品标题</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value.slice(0, 30))}
              placeholder="请输入商品标题（最多 30 字）"
              className="h-12 w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 outline-none focus:border-pink-400"
            />
            <p className="mt-2 text-right text-xs text-muted-foreground">{title.length}/30</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">商品描述</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value.slice(0, 500))}
              placeholder="详细描述商品成色、配件、购买时间和交易方式..."
              rows={5}
              className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 outline-none focus:border-pink-400"
            />
            <p className="mt-2 text-right text-xs text-muted-foreground">{description.length}/500</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold">商品分类</label>
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="h-12 w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 outline-none focus:border-pink-400"
              >
                <option value="">请选择分类</option>
                {categories.filter((item) => item.id !== 'all').map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">商品成色</label>
              <select
                value={condition}
                onChange={(event) => setCondition(event.target.value)}
                className="h-12 w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 outline-none focus:border-pink-400"
              >
                <option value="new">全新</option>
                <option value="like_new">几乎全新</option>
                <option value="normal">正常使用</option>
                <option value="old">明显使用</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">商品价格</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-pink-700">￥</span>
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value.replace(/[^\d.]/g, '').slice(0, 8))}
                placeholder="0.00"
                className="h-12 w-full rounded-2xl border border-pink-200 bg-pink-50/40 pl-10 pr-4 text-lg font-semibold outline-none focus:border-pink-400"
              />
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-pink-200/50 bg-white/88 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">发布须知</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            <li>请至少上传 1 张真实商品图片，最多 9 张。</li>
            <li>价格需为 0-99999.99 范围内的有效金额，最多两位小数。</li>
            <li>AI 功能不可用时不影响手动发布，草稿会自动保存在本地。</li>
          </ul>
        </div>
      </section>

      <BottomNav />
    </main>
  )
}
