const base = require("./jest.config");

module.exports = {
  ...base,
  testPathIgnorePatterns: ["/node_modules/"],
  moduleNameMapper: { "\\.(css|less)$": "<rootDir>/src/testing/styleMock.js" },
  transform: { "^.+\\.js$": ["babel-jest", { presets: ["@babel/preset-env"] }] },
  transformIgnorePatterns: ["/node_modules/(?!(?:d3-[^/]+|internmap|delaunator|robust-predicates)/)"],
  testMatch: ["**/chat_chart_rendering.integration.test.js"],
};
