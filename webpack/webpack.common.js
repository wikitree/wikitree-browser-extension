const webpack = require("webpack");
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const WebExtension = require("webpack-target-webextension");
const pageWorldScripts = require("./page_world_scripts.js");
const srcDir = path.join(__dirname, "..", "src");
const buildInfo = { buildDate: new Date(Date.now()).toISOString() };
// Chunks kept out of the vendor split so they stay self-contained: the npm packages only they use go in the chunk,
// not in the every-page vendor.js. The feature chunks are loaded by the *_bootstrap.js files that content_main.js
// imports.
const lazyFeatureChunks = new Set([
  "auto-categories",
  "family-lists",
  "muse-world",
  "auto-bio",
  "feed-helper",
  "wikitable-wizard",
  "change-family-lists",
  "image-table",
  "space-watchlist-sorter",
  "trusted-list-changes-table",
]);

try {
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
    chunkFilename: "[name].js",
    environment: {
      dynamicImport: true,
    },
  },
  optimization: {
    splitChunks: {
      name: "vendor",
      chunks(chunk) {
        return !lazyFeatureChunks.has(chunk.name);
      },
      cacheGroups: {
        // d3 is used only by Genie's lazily loaded charts: keep it out of the every-page vendor.js.
        museD3: {
          test: /[\\/]node_modules[\\/](d3-[^\\/]+|internmap|delaunator|robust-predicates)[\\/]/,
          name: "muse-d3",
          chunks: "async",
          priority: 20,
          enforce: true,
        },
        // xlsx and jszip (~590 KB) are loaded on demand by the Wikitable Wizard's spreadsheet import and by Genie.
        // Without this group the vendor split would put them back into the every-page vendor.js.
        sheets: {
          test: /[\\/]node_modules[\\/](xlsx|jszip)[\\/]/,
          name: "sheets",
          chunks: "async",
          priority: 20,
          enforce: true,
        },
        // Code that only lazily loaded chunks share (Genie and the WT+ Query Builder both use the suggestions list,
        // for example) goes into a shared lazy chunk instead of the every-page vendor.js.
        lazyShared: {
          chunks: "async",
          minChunks: 2,
          // Unnamed (numbered) chunks. `name: false` would fall back to the top-level "vendor" name.
          name: () => undefined,
          priority: -5,
          reuseExistingChunk: true,
        },
      },
    },
  },
  resolve: {
    extensions: [".js"],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: ".",
          to: "../",
          context: "public",
          // The AI requests live in src/core/ai/ai_requests.js, which the app build shares; the background gets them
          // at its top, so dist/background.js stays one file (the Safari Xcode projects name only that file).
          transform(content, absoluteFrom) {
            if (path.basename(absoluteFrom) !== "background.js") return content;
            const ai = require("fs").readFileSync(path.join(srcDir, "core", "ai", "ai_requests.js"), "utf8");
            return ai + "\n" + content.toString();
          },
        },
      ],
      options: {},
    }),
    new CopyPlugin({
      patterns: [
        {
          from: `manifest/manifest-${env.browser}.json`,
          to: "../manifest.json",
          context: "src",
        },
        ...pageWorldScripts.map((file) => ({ from: file, to: `../${file}`, context: "src" })),
      ],
    }),
    new webpack.DefinePlugin({
      BUILD_INFO: JSON.stringify(buildInfo),
      // true only in the WikiTree Tree Apps mobile app build (webpack.webview.js)
      WBE_WEBVIEW: JSON.stringify(env.browser === "webview"),
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
      {
        test: /\.(png|jpg|gif|svg)$/i,
        type: "asset/resource",
        generator: {
          filename: "images/[name][ext]",
        },
      },
      {
        test: /\.woff2?$/,
        type: "asset/resource",
        generator: {
          filename: "fonts/[name][ext]",
        },
      },
    ],
  },
});

// The build date and commit, for webpack.webview.js to write into webview.json.
module.exports.buildInfo = buildInfo;
