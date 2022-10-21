# WikiTree Browser Extension

## Installation for testers

To test the extension you can:
* download the latest [wikitree-browser-extension.zip](https://github.com/wikitree/wikitree-browser-extension/releases/download/latest/wikitree-browser-extension.zip),
* unpack it somewhere on your computer, 
* Go to [chrome://extensions](chrome://extensions),
* Make sure you have _Developer mode_ turned on (top right corner),
* Click _Load unpacked_,
* Select the folder where you unpacked the extension.
* then first thing is to go to the extension Options and select which components you want to use.

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

| name                 | description                                                                                                     | contributors                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Printer Friendly Bio | Creates a printer-friendly version of a profile biography.                                                      | [Steven Harris](https://www.wikitree.com/wiki/Harris-5439), [Jamie Nelson](https://www.wikitree.com/wiki/Nelson-3486) |
| Source Previews      | Shows a pop-up of the source information when you hover over a source number.                                   | [Steven Harris](https://www.wikitree.com/wiki/Harris-5439)                                                            |
| WT+                  | Addon for edit pages. It does a lot of things including all about tempates, Source paster and Cleanup routines. | [Aleš Trtnik](https://www.wikitree.com/wiki/Trtnik-2)                                                                 |

If you would like to contribute, see [contributing.md](docs/contributing.md).

If you have an idea for a new feature, post in [WikiTree G2G](https://www.wikitree.com/g2g) using the `wt_apps` and `improvements` tags.
