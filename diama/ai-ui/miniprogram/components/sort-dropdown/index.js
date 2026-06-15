Component({
  properties: {
    options: {
      type: Array,
      value: []
    },
    currentValue: {
      type: String,
      value: "latest"
    }
  },
  data: {
    viewOptions: []
  },
  observers: {
    "options,currentValue": function (options, currentValue) {
      this.setData({
        viewOptions: (options || []).map((item) => Object.assign({}, item, {
          className: item.id === currentValue ? "sort-chip sort-chip-active" : "sort-chip"
        }))
      })
    }
  },
  methods: {
    handleChange(event) {
      this.triggerEvent("change", {
        value: event.currentTarget.dataset.id
      })
    }
  }
})
