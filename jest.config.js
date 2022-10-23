module.exports = {
  moduleNameMapper: {
    "\\.(css|less)$": "<rootDir>/src/testing/styleMock.js"
  },
  testEnvironment: "jsdom",
  moduleFileExtensions: ["js", "jsx", "mjs"],
  testMatch: [ "**/__tests__/**/*.?(m)[jt]s?(x)", "**/?(*.)+(spec|test).?(m)[jt]s?(x)" ]
};
