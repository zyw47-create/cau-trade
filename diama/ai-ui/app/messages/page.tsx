'use client'

import { Check, CheckCheck, Clock3, MoreHorizontal, Search, TriangleAlert } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { conversations } from '@/lib/mock-campus-data'

const statusIconMap = {
  sending: Clock3,
  sent: Check,
  delivered: CheckCheck,
  read: CheckCheck,
  failed: TriangleAlert,
}

export default function MessagesPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8fb_0%,#ffffff_16%,#fffafc_100%)] pb-32">
      <section className="sticky top-0 z-30 border-b border-pink-200/40 bg-white/88 px-4 py-4 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">消息中心</h1>
            <p className="text-xs text-muted-foreground">按文档保留站内消息、商品沟通、服务咨询和跑腿会话类型</p>
          </div>
          <button className="rounded-full bg-pink-50 p-2 text-pink-600">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="搜索聊天记录..."
            className="h-11 w-full rounded-full border border-pink-200/60 bg-white/85 pl-10 pr-4 text-sm outline-none focus:border-pink-400"
          />
        </div>
      </section>

      <section className="px-4 py-4">
        <div className="space-y-3">
          {conversations.map((conversation) => {
            const StatusIcon =
              conversation.messageStatus ? statusIconMap[conversation.messageStatus] : null

            return (
              <div
                key={conversation.id}
                className="flex items-center gap-3 rounded-[1.5rem] border border-pink-200/50 bg-white/90 px-4 py-4 shadow-sm"
              >
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-200 to-rose-100 text-lg font-semibold text-pink-700">
                  {conversation.avatar}
                  {conversation.online ? (
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-foreground">{conversation.name}</h2>
                      <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[10px] text-pink-700">
                        {conversation.sessionType}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{conversation.time}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {StatusIcon ? (
                      <StatusIcon
                        className={`h-4 w-4 ${
                          conversation.messageStatus === 'failed'
                            ? 'text-red-500'
                            : conversation.messageStatus === 'read'
                              ? 'text-pink-500'
                              : 'text-muted-foreground'
                        }`}
                      />
                    ) : null}
                    <p className="truncate text-sm text-muted-foreground">{conversation.lastMessage}</p>
                  </div>
                </div>
                {conversation.unread > 0 ? (
                  <div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-1.5 text-xs font-bold text-white">
                    {conversation.unread}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <BottomNav />
    </main>
  )
}
