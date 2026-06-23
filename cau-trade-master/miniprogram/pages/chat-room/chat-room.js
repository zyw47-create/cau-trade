const { request: api } = require('../../utils/request')
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

function getInitial(name) {
  return String(name || '同').trim().charAt(0) || '同'
}

function buildTrade(conversation) {
  const businessType = conversation.businessType || 'goods'
  const businessTypeText = BUSINESS_TYPE_TEXT[businessType] || '站内会话'
  const orderSn = conversation.orderSn || ''
  return {
    title: conversation.title || '交易沟通',
    businessType,
    businessTypeText,
    businessId: conversation.businessId || '',
    orderSn,
    statusText: orderSn ? '订单已关联' : '沟通中',
    linkText: orderSn ? '查看订单' : (businessType.indexOf('goods') >= 0 ? '查看商品' : '查看详情'),
    evidenceText: '聊天记录已生成证据链',
    evidenceLine: orderSn ? `聊天记录已生成证据链 · ${orderSn}` : '聊天记录已生成证据链'
  }
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
    peerAvatar: '',
    title: '',
    conversationId: '',
    conversation: null,
    trade: null,
    conversations: [],
    messages: [],
    input: '',
    loadingConversations: false,
    loadingMessages: false,
    sending: false,
    scrollToId: '',
    returnUrl: '',
    standaloneRoom: false
  },

  onLoad(query) {
    if (query.goodsId || query.conversationId || query.businessId) {
      this.setData({
        mode: 'room',
        goodsId: query.goodsId || '',
        businessType: query.businessType || '',
        businessId: query.businessId || '',
        orderSn: query.orderSn || '',
        peerName: query.peerName ? decodeURIComponent(query.peerName) : '',
        peerUsername: query.peerUsername ? decodeURIComponent(query.peerUsername) : '',
        peerAvatar: query.peerAvatar ? decodeURIComponent(query.peerAvatar) : '',
        title: query.title ? decodeURIComponent(query.title) : '',
        conversationId: query.conversationId || '',
        standaloneRoom: query.standalone === '1'
      })
    }
  },

  onShow() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null
    if (tabBar && tabBar.syncSelected) tabBar.syncSelected()
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
        peerAvatar: pending.peerAvatar || '',
        title: pending.title || '',
        conversationId: pending.conversationId || '',
        returnUrl: pending.returnUrl || ''
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

    api({ url: '/api/chats' }).then((res) => {
      const list = (res.data && res.data.list) || []
      const conversations = list.map((item) => {
        const messages = item.messages || []
        const last = messages.length ? messages[messages.length - 1] : null
        const conversationId = String(item.id || '')
        const readId = store.getConversationReadId(conversationId)
        const readIndex = messages.findIndex((message) => String(message.id) === String(readId))
        const unreadMessages = readIndex >= 0 ? messages.slice(readIndex + 1) : messages
        const unread = Number(item.unreadCount || item.unread_count || unreadMessages.filter((message) => message.from !== 'me').length || 0)
        return Object.assign({}, item, {
          lastMessage: last ? last.content : '暂无消息',
          countText: `${messages.length}条`,
          unreadCount: unread,
          peerAvatar: item.peerAvatar || '',
          peerInitial: item.peerInitial || getInitial(item.peer),
          peerLine: `${item.peer || '交易对象'} @${item.peerUsername || 'user'}`,
          businessTypeText: BUSINESS_TYPE_TEXT[item.businessType] || item.businessType || '站内会话',
          evidenceText: last ? last.hash : 'SHA256-待生成'
        })
      })
      const app = getApp()
      app.globalData.unreadCount = conversations.reduce((sum, item) => sum + Number(item.unreadCount || 0), 0)
      const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null
      if (tabBar && tabBar.syncSelected) tabBar.syncSelected()
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
      url: '/api/chats/messages',
      data: {
        goodsId: this.data.goodsId,
        businessType: this.data.businessType,
        businessId: this.data.businessId,
        orderSn: this.data.orderSn,
        peerName: this.data.peerName,
        peerUsername: this.data.peerUsername,
        peerAvatar: this.data.peerAvatar,
        title: this.data.title,
        conversationId: this.data.conversationId
      }
    }).then((res) => {
      const conversation = Object.assign({
        title: '交易沟通',
        peer: '交易对象',
        peerUsername: 'user',
        peerAvatar: '',
        businessType: this.data.businessType || 'goods',
        businessId: this.data.businessId || this.data.goodsId || ''
      }, (res.data && res.data.conversation) || {})
      conversation.peerInitial = conversation.peerInitial || getInitial(conversation.peer)

      const list = (res.data && res.data.list) || []
      const messages = list.map((item) => {
        const isMine = item.from === 'me'
        return Object.assign({}, item, {
          sideClass: isMine ? 'mine' : 'other',
          rowStyle: `display:flex;align-items:flex-start;gap:14rpx;margin-bottom:22rpx;justify-content:${isMine ? 'flex-end' : 'flex-start'};`,
          bubbleStyle: `max-width:520rpx;padding:22rpx;border-radius:28rpx;line-height:42rpx;word-break:break-word;box-shadow:0 12rpx 28rpx rgba(31,78,121,0.07);background:${isMine ? '#1F4E79' : '#ffffff'};color:${isMine ? '#ffffff' : '#2A2528'};border:${isMine ? 'none' : '1rpx solid rgba(31,78,121,0.09)'};`,
          senderAvatar: item.senderAvatar || '',
          senderInitial: item.senderInitial || getInitial(item.senderName || (isMine ? '我' : conversation.peer)),
          senderLine: `${item.senderName || (isMine ? '我' : conversation.peer)} @${item.senderUsername || (isMine ? 'campus_user' : conversation.peerUsername || 'user')}`
        })
      })
      const last = messages[messages.length - 1]
      if (last) {
        store.markConversationRead(String(conversation.id || this.data.conversationId || ''), last.id)
        const app = getApp()
        app.globalData.unreadCount = 0
        const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null
        if (tabBar && tabBar.syncSelected) tabBar.syncSelected()
      }

      this.setData({
        conversation,
        trade: buildTrade(conversation),
        conversationId: conversation.id || this.data.conversationId,
        businessType: conversation.businessType || this.data.businessType,
        businessId: conversation.businessId || this.data.businessId,
        orderSn: conversation.orderSn || this.data.orderSn,
        messages,
        scrollToId: last ? `msg-${last.id}` : '',
        loadingMessages: false
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
    if (this.data.standaloneRoom) {
      wx.navigateBack({
        delta: 1,
        fail: () => wx.switchTab({ url: '/pages/chat/chat' })
      })
      return
    }
    if (this.data.returnUrl) {
      const returnUrl = this.data.returnUrl.indexOf('?') >= 0
        ? `${this.data.returnUrl}&fromChat=1`
        : `${this.data.returnUrl}?fromChat=1`
      this.setData({ returnUrl: '' })
      wx.redirectTo({
        url: returnUrl,
        fail: () => wx.navigateTo({ url: returnUrl })
      })
      return
    }
    this.setData({ mode: 'list', conversation: null, trade: null, messages: [], input: '', scrollToId: '' })
    this.loadConversations()
  },

  openTrade() {
    const trade = this.data.trade || {}
    if (trade.orderSn) {
      wx.navigateTo({ url: `/pages/order-detail/order-detail?orderSn=${trade.orderSn}` })
      return
    }
    if (trade.businessType && trade.businessType.indexOf('goods') >= 0 && trade.businessId) {
      wx.navigateTo({ url: `/pages/detail/detail?id=${trade.businessId}` })
      return
    }
    if (trade.businessId) {
      wx.navigateTo({ url: `/pages/service-detail/service-detail?id=${trade.businessId}&type=${trade.businessType}` })
    }
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
      url: '/api/chats/messages',
      method: 'POST',
      data: {
        goodsId: this.data.goodsId,
        businessType: this.data.businessType,
        businessId: this.data.businessId,
        orderSn: this.data.orderSn,
        peerName: this.data.peerName,
        peerUsername: this.data.peerUsername,
        peerAvatar: this.data.peerAvatar,
        title: this.data.title,
        conversationId: this.data.conversationId,
        content
      }
    }).then((res) => {
      if (res.code !== 200) {
        wx.showToast({ title: res.msg, icon: 'none' })
        return
      }
      const user = (store.getState() && store.getState().user) || {}
      const data = res.data || {}
      const id = data.id || `local-${Date.now()}`
      const message = {
        id,
        from: 'me',
        sideClass: 'mine',
        rowStyle: 'display:flex;align-items:flex-start;gap:14rpx;margin-bottom:22rpx;justify-content:flex-end;',
        bubbleStyle: 'max-width:520rpx;padding:22rpx;border-radius:28rpx;line-height:42rpx;word-break:break-word;box-shadow:0 12rpx 28rpx rgba(31,78,121,0.07);background:#1F4E79;color:#ffffff;border:none;',
        senderAvatar: user.avatar || '',
        senderInitial: getInitial(user.nickname || '我'),
        senderLine: `${user.nickname || '我'} @${user.username || 'campus_user'}`,
        senderName: user.nickname || '我',
        senderUsername: user.username || 'campus_user',
        content,
        time: data.time || '刚刚',
        hash: data.hash || data.contentHash || '等待后端返回'
      }
      this.setData({
        input: '',
        messages: this.data.messages.concat([message]),
        scrollToId: `msg-${id}`,
        conversationId: data.conversationId || this.data.conversationId
      })
    }).finally(() => {
      this.setData({ sending: false })
    })
  }
})
