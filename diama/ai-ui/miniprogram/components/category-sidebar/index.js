Component({
  properties: {
    categories: {
      type: Array,
      value: []
    },
    selectedId: {
      type: String,
      value: "all"
    }
  },
  data: {
    viewCategories: []
  },
  observers: {
    "categories,selectedId": function (categories, selectedId) {
      this.setData({
        viewCategories: (categories || []).map((item) => Object.assign({}, item, {
          className: item.id === selectedId ? "side-item active pressable" : "side-item pressable"
        }))
      })
    }
  },
  methods: {
    handleSelect(event) {
      this.triggerEvent("select", {
        id: event.currentTarget.dataset.id
      })
    }
  }
})
