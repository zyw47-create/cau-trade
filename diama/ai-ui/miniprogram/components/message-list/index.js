Component({
  properties: {
    conversations: { type: Array, value: [] }
  },
  data: {
    viewConversations: []
  },
  observers: {
    conversations(list) {
      const typeMap = { goods: "商品", service: "服务", errand: "跑腿", system: "系统" }
      const statusMap = { read: "已读", delivered: "送达", failed: "失败", sent: "发送" }
      this.setData({
        viewConversations: (list || []).map((item) => ({
          ...item,
          sessionTypeText: typeMap[item.sessionType] || "系统",
          statusText: statusMap[item.messageStatus] || "发送"
        }))
      })
    }
  },
  methods: {
    handleTap(event) {
      this.triggerEvent("itemtap", {
        id: event.currentTarget.dataset.id,
        sessionType: event.currentTarget.dataset.type
      })
    }
  }
})
