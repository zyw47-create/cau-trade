import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Heart, MapPin, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { goodsList } from '@/lib/mock-campus-data'

export default async function GoodsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const item = goodsList.find((goods) => goods.id === id)

  if (!item) notFound()

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8fb_0%,#ffffff_26%,#fffafc_100%)] pb-12">
      <section className="relative overflow-hidden px-4 pb-8 pt-5">
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,rgba(233,30,99,0.25),transparent_40%),radial-gradient(circle_at_top_right,rgba(95,251,241,0.18),transparent_35%)]" />
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-4 flex items-center justify-between">
            <Link href="/goods" className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-sm shadow-sm">
              <ArrowLeft className="h-4 w-4" />
              返回列表
            </Link>
            <button className="rounded-full bg-white/85 p-3 text-pink-600 shadow-sm">
              <Heart className={`h-4 w-4 ${item.isFav ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="rounded-[2rem] border border-pink-200/50 bg-white/90 p-5 shadow-[0_24px_60px_rgba(233,30,99,0.12)] backdrop-blur">
            <div className="aspect-[16/10] rounded-[1.5rem] bg-gradient-to-br from-pink-100 via-white to-cyan-50" />
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700">{item.categoryName}</span>
              <span className="rounded-full bg-white px-3 py-1 text-xs text-muted-foreground">{item.conditionLabel}</span>
              {item.isAiAudit ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI 审核通过
                </span>
              ) : null}
            </div>
            <h1 className="mt-4 text-2xl font-bold text-foreground">{item.title}</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.summary}</p>
            <div className="mt-5 flex items-end gap-3">
              <span className="text-3xl font-bold text-[#C2185B]">￥{item.price}</span>
              {item.originalPrice ? <span className="text-sm text-muted-foreground line-through">￥{item.originalPrice}</span> : null}
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.25rem] bg-pink-50 p-4">
                <p className="text-xs text-muted-foreground">卖家信息</p>
                <p className="mt-1 font-semibold">{item.seller.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.seller.college}</p>
              </div>
              <div className="rounded-[1.25rem] bg-pink-50 p-4">
                <p className="text-xs text-muted-foreground">信用分</p>
                <p className="mt-1 inline-flex items-center gap-2 font-semibold">
                  <ShieldCheck className="h-4 w-4 text-sky-600" />
                  {item.seller.creditScore} 分
                </p>
              </div>
              <div className="rounded-[1.25rem] bg-pink-50 p-4">
                <p className="text-xs text-muted-foreground">交易地点</p>
                <p className="mt-1 inline-flex items-center gap-2 font-semibold">
                  <MapPin className="h-4 w-4 text-pink-500" />
                  {item.location}
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Link href="/messages" className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-pink-200 bg-white px-4 py-3 font-medium text-pink-700">
                <MessageCircle className="h-4 w-4" />
                联系卖家
              </Link>
              <button className="flex-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-3 font-semibold text-white shadow-lg shadow-pink-200">
                立即下单
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
