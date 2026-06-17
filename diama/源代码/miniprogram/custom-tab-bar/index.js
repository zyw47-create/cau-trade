const store = require('../utils/store')

Component({
  data: {
    selected: 0,
    unreadCount: 0,
    list: [
      { pagePath: '/pages/home/home', text: '首页' },
      { pagePath: '/pages/category/category', text: '分类' },
      { pagePath: '/pages/chat/chat', text: '消息' },
      { pagePath: '/pages/profile/profile', text: '我的' }
    ]
  },

  pageLifetimes: {
    show() {
      this.syncSelected()
    }
  },

  lifetimes: {
    attached() {
      this.syncSelected()
    }
  },

  methods: {
    syncSelected() {
      const pages = getCurrentPages()
      const current = pages.length ? `/${pages[pages.length - 1].route}` : ''
      const selected = this.data.list.findIndex((item) => item.pagePath === current)
      const app = getApp()
      this.setData({
        selected: selected >= 0 ? selected : 0,
        unreadCount: (app.globalData && app.globalData.unreadCount) || 0
      })
    },

    switchTab(e) {
      const index = Number(e.currentTarget.dataset.index)
      const item = this.data.list[index]
      if (!item) return
      wx.switchTab({ url: item.pagePath })
    },

    goPublish() {
      if (!store.requireLogin()) return
      if (!store.getState().isVerified) {
        wx.showToast({ title: '请先完成实名认证', icon: 'none' })
        wx.navigateTo({ url: '/pages/verify/verify' })
        return
      }
      wx.navigateTo({ url: '/pages/publish/publish' })
    }
  }
})
