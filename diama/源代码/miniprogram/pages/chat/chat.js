const { api } = require('../../utils/api')
const store = require('../../utils/store')

const BUSINESS_TYPE_TEXT = {
  goods: '商品交易',
  service: '服务咨询',
  errand: '跑腿沟通',
  goods_chat: '商品交易',
  service_chat: '服务咨询',
  task_chat: '跑腿沟通',
  system_notice: '系统通知'
}

Page({
  data: {
    mode: 'list',
    goodsId: '',
    businessType: '',
    businessId: '',
    orderSn: '',
    peerName: '',
    peerUsername: '',
    title: '',
    conversationId: '',
    conversation: null,
    conversations: [],
    messages: [],
    input: '',
    loadingConversations: false,
    loadingMessages: false,
    sending: false
  },

  onLoad(query) {
    if (query.goodsId || query.conversationId || query.businessId) {
      this.setData({
        mode: 'room',
        goodsId: query.goodsId || '',
        businessType: query.businessType || '',
        businessId: query.businessId || '',
        conversationId: query.conversationId || ''
      })
    }
  },

  onShow() {
    if (!store.requireLogin()) return
    const pending = store.takePendingChat()
    if (pending && (pending.goodsId || pending.conversationId || pending.businessId)) {
      this.setData({
        mode: 'room',
        goodsId: pending.goodsId || '',
        businessType: pending.businessType || '',
        businessId: pending.businessId || pending.goodsId || '',
        orderSn: pending.orderSn || '',
        peerName: pending.peerName || '',
        peerUsername: pending.peerUsername || '',
        title: pending.title || '',
        conversationId: pending.conversationId || ''
      })
      this.loadMessages()
      return
    }
    const now = Date.now()
    if (this.lastLoadAt && now - this.lastLoadAt < 600) return
    if (this.data.mode === 'room') this.loadMessages()
    else this.loadConversations()
  },

  loadConversations() {
    if (this.loadingConversations) return
    this.loadingConversations = true
    this.lastLoadAt = Date.now()
    this.setData({ loadingConversations: true })
    api({ url: '/api/chat/list' }).then((res) => {
      const conversations = res.data.list.map((item) => {
        const last = item.messages.length ? item.messages[item.messages.length - 1].content : '暂无消息'
        return Object.assign({}, item, {
          lastMessage: last,
          countText: `${item.messages.length}条`,
          peerInitial: (item.peer || '同').charAt(0),
          peerLine: `${item.peer || '交易对象'} @${item.peerUsername || 'user'}`,
          businessTypeText: BUSINESS_TYPE_TEXT[item.businessType] || item.businessType || '站内会话',
          evidenceText: item.messages.length ? item.messages[item.messages.length - 1].hash : 'SHA256-待生成'
        })
      })
      this.setData({ conversations, loadingConversations: false })
    }).finally(() => {
      this.loadingConversations = false
      if (this.data.loadingConversations) this.setData({ loadingConversations: false })
    })
  },

  loadMessages() {
    if (this.loadingMessages) return
    this.loadingMessages = true
    this.lastLoadAt = Date.now()
    this.setData({ loadingMessages: true })
    api({
      url: '/api/chat/messages',
      data: {
        goodsId: this.data.goodsId,
        businessType: this.data.businessType,
        businessId: this.data.businessId,
        orderSn: this.data.orderSn,
        peerName: this.data.peerName,
        peerUsername: this.data.peerUsername,
        title: this.data.title,
        conversationId: this.data.conversationId
      }
    }).then((res) => {
      this.setData({
        conversation: Object.assign({
          title: '会话',
          peer: '交易对象',
          peerUsername: 'user',
          peerInitial: ((res.data.conversation && res.data.conversation.peer) || '同').charAt(0)
        }, res.data.conversation),
        conversationId: res.data.conversation.id,
        businessType: res.data.conversation.businessType,
        businessId: res.data.conversation.businessId,
        messages: res.data.list.map((item) => Object.assign({}, item, {
          sideClass: item.from === 'me' ? 'mine' : 'other',
          senderLine: `${item.senderName || (item.from === 'me' ? '我' : (res.data.conversation && res.data.conversation.peer) || '交易对象')} @${item.senderUsername || (item.from === 'me' ? 'campus_user' : (res.data.conversation && res.data.conversation.peerUsername) || 'user')}`
        }))
      })
    }).finally(() => {
      this.loadingMessages = false
      if (this.data.loadingMessages) this.setData({ loadingMessages: false })
    })
  },

  openConversation(e) {
    const conversationId = (e.detail && e.detail.id) || e.currentTarget.dataset.id
    this.setData({ mode: 'room', conversationId, businessType: '', businessId: '', goodsId: '' })
    this.loadMessages()
  },

  backToList() {
    this.setData({ mode: 'list', conversation: null, messages: [], input: '' })
    this.loadConversations()
  },

  onInput(e) {
    this.setData({ input: e.detail.value })
  },

  send() {
    const content = this.data.input.trim()
    if (!content) {
      wx.showToast({ title: '请输入消息', icon: 'none' })
      return
    }
    if (this.data.sending) return
    this.setData({ sending: true })
    api({
      url: '/api/chat/send',
      method: 'POST',
      data: {
        goodsId: this.data.goodsId,
        businessType: this.data.businessType,
        businessId: this.data.businessId,
        orderSn: this.data.orderSn,
        peerName: this.data.peerName,
        peerUsername: this.data.peerUsername,
        title: this.data.title,
        conversationId: this.data.conversationId,
        content
      }
    }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      this.setData({ input: '' })
      this.loadMessages()
    }).finally(() => {
      this.setData({ sending: false })
    })
  }
})
