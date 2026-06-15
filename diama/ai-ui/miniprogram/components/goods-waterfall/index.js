Component({
  properties: {
    goodsList: {
      type: Array,
      value: []
    },
    loading: {
      type: Boolean,
      value: false
    },
    hasMore: {
      type: Boolean,
      value: true
    }
  },
  observers: {
    goodsList(list) {
      const left = []
      const right = []
      ;(list || []).forEach((item, index) => {
        if (index % 2 === 0) {
          left.push(item)
        } else {
          right.push(item)
        }
      })
      this.setData({
        left,
        right,
        showNoMore: !this.properties.hasMore && !!(list && list.length)
      })
    },
    hasMore(value) {
      const list = this.properties.goodsList || []
      this.setData({
        showNoMore: !value && !!list.length
      })
    }
  },
  data: {
    left: [],
    right: [],
    showNoMore: false
  },
  methods: {
    onGoodsTap(event) {
      this.triggerEvent("goodstap", event.detail)
    },
    onFavTap(event) {
      this.triggerEvent("fav", event.detail)
    }
  }
})
