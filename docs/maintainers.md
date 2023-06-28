# WikiTree Browser Extension Maintainers

Maintainers are part of the "WikiTree Apps Extension Maintainers" GitHub group. This group has write permissions for the repository.

## Adding Code to the Repository

Since you have write access to the repository, you can make changes directly to the code instead of forking the code and submitting a pull request from your fork.

### Changing the Core Code or Adding a New Feature

Changes to the core code or the addition of new features should still be made in a pull request and approved by one of the other maintainers.

To make a pull request:

Clone the repository onto your local machine if you don't already have a copy.

```
git clone REPO-URL
```

Create a new branch for your changes and switch to that branch.

```
git checkout -b YOUR-BRANCH-NAME
```

Make your changes.

Push your new branch with your changes to the repository.

```
git push --set-upstream origin YOUR-BRANCH-NAME
```

You can then make a pull request from GitHub by going to your branch.

There should be a message with a button that says "Compare & pull request". Request to have it merged into the `development` branch.

### Updating a Feature You Maintain

If you need to make changes to one of the features you are in charge of, you don't need to have another maintainer double-check.

You can just push the changes to the repository directly.

## Reviewing Pull Requests

If there are any open pull requests, there will be a number next to the "Pull Requests" tab when viewing the repository page.

To review it, click on the name of the request.

Go to the "Files changed" tab.

Review each file to see what was changed. After you have reviewed a file, click the "Viewed" checkbox.

Once you have reviewed all files, click the "Review changes" button in the top right.

If everything looks good, click "Approve". You can then merge the changes into the development branch.

If something needs to be changed, click "Request changes" and comment on what needs to be changed.

If a pull request will affect multiple different features, make sure to request a review from all current maintainers and post about the request in either the WikiTree Apps Group or Discord to make sure people have a chance to discuss the change. Before merging, make sure at least three maintainers have approved the change.

See the [GitHub documentation](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews) for more details.

## Updating the test version for the Chrome Store

You will need to belong to the group publisher Google Group and have a paid Chrome Web Store developer account.

### Build the Extension

You will need to increase the version number of the extension and build the extension before you can update the Chrome Extension in the store.

First, pull the latest changes to the `development` branch.

Update the version number in [manifest-chrome.json](/src/manifest/manifest-chrome.json) by one. For example, change "1.0.0.12" to "1.0.0.13". You will not be able to update the extension in the Chrome Store if the version number hasn't increased.

All zipped extension files should be automatically built when merging into the stable or development branches. They are available under the [latest releases](https://github.com/wikitree/wikitree-browser-extension/releases).

If you need to manually build the extension use:

`npm run zip`

This should create a zip file named `dist-chrome.zip`.

### Updating the Extension in the CWS

Go to the developer dashboard located at https://chrome.google.com/webstore/devconsole.

Sign into your CWS account.

In the top-right corner, you should see a "Publisher" dropdown. Select "WikiTree Apps Project" to act as the group publisher.

You should see the extension in the list of items. Click on the title of the extension you want to update.

In the menu on the left, choose "Package".

In the top right, click the "Upload new package" button. Upload the .zip file you created before.

You should be take to the "Store Listing" page. Make sure the description and screenshots are updated if needed.

Click the "Submit for review" button.

## Updating the test version for Firefox

You will need to be added as a "developer" on the extension to be able to update it.

### Build the Extension

You will need to increase the version number of the extension and build the extension before you can update the Firefox extension in the store.

First, pull the latest changes to the `development` branch.

Update the version number in [manifest-firefox.json](/src/manifest/manifest-firefox.json) by one. For example, change "1.0.0.12" to "1.0.0.13".

All zipped extension files should be automatically built when merging into the stable or development branches. They are available under the [latest releases](https://github.com/wikitree/wikitree-browser-extension/releases).

If you need to manually build the extension use:

`npm run zip-firefox`

This should create a zip file named `dist-firefox.zip`.

### Updating the Extension on the Firefox site

Go to the [Developer Hub](https://addons.mozilla.org/en-US/developers/addons).

Click on "WikiTree Browser Extension Test".

On the left, click "Upload New Version".

Click "Select a file..." and choose the `wikitree-firefox-extension.zip` file that you created earlier.

It will ask if you used a bundler to create the code. Since we use webpack, you have to select that option.

You will need to upload a zip of the source code. You can just go to the repository, click the green "Code" button, and then select "Download ZIP".

## Monthly Release

A stable version of the extension will be released once a month at the beginning of the month.

### Steps for creating the stable version

- Two days before the end of the month, create a branch off of `development` and name the branch after the new version number. You should increase the [minor version number](https://semver.org/) by one. For example, if the last stable branch name was "1.0", the new one would be "1.1".
- Bug fixes should be allowed to the stable branch. They should be made in a pull request. Any changes to this branch should be merged into `development`.
- Do thorough testing on the stable branch to get it ready for release.
- On the last day of the month, merge the stable branch into `main`. Upload `main` to the Chrome Store and Firefox.

During the month, bug fixes can still be made to the stable branch, but all new features or major tweaks should be made on `development`.
