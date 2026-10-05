module.exports = {
  moduleNameMapper: {
    "\\.(css|less)$": "<rootDir>/src/testing/styleMock.js",
    "^d3-[a-z-]+$": "<rootDir>/src/testing/d3Mock.js"
  },
  testPathIgnorePatterns: ["/node_modules/", "chat_chart_rendering.integration.test.js"],
  testEnvironment: "jsdom",
};
