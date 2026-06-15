App({
  globalData: {
    unreadCount: 3,
    isLoggedIn: true,
    isVerified: true,
    categoryId: "",
    categoryKeyword: "",
    userInfo: {
      name: "张三",
      college: "计算机学院",
      grade: "2023级",
      creditScore: 98,
      isVerified: true,
      role: "user"
    }
  },
  onLaunch: function () {
    wx.setStorageSync("campus_token", wx.getStorageSync("campus_token") || "mock-token")
    wx.setStorageSync("campus_userinfo", wx.getStorageSync("campus_userinfo") || this.globalData.userInfo)
  },
  updateMessageBadge: function () {
    const count = this.globalData.unreadCount || 0
    if (count > 0) {
      wx.setTabBarBadge({
        index: 2,
        text: String(count)
      })
    } else {
      wx.removeTabBarBadge({ index: 2 })
    }
  }
})
