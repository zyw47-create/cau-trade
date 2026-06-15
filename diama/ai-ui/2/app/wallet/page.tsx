"use client"

import { useState } from "react"
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
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Wallet,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  CreditCard,
  Shield,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  Eye,
  EyeOff,
} from "lucide-react"

// Mock data
const mockWalletData = {
  balance: 1285.50,
  frozenAmount: 100.00,
  totalIncome: 3580.00,
  totalExpense: 2294.50,
}

const mockTransactions = [
  {
    id: "t1",
    type: "income",
    title: "iPad Pro 11寸 交易收入",
    amount: 4999,
    time: "2024-01-15 16:30",
    status: "completed",
    orderSn: "ORD20240115001",
  },
  {
    id: "t2",
    type: "pay",
    title: "购买 考研数学全套教材",
    amount: -120,
    time: "2024-01-14 14:20",
    status: "completed",
    orderSn: "ORD20240114002",
  },
  {
    id: "t3",
    type: "recharge",
    title: "账户充值",
    amount: 500,
    time: "2024-01-13 10:00",
    status: "completed",
  },
  {
    id: "t4",
    type: "refund",
    title: "订单退款 - 商品已下架",
    amount: 299,
    time: "2024-01-12 09:30",
    status: "completed",
    orderSn: "ORD20240111003",
  },
  {
    id: "t5",
    type: "withdraw",
    title: "提现到微信",
    amount: -200,
    time: "2024-01-10 18:00",
    status: "completed",
  },
  {
    id: "t6",
    type: "frozen",
    title: "交易冻结 - 等待确认收货",
    amount: -100,
    time: "2024-01-15 10:00",
    status: "frozen",
    orderSn: "ORD20240115002",
  },
]

const transactionTypeLabels: Record<string, { label: string; icon: typeof ArrowUpRight; color: string }> = {
  income: { label: "收入", icon: ArrowDownLeft, color: "text-green-600" },
  pay: { label: "支出", icon: ArrowUpRight, color: "text-red-600" },
  recharge: { label: "充值", icon: Plus, color: "text-blue-600" },
  refund: { label: "退款", icon: ArrowDownLeft, color: "text-amber-600" },
  withdraw: { label: "提现", icon: Minus, color: "text-gray-600" },
  frozen: { label: "冻结", icon: Shield, color: "text-orange-600" },
}

export default function WalletPage() {
  const [showBalance, setShowBalance] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const [rechargeAmount, setRechargeAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")

  const filteredTransactions = mockTransactions.filter((t) => {
    if (activeTab === "all") return true
    if (activeTab === "income") return t.type === "income" || t.type === "refund"
    if (activeTab === "expense") return t.type === "pay" || t.type === "withdraw"
    return true
  })

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Balance Card */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Wallet className="h-6 w-6" />
                <span className="font-semibold">我的钱包</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-white/20"
                onClick={() => setShowBalance(!showBalance)}
              >
                {showBalance ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </Button>
            </div>

            <div className="mb-6">
              <p className="text-sm opacity-80">可用余额</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-bold">
                  {showBalance ? `¥${mockWalletData.balance.toFixed(2)}` : "****"}
                </span>
              </div>
              {mockWalletData.frozenAmount > 0 && (
                <p className="text-sm opacity-80 mt-2 flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  冻结中: ¥{showBalance ? mockWalletData.frozenAmount.toFixed(2) : "****"}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="flex-1 gap-2">
                    <Plus className="h-4 w-4" />
                    充值
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>账户充值</DialogTitle>
                    <DialogDescription>
                      选择充值金额或输入自定义金额
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[50, 100, 200, 500, 1000, 2000].map((amount) => (
                        <Button
                          key={amount}
                          variant={rechargeAmount === String(amount) ? "default" : "outline"}
                          onClick={() => setRechargeAmount(String(amount))}
                        >
                          ¥{amount}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Label>自定义金额</Label>
                      <Input
                        type="number"
                        placeholder="请输入充值金额"
                        value={rechargeAmount}
                        onChange={(e) => setRechargeAmount(e.target.value)}
                      />
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                      <div className="flex gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>提示：充值为虚拟余额，仅用于平台内交易，不支持提现到银行卡。</p>
                      </div>
                    </div>
                    <Button className="w-full" disabled={!rechargeAmount}>
                      确认充值 ¥{rechargeAmount || 0}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="flex-1 gap-2">
                    <Minus className="h-4 w-4" />
                    提现
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>余额提现</DialogTitle>
                    <DialogDescription>
                      提现到你的微信账户
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="p-4 rounded-lg bg-secondary">
                      <p className="text-sm text-muted-foreground">可提现金额</p>
                      <p className="text-2xl font-bold text-primary">¥{mockWalletData.balance.toFixed(2)}</p>
                    </div>
                    <div className="space-y-2">
                      <Label>提现金额</Label>
                      <Input
                        type="number"
                        placeholder="请输入提现金额"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                      />
                      <div className="flex justify-end">
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0"
                          onClick={() => setWithdrawAmount(String(mockWalletData.balance))}
                        >
                          全部提现
                        </Button>
                      </div>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-sm">
                      <p className="font-medium mb-2">提现说明</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• 提现将在 1-3 个工作日内到账</li>
                        <li>• 单笔最低提现 10 元</li>
                        <li>• 提现免手续费</li>
                      </ul>
                    </div>
                    <Button className="w-full" disabled={!withdrawAmount || Number(withdrawAmount) > mockWalletData.balance}>
                      确认提现
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">累计收入</p>
                  <p className="text-xl font-bold text-green-600">
                    +¥{showBalance ? mockWalletData.totalIncome.toFixed(2) : "****"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <ArrowUpRight className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">累计支出</p>
                  <p className="text-xl font-bold text-red-600">
                    -¥{showBalance ? mockWalletData.totalExpense.toFixed(2) : "****"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                交易记录
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">全部</TabsTrigger>
                <TabsTrigger value="income" className="flex-1">收入</TabsTrigger>
                <TabsTrigger value="expense" className="flex-1">支出</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                <div className="space-y-3">
                  {filteredTransactions.map((transaction, index) => {
                    const typeInfo = transactionTypeLabels[transaction.type]
                    const Icon = typeInfo.icon
                    return (
                      <div key={transaction.id}>
                        <div className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-muted ${typeInfo.color}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{transaction.title}</p>
                              <p className="text-xs text-muted-foreground">{transaction.time}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${transaction.amount >= 0 ? "text-green-600" : "text-foreground"}`}>
                              {transaction.amount >= 0 ? "+" : ""}¥{Math.abs(transaction.amount).toFixed(2)}
                            </p>
                            {transaction.status === "frozen" && (
                              <Badge variant="secondary" className="text-[10px]">冻结中</Badge>
                            )}
                          </div>
                        </div>
                        {index < filteredTransactions.length - 1 && <Separator />}
                      </div>
                    )
                  })}
                </div>

                {filteredTransactions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4" />
                    <p>暂无交易记录</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Security Tips */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-primary">资金安全保障</p>
                <p className="text-muted-foreground mt-1">
                  平台采用担保交易机制，买家付款后资金由平台托管，确认收货后才会放款给卖家，保障双方权益。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  )
}
