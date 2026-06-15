Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    conditions: {
      type: Array,
      value: []
    },
    currentCondition: {
      type: String,
      value: ""
    },
    aiOnly: {
      type: Boolean,
      value: false
    }
  },
  data: {
    draftCondition: "",
    draftAiOnly: false
  },
  observers: {
    visible(visible) {
      if (visible) {
        this.setData({
          draftCondition: this.properties.currentCondition,
          draftAiOnly: this.properties.aiOnly
        })
      }
    }
  },
  methods: {
    noop() {},
    close() {
      this.triggerEvent("close")
    },
    chooseCondition(event) {
      this.setData({
        draftCondition: event.currentTarget.dataset.value
      })
    },
    toggleAiOnly() {
      this.setData({
        draftAiOnly: !this.data.draftAiOnly
      })
    },
    reset() {
      this.setData({
        draftCondition: "",
        draftAiOnly: false
      })
      this.triggerEvent("reset")
    },
    apply() {
      this.triggerEvent("apply", {
        condition: this.data.draftCondition,
        aiOnly: this.data.draftAiOnly
      })
    }
  }
})
