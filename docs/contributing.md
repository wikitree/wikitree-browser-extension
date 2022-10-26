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

In `src/features/register_feature_options.js`, register the feature with the options registry using the `registerFeature` function. This will setup a basic on/off switch on the Options Page.

```js
registerFeature({
  name: "My Feature",
  id: "myFeature",
  description: "This feature does stuff.",
  category: "Global",
});
```

If you want additional options for your feature (not just turning it on and off) then, instead of puting the call to `registerFeature` in `register_feature_options.js`, create a new file to put your call to `registerFeature` in (to keep `register_feature_options.js` from getting large and hard to read). The options are registered as part of the `registerFeature` call. Name your file `<feature name>_options.js` (e.g. `my_feature_options.js`). Here is an example file:

```js
import { registerFeature, OptionType } from "../../core/options/options_registry";

// The feature data for the myFeature feature
const myExampleFeature = {
  name: "My Feature",
  id: "myFeature",
  description: "This feature does stuff.",
  category: "Global",
  options: [
    {
      id: "myFirstOption",
      type: OptionType.CHECKBOX,
      label: "Enables my first option",
      defaultValue: true,
    },
  ],
};

// Just importing this file will register all the features
registerFeature(myExampleFeature);
```

In the feature's javascript files, you should check if a user has it turned on or off using the following code:

At the top of the file:

```js
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";
```

To check if it is enabled:

```js
checkIfFeatureEnabled("myFeature").then((result) => {
  if (result) {
    // additional code
  }
});
```

Also in the feature's javascript files, if you have additional feature options, you can get the values that the user has set for the options like this:

```js
const options = await getFeatureOptions("myFeature");

if (options.myFirstOption) {
  // additional code
}
```

NOTE: getFeatureOptions returns a Promise so you can call it using await as above if you are in an async function. Otherwise you can the `then` syntax as shown above for `checkIfFeatureEnabled`.

In `src/content.js` import your feature source file:

```js
import "./features/myFeature/myFeature";
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

## Prettier

The project uses [Prettier](https://prettier.io/) to format the code.

The settings the project uses are stored in the [.prettierrc](../.prettierrc) file.

### Installing Prettier

The general installation instructions can be viewed at the [Prettier Docs](https://prettier.io/docs/en/install.html).

#### Visual Studio Code

To install Prettier in [Visual Studio Code](https://code.visualstudio.com/):

- Go to `View > Extensions`
- Search for "Prettier - Code formatter"
- Select the "Install" button

To set it up so it formats on save:

- Go to `File > Preferences > Settings`
- Search for "Default Formatter" and select "Prettier - Code formatter" in the dropdown
- Search for "Format On Save" and make sure the checkbox is checked

It will use the settings in the `.prettierrc` file in the repository.

### Using Prettier

If you've set it up so it formats on save, you don't have to do anything else.

You can have prettier format a single file by using:

```
npx prettier --write your_file_name
```

If you haven't installed prettier or are using the VS Code extension, you may be asked to install it when using the above command.

## Other potentially useful tools

- [WikiTree API](https://github.com/wikitree/wikitree-api) - documentation of available API functions
- [WikiTree JS](https://github.com/PeWu/wikitree-js) - JavaScript to access the API
- [Markdown viewer](https://chrome.google.com/webstore/detail/markdown-viewer/ckkdlimhmcjmikdlpkmbgfkaikojcbjk) - Chrome extension to view Markdown (.md files in project documentation)
- [JSON viewer](https://chrome.google.com/webstore/detail/json-viewer/gbmdgpbipfallnflgajpaliibnhdgobh) - Chrome extension to view JSON, like the output from the WikiTree API
- [WikiTree Styles](https://www.wikitree.com/css/examples.html) - Some examples of CSS styles/colors/etc. for wikitree.com
