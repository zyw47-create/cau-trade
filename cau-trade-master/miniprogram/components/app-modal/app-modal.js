Component({
  options: {
    multipleSlots: true
  },

  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: '提示'
    },
    content: {
      type: String,
      value: ''
    },
    confirmText: {
      type: String,
      value: '确认'
    },
    cancelText: {
      type: String,
      value: '取消'
    },
    maskClosable: {
      type: Boolean,
      value: true
    },
    showCancel: {
      type: Boolean,
      value: true
    }
  },

  methods: {
    closeByMask() {
      if (this.properties.maskClosable) this.cancel()
    },

    cancel() {
      this.triggerEvent('cancel')
    },

    confirm() {
      this.triggerEvent('confirm')
    },

    noop() {}
  }
})
