const { checkAuth } = require("./guards")

function BasePage(options, guardOptions = {}) {
  const pageOptions = Object.assign({}, options)
  const rawOnLoad = pageOptions.onLoad
  const rawOnShow = pageOptions.onShow

  pageOptions.onLoad = function wrappedOnLoad(query) {
    this.__guardPassed = checkAuth(guardOptions, false)
    if (!this.__guardPassed) {
      return
    }

    if (typeof rawOnLoad === "function") {
      return rawOnLoad.call(this, query)
    }
  }

  pageOptions.onShow = function wrappedOnShow() {
    this.__guardPassed = checkAuth(guardOptions, true)
    if (!this.__guardPassed) {
      return
    }

    if (typeof rawOnShow === "function") {
      return rawOnShow.call(this)
    }
  }

  return Page(pageOptions)
}

module.exports = BasePage
