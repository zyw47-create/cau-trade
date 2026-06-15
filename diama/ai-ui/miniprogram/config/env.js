const ENV = "mock"

const environments = {
  mock: {
    baseUrl: "",
    uploadUrl: "",
    useMock: true
  },
  development: {
    baseUrl: "https://dev-api.example.com",
    uploadUrl: "https://dev-api.example.com",
    useMock: false
  },
  production: {
    baseUrl: "https://api.example.com",
    uploadUrl: "https://api.example.com",
    useMock: false
  }
}

module.exports = Object.assign({ name: ENV }, environments[ENV])
