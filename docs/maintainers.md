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

See the [GitHub documentation](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews) for more details.
