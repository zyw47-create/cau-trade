Component({
  properties: {
    value: {
      type: String,
      value: ''
    },
    placeholder: {
      type: String,
      value: '搜索'
    },
    searchType: {
      type: String,
      value: 'goods'
    }
  },

  data: {
    innerValue: ''
  },

  observers: {
    value(value) {
      this.setData({ innerValue: value || '' })
    }
  },

  lifetimes: {
    attached() {
      this.setData({ innerValue: this.properties.value || '' })
    }
  },

  methods: {
    onInput(e) {
      const value = e.detail.value || ''
      this.setData({ innerValue: value })
      this.triggerEvent('input', { value, type: this.properties.searchType })
    },

    onConfirm() {
      this.triggerEvent('search', {
        value: this.data.innerValue,
        type: this.properties.searchType
      })
    },

    clear() {
      this.setData({ innerValue: '' })
      this.triggerEvent('input', { value: '', type: this.properties.searchType })
      this.triggerEvent('search', { value: '', type: this.properties.searchType })
    }
  }
})
