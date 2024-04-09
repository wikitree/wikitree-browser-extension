const webpack = require("webpack");
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const WebExtension = require("webpack-target-webextension");
const srcDir = path.join(__dirname, "..", "src");
const buildInfo = { buildDate: new Date(Date.now()).toISOString() };

try {
  // attempt to get the last commit hash; this will work on GitHub but could fail if git is not in the user's local path
  const gitOutput = require("child_process").execSync('git log -1 --pretty="%h %H"').toString();
  const hashes = gitOutput?.match(/^\s*([0-9a-f]+)\s+([0-9a-f]+)\s*$/);
  if (hashes?.length > 2) {
    buildInfo.shortHash = hashes[1];
    buildInfo.commitHash = hashes[2];
  } else {
    console.log(gitOutput);
  }
} catch {}

console.log(JSON.stringify(buildInfo));

module.exports = (env) => ({
  entry: {
    options: path.join(srcDir, "options.js"),
    popup: path.join(srcDir, "popup.js"),
    content: path.join(srcDir, "content.js"),
  },
  output: {
    path: path.join(__dirname, "../dist/js"),
    publicPath: "js/",
    filename: "[name].js",
    environment: {
      dynamicImport: true,
    },
  },
  optimization: {
    splitChunks: {
      name: "vendor",
      chunks(chunk) {
        return true;
      },
    },
  },
  resolve: {
    extensions: [".js"],
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: ".", to: "../", context: "public" }],
      options: {},
    }),
    new CopyPlugin({
      patterns: [
        {
          from: `manifest/manifest-${env.browser}.json`,
          to: "../manifest.json",
          context: "src",
        },
      ],
    }),
    new webpack.DefinePlugin({
      BUILD_INFO: JSON.stringify(buildInfo),
    }),
    new WebExtension(),
    new webpack.ProvidePlugin({
      $: "jquery",
      jQuery: "jquery",
      "window.jQuery": "jquery",
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
});
