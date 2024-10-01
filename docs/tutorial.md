# Creating a new feature example

This tutorial will walk you through creating a simple feature for the WikiTree Browser Extension (WBE).

## Prerequisites

This tutorial assumes you have 3 things:

- An account on [GitHub](https://github.com/).
- A code editor and terminal access (this tutorial will be using [Visual Studio Code](https://code.visualstudio.com/)).
- The [Google Chrome](https://www.google.com/chrome/) browser.

## Forking the repository

Sign into your GitHub account.

Go to the [WikiTree Browser Extension Code Repository](https://github.com/wikitree/wikitree-browser-extension).

Click the "Fork" button at the top right. This will take you to a page titled "Create a new fork". You can leave everything as default. Press the "Create fork" button.

You should now have a copy of the repository saved to your GitHub account.

When viewing your copy of the code on GitHub, notice the green button that says "Code". This is where you can download the code to work on locally.

## Downloading the code

Upon opening Visual Studio Code, you should be brought to a "Welcome" page. If you don't see this page, you can access it by going to `Help > Welcome` in the menu.

Under "Start", there is an option to "Clone Git Repository". When you click that, it will ask for a URL.

Go to your code repository on GitHub, click the green "Code" button, and copy the HTTPS link that is shown. Enter that into VS Code and select "Clone from URL".

Select where you would like to save the code on your computer.

After it has been cloned, select "Open" in VS Code.

You should now see the code files in the left-hand sidebar.

You will want to open a terminal so you can run git commands. You can do this in VS Code by selecting `Terminal > New Terminal` in the menu.

WBE uses a package manager called [NPM](https://www.npmjs.com/) (Node Package Manager). If you have never used it before, you will need to install it. The instructions for installing it can be found at [the npm website](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

After npm is installed on your computer, type `npm install` into the terminal so all the dependencies for WBE get downloaded and installed.

## Testing WBE locally

You should now have a copy of the extension code on your computer.

You will have to build the browser extension before you can test the extension.

In the terminal, type `npm run build`.

In Chrome, type `chrome://extensions` in the address bar.

At the top right of that page, there should be a "Developer Mode" toggle. Make sure it is switched on.

Make sure all other versions of the WikiTree Browser Extension are disabled.

At the top left of the page, click the "Load Unpacked" button. Navigate to the folder where you've downloaded the code, and select the `wikitree-browser-extension/dist` folder. This should load the extension into your browser so you can test it.

## Setting up a new feature

The first thing you want to do before writing a new feature is to switch to a new branch in git. In the terminal, type `git checkout -b helloWorld`.

There are a few set-up steps to do so the code knows about your feature.

Find and open the file `src/features/register_feature_options.js`.

Add this code to that file and save:

```js
registerFeature({
  name: "Hello World",
  id: "helloWorld",
  description: "This is an example feature.",
  category: "Global",
  creators: [{ name: "Bob Smith", wikitreeid: "Smith-123" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfilePage],
});
```

The `isProfilePage` keyword tells the extension that this feature should only run on profile pages.

Create a new folder under `src/features` and name it `hello_world`.

Inside of that folder, create a file called `hello_world.js`. This is where you will write your feature code. We will come back to it in a bit.

The last step for setting up your feature is to go to `src/content.js` and add this to the code:

```js
import "./features/hello_world/hello_world";
```

Run `npm run build` to re-build the extension with your changes. If you would rather it automatically re-build after every change, type `npm run watch`.

Click on the WBE icon in your browser, and you should see a feature listed called "Hello World". Make sure to toggle it to "on".

## Writing your feature code

Open the `hello_world.js` file you created earlier.

The first thing you want to do is make sure WBE knows if the user has enabled your feature.

Add this to your file:

```js
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("helloWorld").then((result) => {
  if (result) {
    // TODO
  }
});
```

Now it's time to write the feature code!

This simple feature will just change the header of a profile from `Name` to `Hello, Name`.

The HTML for the header looks like this:

```html
<h1>
  <span itemprop="name">Daniel George Nelson</span>
  ...
</h1>
```

To grab the name and make changes we want to:

1. Use jQuery to make changing the DOM a bit easier: `import $ from "jquery"`
2. Grab the element that has the name of the profile and save it: `const nameElement = $('h1 > [itemprop="name"]');`
3. Get the name inside of that element and save it: `const nameText = nameElement.text()`
4. Change the text inside of the element to our desired text: `$(nameElement).text(`Hello, ${nameText}`)`

Combining those, the final code in `hello_world.js` should look like this:

```js
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import $ from "jquery";

shouldInitializeFeature("helloWorld").then((result) => {
  if (result) {
    const nameElement = $('h1 > [itemprop="name"]');
    const nameText = nameElement.text();
    $(nameElement).text(`Hello, ${nameText}`);
  }
});
```

Once you've saved and re-built the extension, go to a profile page and you should see "Hello, Name" at the top of the profile.

If you don't see any changes to the profile, you may need to go to `chrome://extensions` and click the reload button next to the extension, and then reload the profile page.

## Requesting to add your code to the shared repo

Now that your feature is finished, you want that feature be added to the shared code repository on GitHub.

In the terminal, type `git status`. This will show you which files have been changed.

Since we want to include all the files that have been changed, type `git add .`.

Now you want to commit the changes with a short message about what was changed. Type `git commit -m "Add Hello World feature."`.

Now you want to add those changes to your GitHub repository. Type `git push --set-upstream origin helloWorld`. This will upload the code to your repository under the branch "helloWorld".

If you go to your GitHub repository, you can now access the "helloWorld" branch in the dropdown on the left.

Once you are viewing that branch, you should see a section that says "This branch is X commits ahead of wikitree/wikitree-browser-extension:development." and a button that says "Contribute".

Click the "Contribute" button, and you will be taken to a form where you can fill out more information about your feature. If this were an actual feature that should be added to the code, you would press the "Create pull request" button to request that the WBE maintainers view your code and add it to the browser extension. But it isn't necessary for this tutorial.

## Additional Info

If you ran into any trouble during this tutorial, feel free to ask for help in the [WikiTree Discord](https://www.wikitree.com/wiki/Help:Discord), the [WikiTree Apps Project Google Group](https://groups.google.com/forum/#!forum/wikitreeapps), or in [G2G](https://www.wikitree.com/g2g/) with the `wt_apps` tag.

You can also practice your GitHub skills by improving this tutorial!
