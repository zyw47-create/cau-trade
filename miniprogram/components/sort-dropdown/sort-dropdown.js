Component({
  properties: {
    options: {
      type: Array,
      value: []
    },
    active: {
      type: String,
      value: 'default'
    }
  },

  data: {
    opened: false
  },

  methods: {
    toggle() {
      this.setData({ opened: !this.data.opened })
    },

    choose(e) {
      const item = e.currentTarget.dataset.item || {}
      this.setData({ opened: false })
      this.triggerEvent('change', {
        key: item.key,
        text: item.text
      })
    }
  }
})
