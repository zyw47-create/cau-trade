"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageCircle,
  ChevronRight,
  X,
} from "lucide-react"

// Mock orders data
const mockOrders = [
  {
    id: "o1",
    orderSn: "ORD20240115001",
    type: "buy",
    goods: {
      id: "g1",
      title: "iPad Pro 11寸 2022款 M2芯片 256G",
      price: 4999,
      image: "/placeholder.svg?height=200&width=200",
    },
    seller: {
      id: "u1",
      name: "李同学",
      avatar: "/placeholder.svg?height=100&width=100",
    },
    status: "paid",
    statusText: "待发货",
    createdAt: "2024-01-15 14:30",
    timeline: [
      { status: "created", text: "订单创建", time: "2024-01-15 14:30" },
      { status: "paid", text: "支付成功", time: "2024-01-15 14:32" },
    ],
  },
  {
    id: "o2",
    orderSn: "ORD20240114002",
    type: "buy",
    goods: {
      id: "g2",
      title: "考研数学全套教材 张宇、汤家凤等",
      price: 120,
      image: "/placeholder.svg?height=200&width=200",
    },
    seller: {
      id: "u2",
      name: "王学姐",
      avatar: "/placeholder.svg?height=100&width=100",
    },
    status: "shipped",
    statusText: "待收货",
    createdAt: "2024-01-14 10:00",
    timeline: [
      { status: "created", text: "订单创建", time: "2024-01-14 10:00" },
      { status: "paid", text: "支付成功", time: "2024-01-14 10:02" },
      { status: "shipped", text: "卖家已发货", time: "2024-01-14 16:30" },
    ],
  },
  {
    id: "o3",
    orderSn: "ORD20240110003",
    type: "buy",
    goods: {
      id: "g3",
      title: "Nike Air Force 1 白色 42码",
      price: 459,
      image: "/placeholder.svg?height=200&width=200",
    },
    seller: {
      id: "u3",
      name: "张同学",
      avatar: "/placeholder.svg?height=100&width=100",
    },
    status: "completed",
    statusText: "已完成",
    createdAt: "2024-01-10 09:00",
    timeline: [
      { status: "created", text: "订单创建", time: "2024-01-10 09:00" },
      { status: "paid", text: "支付成功", time: "2024-01-10 09:05" },
      { status: "shipped", text: "卖家已发货", time: "2024-01-10 14:00" },
      { status: "completed", text: "交易完成", time: "2024-01-11 16:00" },
    ],
  },
  {
    id: "o4",
    orderSn: "ORD20240108004",
    type: "sell",
    goods: {
      id: "g4",
      title: "MacBook Air M2 256G 午夜色",
      price: 7499,
      image: "/placeholder.svg?height=200&width=200",
    },
    buyer: {
      id: "u4",
      name: "赵同学",
      avatar: "/placeholder.svg?height=100&width=100",
    },
    status: "paid",
    statusText: "待发货",
    createdAt: "2024-01-08 11:00",
    timeline: [
      { status: "created", text: "订单创建", time: "2024-01-08 11:00" },
      { status: "paid", text: "买家已付款", time: "2024-01-08 11:05" },
    ],
  },
]

const statusConfig: Record<string, { color: string; icon: typeof Package }> = {
  unpaid: { color: "bg-amber-500", icon: Clock },
  paid: { color: "bg-blue-500", icon: Package },
  shipped: { color: "bg-purple-500", icon: Truck },
  completed: { color: "bg-green-500", icon: CheckCircle2 },
  cancelled: { color: "bg-gray-500", icon: X },
  refunding: { color: "bg-red-500", icon: AlertCircle },
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [refundReason, setRefundReason] = useState("")

  const filteredOrders = mockOrders.filter((order) => {
    if (activeTab === "all") return true
    if (activeTab === "buy") return order.type === "buy"
    if (activeTab === "sell") return order.type === "sell"
    if (activeTab === "pending") return order.status === "paid" || order.status === "shipped"
    return true
  })

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold">我的订单</h1>

        {/* Order Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="text-center p-4">
            <Clock className="h-6 w-6 mx-auto text-amber-500" />
            <p className="text-2xl font-bold mt-2">2</p>
            <p className="text-xs text-muted-foreground">待付款</p>
          </Card>
          <Card className="text-center p-4">
            <Package className="h-6 w-6 mx-auto text-blue-500" />
            <p className="text-2xl font-bold mt-2">3</p>
            <p className="text-xs text-muted-foreground">待发货</p>
          </Card>
          <Card className="text-center p-4">
            <Truck className="h-6 w-6 mx-auto text-purple-500" />
            <p className="text-2xl font-bold mt-2">1</p>
            <p className="text-xs text-muted-foreground">待收货</p>
          </Card>
          <Card className="text-center p-4">
            <AlertCircle className="h-6 w-6 mx-auto text-red-500" />
            <p className="text-2xl font-bold mt-2">0</p>
            <p className="text-xs text-muted-foreground">售后中</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">全部</TabsTrigger>
            <TabsTrigger value="buy" className="flex-1">我买的</TabsTrigger>
            <TabsTrigger value="sell" className="flex-1">我卖的</TabsTrigger>
            <TabsTrigger value="pending" className="flex-1">进行中</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6 space-y-4">
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => {
                const status = statusConfig[order.status]
                const StatusIcon = status.icon
                const otherParty = order.type === "buy" ? order.seller : order.buyer

                return (
                  <Card key={order.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>订单号: {order.orderSn}</span>
                          <Separator orientation="vertical" className="h-4" />
                          <span>{order.createdAt}</span>
                        </div>
                        <Badge className={status.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {order.statusText}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Link href={`/orders/${order.id}`}>
                        <div className="flex gap-4 py-3 hover:bg-secondary/50 rounded-lg transition-colors px-2 -mx-2">
                          <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-muted shrink-0">
                            <Image
                              src={order.goods.image}
                              alt={order.goods.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium line-clamp-2">{order.goods.title}</h3>
                            <p className="text-primary font-bold mt-2">¥{order.goods.price}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 self-center" />
                        </div>
                      </Link>

                      <Separator className="my-3" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">
                            {order.type === "buy" ? "卖家:" : "买家:"}
                          </span>
                          <span className="font-medium">{otherParty?.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="gap-1">
                            <MessageCircle className="h-4 w-4" />
                            联系{order.type === "buy" ? "卖家" : "买家"}
                          </Button>
                          
                          {order.status === "shipped" && order.type === "buy" && (
                            <Button size="sm">确认收货</Button>
                          )}
                          
                          {order.status === "paid" && order.type === "sell" && (
                            <Button size="sm">确认发货</Button>
                          )}

                          {(order.status === "paid" || order.status === "shipped") && order.type === "buy" && (
                            <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
                              <DialogTrigger asChild>
                                <Button variant="destructive" size="sm">申请退款</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>申请退款</DialogTitle>
                                  <DialogDescription>
                                    请描述您申请退款的原因，平台将根据双方情况进行协调处理
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                  <Textarea
                                    placeholder="请输入退款原因..."
                                    value={refundReason}
                                    onChange={(e) => setRefundReason(e.target.value)}
                                    rows={4}
                                  />
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
                                    取消
                                  </Button>
                                  <Button variant="destructive">提交申请</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}

                          {order.status === "completed" && (
                            <Button variant="outline" size="sm">评价</Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Package className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium">暂无订单</p>
                <p className="text-sm mt-1">去逛逛集市，看看有没有喜欢的商品</p>
                <Link href="/goods">
                  <Button className="mt-4">去逛逛</Button>
                </Link>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  )
}
