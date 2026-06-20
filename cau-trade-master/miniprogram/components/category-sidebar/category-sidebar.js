Component({
  properties: {
    categories: {
      type: Array,
      value: []
    },
    active: {
      type: String,
      value: '全部'
    }
  },

  methods: {
    select(e) {
      const item = e.currentTarget.dataset.item || {}
      this.triggerEvent('select', {
        id: item.id || item.name,
        name: item.name
      })
    }
  }
})
