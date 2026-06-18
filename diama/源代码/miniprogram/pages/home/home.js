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
        path: "/pages/services/services",
        tab: false
      }
    ]
  },

  onLoad: function () {
    const app = getApp()
    if (app.updateMessageBadge) {
      app.updateMessageBadge()
    }
  },

  onShow: function () {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null
    if (tabBar && tabBar.syncSelected) tabBar.syncSelected()
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

  publish: function () {
    wx.navigateTo({ url: "/pages/publish/publish" })
  }
})
