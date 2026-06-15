"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Search,
  Send,
  Image as ImageIcon,
  MoreVertical,
  Phone,
  Video,
  ChevronLeft,
  Check,
  CheckCheck,
} from "lucide-react"

// Mock conversations
const mockConversations = [
  {
    id: "c1",
    user: {
      id: "u1",
      name: "李同学",
      avatar: "/placeholder.svg?height=100&width=100",
      isOnline: true,
    },
    lastMessage: "好的，那我们明天下午在东区门口见？",
    lastTime: "刚刚",
    unread: 2,
    goods: {
      id: "g1",
      title: "iPad Pro 11寸",
      price: 4999,
      image: "/placeholder.svg?height=100&width=100",
    },
  },
  {
    id: "c2",
    user: {
      id: "u2",
      name: "王学姐",
      avatar: "/placeholder.svg?height=100&width=100",
      isOnline: false,
    },
    lastMessage: "考研资料已经整理好了，你什么时候方便？",
    lastTime: "10分钟前",
    unread: 0,
    goods: {
      id: "g2",
      title: "考研数学全套教材",
      price: 120,
      image: "/placeholder.svg?height=100&width=100",
    },
  },
  {
    id: "c3",
    user: {
      id: "u3",
      name: "张同学",
      avatar: "/placeholder.svg?height=100&width=100",
      isOnline: true,
    },
    lastMessage: "这个价格可以再商量一下吗？",
    lastTime: "1小时前",
    unread: 1,
    goods: {
      id: "g3",
      title: "小米14 Pro",
      price: 4299,
      image: "/placeholder.svg?height=100&width=100",
    },
  },
  {
    id: "c4",
    user: {
      id: "u4",
      name: "陈同学",
      avatar: "/placeholder.svg?height=100&width=100",
      isOnline: false,
    },
    lastMessage: "谢谢，收到了！",
    lastTime: "昨天",
    unread: 0,
    goods: null,
  },
]

// Mock messages for active conversation
const mockMessages = [
  {
    id: "m1",
    senderId: "u1",
    content: "你好，请问这个iPad还在吗？",
    time: "14:30",
    status: "read",
  },
  {
    id: "m2",
    senderId: "me",
    content: "在的，有什么问题可以问",
    time: "14:32",
    status: "read",
  },
  {
    id: "m3",
    senderId: "u1",
    content: "电池健康度怎么样？有没有维修过？",
    time: "14:33",
    status: "read",
  },
  {
    id: "m4",
    senderId: "me",
    content: "电池健康度96%，没有任何维修记录，一直贴膜戴壳使用",
    time: "14:35",
    status: "read",
  },
  {
    id: "m5",
    senderId: "u1",
    content: "价格可以优惠一点吗？",
    time: "14:36",
    status: "read",
  },
  {
    id: "m6",
    senderId: "me",
    content: "同学你好，价格已经很实惠了，这个配置全网基本找不到更低的价格了",
    time: "14:38",
    status: "read",
  },
  {
    id: "m7",
    senderId: "u1",
    content: "好吧，那我们什么时候可以交易？",
    time: "14:40",
    status: "read",
  },
  {
    id: "m8",
    senderId: "me",
    content: "明天下午可以吗？我们在东区门口见面",
    time: "14:41",
    status: "read",
  },
  {
    id: "m9",
    senderId: "u1",
    content: "好的，那我们明天下午在东区门口见？",
    time: "14:42",
    status: "delivered",
  },
]

export default function MessagesPage() {
  const [activeConversation, setActiveConversation] = useState<string | null>("c1")
  const [messageInput, setMessageInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const activeChat = mockConversations.find((c) => c.id === activeConversation)

  const filteredConversations = mockConversations.filter((c) =>
    c.user.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSendMessage = () => {
    if (!messageInput.trim()) return
    // Handle sending message
    setMessageInput("")
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="container mx-auto h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
        <div className="flex h-full">
          {/* Conversation List */}
          <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col ${activeConversation ? "hidden md:flex" : "flex"}`}>
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索会话..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Conversations */}
            <ScrollArea className="flex-1">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  className={`w-full p-4 flex items-start gap-3 hover:bg-secondary/50 transition-colors text-left ${
                    activeConversation === conversation.id ? "bg-secondary" : ""
                  }`}
                  onClick={() => setActiveConversation(conversation.id)}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conversation.user.avatar} />
                      <AvatarFallback>{conversation.user.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    {conversation.user.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{conversation.user.name}</span>
                      <span className="text-xs text-muted-foreground">{conversation.lastTime}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                      {conversation.lastMessage}
                    </p>
                  </div>
                  {conversation.unread > 0 && (
                    <Badge className="h-5 w-5 flex items-center justify-center p-0 text-[10px] shrink-0">
                      {conversation.unread}
                    </Badge>
                  )}
                </button>
              ))}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          {activeConversation && activeChat ? (
            <div className={`flex-1 flex flex-col ${activeConversation ? "flex" : "hidden md:flex"}`}>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setActiveConversation(null)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={activeChat.user.avatar} />
                    <AvatarFallback>{activeChat.user.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold">{activeChat.user.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {activeChat.user.isOnline ? "在线" : "离线"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon">
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Goods Reference */}
              {activeChat.goods && (
                <Link href={`/goods/${activeChat.goods.id}`}>
                  <div className="p-3 border-b bg-secondary/30 flex items-center gap-3 hover:bg-secondary/50 transition-colors">
                    <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
                      <Image
                        src={activeChat.goods.image}
                        alt={activeChat.goods.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{activeChat.goods.title}</p>
                      <p className="text-primary font-semibold">¥{activeChat.goods.price}</p>
                    </div>
                    <Badge>查看商品</Badge>
                  </div>
                </Link>
              )}

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {mockMessages.map((message) => {
                    const isMe = message.senderId === "me"
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex items-end gap-2 max-w-[70%] ${isMe ? "flex-row-reverse" : ""}`}>
                          {!isMe && (
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarImage src={activeChat.user.avatar} />
                              <AvatarFallback>{activeChat.user.name.slice(0, 1)}</AvatarFallback>
                            </Avatar>
                          )}
                          <div>
                            <div
                              className={`rounded-2xl px-4 py-2 ${
                                isMe
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-secondary rounded-bl-md"
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                            </div>
                            <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : ""}`}>
                              <span className="text-[10px] text-muted-foreground">{message.time}</span>
                              {isMe && (
                                message.status === "read" ? (
                                  <CheckCheck className="h-3 w-3 text-primary" />
                                ) : (
                                  <Check className="h-3 w-3 text-muted-foreground" />
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <ImageIcon className="h-5 w-5" />
                  </Button>
                  <Input
                    placeholder="输入消息..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button size="icon" onClick={handleSendMessage} disabled={!messageInput.trim()}>
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4" />
                <p>选择一个会话开始聊天</p>
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}

function MessageSquare(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
