Component({
  data: {
    selected: 0,
    list: [
      { pagePath: "/pages/index/index", text: "首页", icon: "首" },
      { pagePath: "/pages/category/index", text: "分类", icon: "类" },
      { pagePath: "/pages/messages/index", text: "消息", icon: "信" },
      { pagePath: "/pages/profile/index", text: "我的", icon: "我" }
    ]
  },
  methods: {
    switchTab(event) {
      const index = event.currentTarget.dataset.index
      const item = this.data.list[index]
      this.setData({ selected: index })
      wx.switchTab({
        url: item.pagePath
      })
    },
    openPublish() {
      wx.navigateTo({
        url: "/pages/publish/index"
      })
    }
  },
  pageLifetimes: {
    show() {
      const pages = getCurrentPages()
      const current = pages[pages.length - 1]
      const route = `/${current.route}`
      const index = this.data.list.findIndex((item) => item.pagePath === route)
      if (index >= 0) {
        this.setData({ selected: index })
      }
    }
  }
})
