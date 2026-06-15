const BasePage = require("../../utils/base-page")
const { conversations: sourceConversations } = require("../../utils/mock-data")

// Keep this page module explicit so WeChat DevTools can reliably re-index it.
BasePage({
  data: {
    keyword: "",
    conversations: sourceConversations
  },
  onItemTap(event) {
    const detail = event.detail || {}
    const conversation = sourceConversations.find((item) => item.id === detail.id) || detail
    wx.navigateTo({
      url: `/pages/chat/index?id=${conversation.id || ""}&name=${encodeURIComponent(conversation.name || "会话")}&type=${conversation.sessionType || "goods"}`
    })
  },
  onSearchInput(event) {
    const keyword = event.detail.value.trim()
    this.setData({
      keyword,
      conversations: sourceConversations.filter((item) => {
        return !keyword || item.name.includes(keyword) || item.lastMessage.includes(keyword)
      })
    })
  },
  onSearch() {},
  onSearchCancel() {
    this.setData({ keyword: "", conversations: sourceConversations })
  }
}, {
  requireAuth: true
})
