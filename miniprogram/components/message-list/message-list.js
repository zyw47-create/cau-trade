const TYPE_TEXT = {
  goods: '商品交易',
  service: '服务咨询',
  errand: '跑腿沟通',
  goods_chat: '商品交易',
  service_chat: '服务咨询',
  task_chat: '跑腿沟通',
  system_notice: '系统通知'
}

Component({
  properties: {
    conversations: {
      type: Array,
      value: []
    }
  },

  methods: {
    open(e) {
      const id = e.currentTarget.dataset.id
      this.triggerEvent('open', { id })
    },

    typeText(type) {
      return TYPE_TEXT[type] || type || '站内会话'
    }
  }
})
