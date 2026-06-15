Component({
  properties: {
    title: String,
    subtitle: String,
    showBack: {
      type: Boolean,
      value: false
    },
    rightText: {
      type: String,
      value: ""
    }
  },
  methods: {
    onBack() {
      wx.navigateBack({
        fail() {
          wx.switchTab({ url: "/pages/index/index" })
        }
      })
    },
    onRightTap() {
      this.triggerEvent("righttap")
    }
  }
})
