import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Geist, Geist_Mono, Noto_Serif_SC } from 'next/font/google'
import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })
const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin', 'chinese-simplified'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif-sc',
})

export const metadata: Metadata = {
  title: 'Campus Market - 校园二手交易平台',
  description: '校园二手交易微信小程序风格前端，覆盖商品交易、服务、跑腿、消息、订单与钱包场景。',
  generator: 'Codex',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh" className="bg-white scroll-smooth" style={notoSerifSC.style}>
      <body className={`bg-white text-foreground antialiased font-serif-sc ${notoSerifSC.variable}`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
