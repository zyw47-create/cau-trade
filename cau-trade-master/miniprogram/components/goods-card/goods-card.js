Component({
  properties: {
    goods: {
      type: Object,
      value: {}
    }
  },

  data: {
    imageFailed: false
  },

  observers: {
    goods() {
      this.setData({ imageFailed: false })
    }
  },

  methods: {
    open() {
      this.triggerEvent('open', { id: this.properties.goods.id })
    },

    favorite() {
      this.triggerEvent('favorite', { id: this.properties.goods.id })
    },

    order() {
      this.triggerEvent('order', { id: this.properties.goods.id })
    },

    onImageError() {
      this.setData({ imageFailed: true })
    }
  }
})
