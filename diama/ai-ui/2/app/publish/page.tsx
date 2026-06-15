"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { BottomNav } from "@/components/bottom-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Image as ImageIcon,
  X,
  Sparkles,
  Loader2,
  ChevronLeft,
  Plus,
  AlertCircle,
  CheckCircle2,
  Wand2,
} from "lucide-react"
import { categories } from "@/components/category-list"

const conditions = [
  { value: "new", label: "全新", description: "未拆封或未使用" },
  { value: "like_new", label: "几乎全新", description: "使用很少，无明显使用痕迹" },
  { value: "good", label: "轻微使用", description: "有轻微使用痕迹，不影响使用" },
  { value: "fair", label: "明显使用", description: "有明显使用痕迹，功能正常" },
]

const locations = ["东区", "西区", "北区", "学院路校区"]

export default function PublishPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAiDialog, setShowAiDialog] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  
  // Form state
  const [images, setImages] = useState<string[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [condition, setCondition] = useState("")
  const [price, setPrice] = useState("")
  const [originalPrice, setOriginalPrice] = useState("")
  const [location, setLocation] = useState("")
  const [useAiAudit, setUseAiAudit] = useState(true)

  const handleImageUpload = () => {
    // Simulate image upload
    if (images.length < 9) {
      setImages([...images, `/placeholder.svg?height=200&width=200&text=图片${images.length + 1}`])
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleAiGenerate = () => {
    setAiGenerating(true)
    // Simulate AI generation
    setTimeout(() => {
      setTitle("iPad Pro 11寸 2022款 M2芯片 256G 国行 成色极好")
      setDescription(`【商品描述】
2022年购入的iPad Pro，M2芯片，256G存储，国行正品。

【使用情况】
- 日常轻度使用，主要用于上课记笔记
- 一直贴膜戴壳，屏幕无划痕
- 电池健康度 96%
- 无任何维修记录

【配件】
- 原装充电器和数据线
- 原装包装盒

【交易说明】
东区可面交，支持当面验货。价格小刀，大刀勿扰。`)
      setAiGenerating(false)
      setShowAiDialog(false)
    }, 2000)
  }

  const handleSubmit = () => {
    setIsSubmitting(true)
    // Simulate submission
    setTimeout(() => {
      setIsSubmitting(false)
      router.push("/goods")
    }, 2000)
  }

  const isStepValid = (stepNum: number) => {
    switch (stepNum) {
      case 1:
        return images.length >= 1
      case 2:
        return title.length >= 5 && description.length >= 20
      case 3:
        return category && condition && price && location
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">发布商品</h1>
          <div className="w-10" />
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">步骤 {step}/3</span>
            <span className="text-sm text-muted-foreground">
              {step === 1 ? "上传图片" : step === 2 ? "填写信息" : "设置价格"}
            </span>
          </div>
          <Progress value={(step / 3) * 100} className="h-2" />
        </div>

        {/* Step 1: Images */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                上传商品图片
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {images.map((image, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={image} alt={`图片${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {index === 0 && (
                      <Badge className="absolute bottom-1 left-1 text-[10px]">封面</Badge>
                    )}
                  </div>
                ))}
                {images.length < 9 && (
                  <button
                    className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors"
                    onClick={handleImageUpload}
                  >
                    <Plus className="h-8 w-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{images.length}/9</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                * 第一张图片将作为封面展示，建议上传清晰、多角度的商品实拍图
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-6">
            {/* AI Assist */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">AI 智能填写</p>
                      <p className="text-xs text-muted-foreground">让 AI 帮你生成标题和描述</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowAiDialog(true)}>
                    <Wand2 className="h-4 w-4" />
                    使用 AI
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>商品信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">商品标题 *</Label>
                  <Input
                    id="title"
                    placeholder="请输入商品标题，如：iPad Pro 11寸 2022款"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground text-right">{title.length}/50</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">商品描述 *</Label>
                  <Textarea
                    id="description"
                    placeholder="请详细描述商品的使用情况、配件、瑕疵等信息..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={8}
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground text-right">{description.length}/1000</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Price & Settings */}
        {step === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>分类与成色</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>商品分类 *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择分类" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <cat.icon className="h-4 w-4" />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>商品成色 *</Label>
                  <RadioGroup value={condition} onValueChange={setCondition}>
                    <div className="grid grid-cols-2 gap-3">
                      {conditions.map((cond) => (
                        <Label
                          key={cond.value}
                          htmlFor={cond.value}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            condition === cond.value ? "border-primary bg-primary/5" : "hover:bg-secondary"
                          }`}
                        >
                          <RadioGroupItem value={cond.value} id={cond.value} className="mt-0.5" />
                          <div>
                            <span className="font-medium">{cond.label}</span>
                            <p className="text-xs text-muted-foreground mt-0.5">{cond.description}</p>
                          </div>
                        </Label>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>价格与位置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">出售价格 *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                      <Input
                        id="price"
                        type="number"
                        placeholder="0.00"
                        className="pl-8"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="originalPrice">原价（选填）</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                      <Input
                        id="originalPrice"
                        type="number"
                        placeholder="0.00"
                        className="pl-8"
                        value={originalPrice}
                        onChange={(e) => setOriginalPrice(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>交易地点 *</Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择交易地点" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">AI 内容审核</p>
                      <p className="text-xs text-muted-foreground">自动检测违规内容，提升审核效率</p>
                    </div>
                  </div>
                  <Switch checked={useAiAudit} onCheckedChange={setUseAiAudit} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
              上一步
            </Button>
          )}
          {step < 3 ? (
            <Button className="flex-1" onClick={() => setStep(step + 1)} disabled={!isStepValid(step)}>
              下一步
            </Button>
          ) : (
            <Button className="flex-1" onClick={handleSubmit} disabled={!isStepValid(step) || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  发布中...
                </>
              ) : (
                "立即发布"
              )}
            </Button>
          )}
        </div>
      </main>

      {/* AI Dialog */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI 智能填写
            </DialogTitle>
            <DialogDescription>
              AI 将根据您上传的图片自动生成商品标题和描述
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {aiGenerating ? (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">AI 正在分析图片并生成内容...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.slice(0, 4).map((image, index) => (
                    <div key={index} className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                      <img src={image} alt={`图片${index + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  AI 将分析这些图片，为您生成专业的商品标题和详细描述，节省您的时间。
                </p>
                <Button className="w-full gap-2" onClick={handleAiGenerate}>
                  <Wand2 className="h-4 w-4" />
                  开始生成
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  )
}
