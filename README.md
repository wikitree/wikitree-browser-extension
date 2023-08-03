# WikiTree Browser Extension

[![Build and test](https://github.com/wikitree/wikitree-browser-extension/actions/workflows/test.yml/badge.svg)](https://github.com/wikitree/wikitree-browser-extension/actions/workflows/test.yml)
[![preview-release](https://img.shields.io/chrome-web-store/v/ijipjpbjobecdgkkjdfpemcidfdmnkid?logo=Google%20Chrome&logoColor=%23aaa)](https://chrome.google.com/webstore/detail/wikitree-browser-extensio/ijipjpbjobecdgkkjdfpemcidfdmnkid)
[![stable-release](https://img.shields.io/chrome-web-store/v/ncjafpiokcjepnnlmgdaphkkjehapbln?logo=Google%20Chrome&logoColor=%23aaa)](https://chrome.google.com/webstore/detail/wikitree-browser-extensio/ncjafpiokcjepnnlmgdaphkkjehapbln)

## Installation for end users

The latest version can be downloaded from your browser's app store:

- [Chrome](https://chrome.google.com/webstore/detail/wikitree-browser-extensio/ncjafpiokcjepnnlmgdaphkkjehapbln)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/wikitree-browser-extension/)
- [Safari](https://apps.apple.com/us/app/wikitree-browser-extension/id6447643999) (iOS and Mac)

## Installation for testers

To test the extension you can:

- download the latest zip for your browser:
  - [stable version](https://github.com/wikitree/wikitree-browser-extension/releases/tag/stable)
  - [preview version](https://github.com/wikitree/wikitree-browser-extension/releases/tag/preview)
- unpack it somewhere on your computer,
- Go to [chrome://extensions](chrome://extensions),
- Make sure you have _Developer mode_ turned on (top right corner),
- Click _Load unpacked_,
- Select the folder where you unpacked the extension.
- then first thing is to go to the extension Options and select which components you want to use.

## Installation for developers

To use the latest browser extension from source code, you need to perform several steps to get the source code and build the extension.

1. Get the source code

```
git clone https://github.com/wikitree/wikitree-browser-extension.git
cd wikitree-browser-extension
```

2. Install `npm`

See [npm official documentation](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

3. Install dependencies

```
npm install
```

4. Build the extension

For Chrome:

```
npm run build
```

For Firefox:

```
npm run build-firefox
```

5. Load the extension

For Chrome:

- Go to [chrome://extensions](chrome://extensions)
- Make sure you have _Developer mode_ turned on (top right corner)
- Click _Load unpacked_
- Select the `wikitree-browser-extension/dist` folder

For Firefox:

- Go to [about:debugging](about:debugging)
- Click "This Firefox" on the left-hand side
- Click the "Load Temporary Add-on..." button
- Choose a file in the `wikitree-browser-extension/dist` folder

## Features

For a full list of features, visit the [WikiTree Browser Extension](https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension) page on WikiTree.

If you would like to contribute, see [contributing.md](docs/contributing.md).

If you have an idea for a new feature, post in [WikiTree G2G](https://www.wikitree.com/g2g) using the `wt_apps` and `improvements` tags.
