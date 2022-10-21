module.exports = {
  moduleNameMapper: {
    "\\.(css|less)$": "<rootDir>/src/testing/styleMock.js"
  },
  testEnvironment: "jsdom",
};
