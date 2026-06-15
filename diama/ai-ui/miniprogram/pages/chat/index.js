const BasePage = require("../../utils/base-page")
const request = require("../../utils/request")
const api = require("../../config/api")

// Chat is a normal registered page rather than a dynamically generated module.
BasePage({
  data: {
    sessionId: "",
    title: "会话",
    sessionType: "goods",
    inputValue: "",
    messages: []
  },
  onLoad(options) {
    const title = decodeURIComponent(options.name || "会话")
    this.setData({
      sessionId: options.id || "",
      title,
      sessionType: options.type || "goods",
      messages: [
        { id: "m1", mine: false, content: `你好，这里是${title}。`, time: "刚刚" }
      ]
    })
    request.get(api.chat.messages, { sessionId: options.id || "" }).catch(() => null)
  },
  onInput(event) {
    this.setData({ inputValue: event.detail.value })
  },
  sendMessage() {
    const content = this.data.inputValue.trim()
    if (!content) return
    const message = { id: `m_${Date.now()}`, mine: true, content, time: "刚刚" }
    this.setData({
      inputValue: "",
      messages: this.data.messages.concat(message)
    })
    request.post(api.chat.send, {
      sessionId: this.data.sessionId,
      sessionType: this.data.sessionType,
      content
    }).catch(() => null)
  }
}, {
  requireAuth: true
})
