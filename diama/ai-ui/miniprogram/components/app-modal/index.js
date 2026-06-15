Component({
  options: {
    multipleSlots: true
  },
  properties: {
    visible: Boolean,
    title: String,
    confirmText: {
      type: String,
      value: "确认"
    },
    cancelText: {
      type: String,
      value: "取消"
    },
    maskClosable: {
      type: Boolean,
      value: true
    }
  },
  methods: {
    closeByMask: function () {
      if (this.properties.maskClosable) {
        this.triggerEvent("cancel")
      }
    },
    cancel: function () {
      this.triggerEvent("cancel")
    },
    confirm: function () {
      this.triggerEvent("confirm")
    },
    stop: function () {}
  }
})
