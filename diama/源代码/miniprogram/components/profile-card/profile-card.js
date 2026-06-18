Component({
  properties: {
    user: {
      type: Object,
      value: null
    },
    favoritesCount: {
      type: Number,
      value: 0
    }
  },

  methods: {
    verify() {
      this.triggerEvent('verify')
    },

    chooseavatar() {
      this.triggerEvent('chooseavatar')
    }
  }
})
