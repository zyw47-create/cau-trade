const { request: api } = require('../../utils/request')
const store = require('../../utils/store')
const { localizeGoodsImages } = require('../../utils/image-cache')

function buildHotGoods(goods) {
  const browseHistory = store.getBrowseHistory()
  const browsedIds = browseHistory.reduce((map, item, index) => {
    // 浏览记录是本地去重列表，越靠前代表越近期浏览，给少量热度加权。
    map[String(item.id)] = Math.max(1, 8 - index)
    return map
  }, {})
  return (goods || [])
    .filter((item) => item.status === 'on_sale')
    .map((item) => {
      const favoriteCount = Number(item.favoriteCount || 0)
      const browseScore = browsedIds[String(item.id)] || 0
      const hotScore = favoriteCount * 10 + browseScore
      return Object.assign({}, item, {
        hotScore,
        hotText: `${favoriteCount}人收藏${browseScore ? ' · 近期浏览' : ''}`,
        image: item.image || ((item.images || [])[0]) || ''
      })
    })
    .sort((a, b) => b.hotScore - a.hotScore || Number(b.id || 0) - Number(a.id || 0))
    .slice(0, 4)
}

Page({
  data: {
    // 首页开屏数据保持轻量，避免首屏依赖接口导致加载闪烁。
    metrics: [
      { value: "二手", label: "闲置交易" },
      { value: "服务", label: "技能互助" },
      { value: "跑腿", label: "即时任务" }
    ],
    actions: [
      {
        label: "二手交易",
        desc: "浏览教材、数码、生活用品等校园闲置",
        icon: "买",
        theme: "theme-blue",
        tint: "tint-blue",
        path: "/pages/category/category",
        tab: true
      },
      {
        label: "服务广场",
        desc: "维修、家教、设计与技能服务",
        icon: "服",
        theme: "theme-cyan",
        tint: "tint-cyan",
        path: "/pages/services/services",
        tab: false
      },
      {
        label: "跑腿大厅",
        desc: "发布取送、代办与临时协助任务",
        icon: "跑",
        theme: "theme-violet",
        tint: "tint-violet",
        path: "/pages/errands/errands",
        tab: false
      }
    ],
    hotGoods: [],
    hasHotGoods: false
  },

  onLoad: function () {
    const app = getApp()
    if (app.updateMessageBadge) {
      app.updateMessageBadge()
    }
    this.loadHotGoods()
  },

  onShow: function () {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null
    if (tabBar && tabBar.syncSelected) tabBar.syncSelected()
    if (this.loadedHotGoods) this.loadHotGoods()
  },

  openPage: function (event) {
    const item = this.data.actions[event.currentTarget.dataset.index]
    if (!item) return

    if (item.tab) {
      wx.switchTab({ url: item.path })
    } else {
      wx.navigateTo({ url: item.path })
    }
  },

  browseGoods: function () {
    wx.switchTab({ url: "/pages/category/category" })
  },

  openHotGoods: function (event) {
    const id = event.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  loadHotGoods: function () {
    if (this.loadingHotGoods) return
    this.loadingHotGoods = true
    api({ url: '/api/goods' }).then((res) => {
      const hotGoods = buildHotGoods((res.data && res.data.list) || [])
      return localizeGoodsImages(hotGoods).then((localizedGoods) => {
        this.setData({
          hotGoods: localizedGoods,
          hasHotGoods: localizedGoods.length > 0
        })
      })
    }).then(() => {
      this.loadedHotGoods = true
    }).finally(() => {
      this.loadingHotGoods = false
    })
  },

  publish: function () {
    wx.navigateTo({ url: "/pages/publish/publish" })
  }
})
