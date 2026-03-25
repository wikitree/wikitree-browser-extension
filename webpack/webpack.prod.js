const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");

const TerserPlugin = require("terser-webpack-plugin");

module.exports = (env) =>
  merge(common(env), {
    mode: "production",
    optimization: {
      minimizer: [
        new TerserPlugin({
          extractComments: false,
          terserOptions: {
            format: {
              comments: false,
              ascii_only: true,
            },
          },
        }),
      ],
    },
  });
