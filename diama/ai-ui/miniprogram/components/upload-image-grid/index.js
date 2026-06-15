Component({
  properties: {
    images: {
      type: Array,
      value: []
    }
  },
  methods: {
    addImage() {
      this.triggerEvent("add")
    },
    retry(event) {
      this.triggerEvent("retry", { id: event.currentTarget.dataset.id })
    },
    remove(event) {
      this.triggerEvent("remove", { id: event.currentTarget.dataset.id })
    }
  }
})
