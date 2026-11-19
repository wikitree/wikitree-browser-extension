// The "webview" build: plain files that the WikiTree Tree Apps mobile app (Android WebView, iOS WKWebView) injects
// into wikitree.com pages. There's no extension runtime in the app, so each entry starts with
// src/platform/webview/shim.js, a stand-in for the chrome.* APIs WBE uses, which talks to a native "host" object the
// app installs as window.__wbeHost.
//
// Differences from the extension builds (webpack.common.js / webpack.prod.js):
// - One file per entry and no lazy chunks: the app injects files, it can't load chunks on demand. The import()
//   calls in the *_bootstrap.js files are bundled inline.
// - No webpack-target-webextension, no manifest.json and no background.js.
// - Output goes to dist-webview/, with the bundles at its root and webpack's images and fonts under js/, where the
//   extension builds put them. The stand-in points webpack's public path at the app's base URL at run time.
// - WBE_WEBVIEW is true, so code can leave out what needs background.js (src/platform/webview/disabled_features.js).
const webpack = require("webpack");
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const WebExtension = require("webpack-target-webextension");
const prod = require("./webpack.prod.js");
const { buildInfo } = require("./webpack.common.js");
const pageWorldScripts = require("./page_world_scripts.js");
const disabledFeatures = require("../src/platform/webview/disabled_features.json");

const rootDir = path.join(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const outDir = path.join(rootDir, "dist-webview");
const shim = path.join(srcDir, "platform", "webview", "shim.js");
// The extension's name and version come from the Chrome manifest, so the app shows the same version as the stores.
const chromeManifest = require("../src/manifest/manifest-chrome.json");

// options.html loads js/vendor.js and js/options.js in the extension; here everything is in wbe-options.js.
function webviewOptionsHtml(content) {
  const html = content.toString();
  const vendorTag = /[ \t]*<script src="js\/vendor\.js"><\/script>\r?\n?/;
  const optionsTag = '<script src="js/options.js"></script>';
  if (!vendorTag.test(html) || !html.includes(optionsTag)) {
    throw new Error("webpack.webview.js: public/options.html no longer has the script tags this build replaces");
  }
  return html.replace(vendorTag, "").replace(optionsTag, '<script src="wbe-options.js"></script>');
}

// One compilation per entry, so each really is one file: a single compilation with three entries can't get down to
// one chunk each, and leaves the chunks they share as separate files.
const ENTRIES = {
  // content_entry.js waits for the page and stays out of frames, as the extensions' content script does
  "wbe-webview": [shim, path.join(srcDir, "platform", "webview", "content_entry.js")],
  "wbe-options": [shim, path.join(srcDir, "options.js")],
  // Presentation Mode's early part is a plain script the extensions copy as it is and run at document_start.
  // Here it's bundled behind the stand-in, which it needs for chrome.storage; early_entry.js waits for <html>.
  "wbe-early": [shim, path.join(srcDir, "platform", "webview", "early_entry.js")],
  // Genie, loaded only when it's opened (src/features/chat/load_genie.js): too big to put in every page
  "wbe-genie": [shim, path.join(srcDir, "platform", "webview", "genie_entry.js")],
};

function entryConfig(env, name, withFiles) {
  const config = prod({ ...env, browser: "webview" });

  config.name = name;
  config.entry = { [name]: ENTRIES[name] };

  config.output = {
    path: outDir,
    // set at run time by the stand-in (__webpack_public_path__ = host base)
    publicPath: "",
    filename: "[name].js",
    // (the build-webview script empties dist-webview first: the compilations share it)
    clean: false,
  };

  config.optimization = { ...config.optimization, splitChunks: false, runtimeChunk: false };

  // Webpack's images and fonts go under js/, as in the extension builds (where output.path is dist/js), so they
  // can't collide with the copied public/images.
  for (const rule of config.module.rules) {
    if (rule.generator?.filename) rule.generator = { ...rule.generator, filename: `js/${rule.generator.filename}` };
  }

  const keep = (plugin) => !(plugin instanceof CopyPlugin) && !(plugin instanceof WebExtension);
  config.plugins = [
    ...config.plugins.filter(keep),
    new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
    new webpack.DefinePlugin({
      WBE_WEBVIEW_MANIFEST: JSON.stringify({
        name: chromeManifest.name,
        version: chromeManifest.version,
        manifest_version: 3,
      }),
    }),
    ...(withFiles ? filePlugins() : []),
  ];

  return config;
}

// The copied files and webview.json, made once (with the main bundle).
function filePlugins() {
  return [
    new CopyPlugin({
      patterns: [
        {
          from: ".",
          to: ".",
          context: "public",
          globOptions: { ignore: ["**/background.js", "**/options.html", "**/.DS_Store"] },
        },
        { from: "public/options.html", to: "options.html", transform: webviewOptionsHtml },
        ...pageWorldScripts.map((file) => ({ from: file, to: file, context: "src" })),
      ],
    }),
    // webview.json tells the app what this build is. chromeApis is filled in by scripts/check-webview-shim.mjs,
    // which runs after webpack and checks that the stand-in covers every chrome.* API that src/ uses.
    {
      apply(compiler) {
        compiler.hooks.thisCompilation.tap("WbeWebviewJson", (compilation) => {
          compilation.hooks.processAssets.tap(
            { name: "WbeWebviewJson", stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
            () => {
              const json = {
                name: chromeManifest.name,
                version: chromeManifest.version,
                commit: buildInfo.shortHash || "",
                buildDate: buildInfo.buildDate,
                entry: "wbe-webview.js",
                early: "wbe-early.js",
                options: "options.html",
                chromeApis: [],
                disabledFeatures: disabledFeatures.features.map((feature) => feature.id),
              };
              compilation.emitAsset("webview.json", new webpack.sources.RawSource(JSON.stringify(json, null, 2) + "\n"));
            }
          );
        });
      },
    },
  ];
}

module.exports = (env) => Object.keys(ENTRIES).map((name, index) => entryConfig(env, name, index === 0));
