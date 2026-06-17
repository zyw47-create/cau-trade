Component({
  properties: {
    rows: {
      type: Number,
      value: 3
    },
    type: {
      type: String,
      value: 'list'
    }
  },

  data: {
    items: []
  },

  observers: {
    'rows, type': function() {
      this.buildItems()
    }
  },

  lifetimes: {
    attached() {
      this.buildItems()
    }
  },

  methods: {
    buildItems() {
      const rows = Math.max(1, Number(this.data.rows || 1))
      this.setData({
        items: Array.from({ length: rows }).map((_, index) => ({ id: index }))
      })
    }
  }
})
