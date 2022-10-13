# Contributing to the WikiTree Browser Extension

## Introduction

The WikiTree Browser Extension adds advanced features to the WikiTree website. Each feature is created and maintained by one or a few individual volunteers, and each feature can be turned on or off by the user.

This project, and the features it contains, are open source on [GitHub](https://github.com/wikitree/wikitree-browser-extension) so that they can live on past their original creators, and in case anyone else can help improve on them.

There are several places to share ideas and questions with other developers:

- The WikiTree [G2G forum](https://www.wikitree.com/g2g/)
- The WikiTree Apps [Google Group](https://groups.google.com/g/WikiTreeApps/)
- The WikiTree [GitHub](https://github.com/wikitree/wikitree-browser-extension)
- The WikiTree [Discord](https://discord.gg/9EMSdccnn3)

## Getting started

### Sign up

If you haven't already, the first thing you should do is sign up at [WikiTree](https://wikitree.com/). Registration is free, and will enable you to start contributing your family tree content.

We're using [GitHub](https://github.com/wikitree/wikitree-browser-extension) to collaborate on the browser extension. In order to create your own fork and submit pull requests to merge your contributions into the shared application, you'll need to create a GitHub account.

### Get the code

Once you have your accounts, it's time to grab the [code](https://github.com/wikitree/wikitree-browser-extension). You can download the code (via zip or git clone) to experiment with locally. But if you want to contribute back to the collaborative WikiTree project, you'll want to create your own [fork](https://docs.github.com/en/get-started/quickstart/fork-a-repo). Then you can check out that repo locally for work:

`git clone https://github.com/<your github id>/wikitree-browser-extension.git`

This will give you a copy of the current WikiTree Browser Extension project.

## Add a new feature

### Consider making a branch

To add a new feature, you may want to start with a separate GitHub branch. This lets you proceed with making your changes without any impact on other work. You'll be able to switch back to "main" to see the current set of unmodified views (and pull down any updates since you cloned the repository). For a "newFeature" branch, you can use:

`git checkout -b newFeature`

### Create some new files for your project

Add a new folder with the feature name under the `src/features` folder to hold the code.

In `src/options.js`, add information about the feature to the `features` array. This will setup a basic on/off switch on the Options Page.

```js
const features = [
  {
    name: "My Feature",
    id: "featureID",
    description: "This feature does stuff.",
  },
];
```

In the feature's javascript files, you should check if a user has it turned on or off using the following code:

```js
chrome.storage.sync.get("featureID", (result) => {
  if (result.featureID) {
    // additional code
  }
});
```

In `src/content.js` import your feature source file:
```js
import './features/myFeature/myFeature';
```

You may want to include a README file in the folder to explain what the feature does.

### See your feature in the browser

See main [[README]] for installation instructions.

You can use the following command during development to keep the `dist` folder up to date with your changes without having to manually build each time:
```
npm run watch
```


## Share your view

When your new feature is ready to share, you can announce it on G2G, Discord, or the Apps email group. And you can submit a pull request from your fork into the main project to get it incorporated into code for everyone to share.

## Other potentially useful tools

- [WikiTree API](https://github.com/wikitree/wikitree-api) - documentation of available API functions
- [WikiTree JS](https://github.com/PeWu/wikitree-js) - JavaScript to access the API
- [Markdown viewer](https://chrome.google.com/webstore/detail/markdown-viewer/ckkdlimhmcjmikdlpkmbgfkaikojcbjk) - Chrome extension to view Markdown (.md files in project documentation)
- [JSON viewer](https://chrome.google.com/webstore/detail/json-viewer/gbmdgpbipfallnflgajpaliibnhdgobh) - Chrome extension to view JSON, like the output from the WikiTree API
- [WikiTree Styles](https://www.wikitree.com/css/examples.html) - Some examples of CSS styles/colors/etc. for wikitree.com
