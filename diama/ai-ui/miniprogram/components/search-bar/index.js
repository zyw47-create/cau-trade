Component({
  properties: {
    value: {
      type: String,
      value: ""
    },
    placeholder: {
      type: String,
      value: "搜索商品..."
    },
    showCancel: {
      type: Boolean,
      value: true
    },
    searchType: {
      type: String,
      value: "goods"
    }
  },
  data: {
    showCancelText: false
  },
  observers: {
    value(value) {
      this.setData({
        showCancelText: !!value
      })
    },
    showCancel(showCancel) {
      this.setData({
        showCancelText: !!showCancel && !!this.properties.value
      })
    }
  },
  methods: {
    onInput(event) {
      const value = event.detail.value
      this.setData({
        showCancelText: !!this.properties.showCancel && !!value
      })
      this.triggerEvent("input", { value })
    },
    onConfirm(event) {
      this.triggerEvent("search", {
        value: event.detail.value,
        type: this.properties.searchType
      })
    },
    onCancel() {
      this.setData({
        showCancelText: false
      })
      this.triggerEvent("cancel")
    }
  }
})
