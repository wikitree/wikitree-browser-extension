# Publishing in the Chrome Web Store

You will need to belong to the group publisher Google Group and have a paid Chrome Web Store developer account.

## Build the Extension

You will need to build the extension before you can update the Chrome Extension in the store.

You can do this by downloading the latest code and using

`npm run build`

This should create a folder named `/dist` which you can zip and upload.

## Updating the Extension in the CWS

Go to the developer dashboard located at https://chrome.google.com/webstore/devconsole.

Sign into your CWS account.

In the top-right corner, you should see a "Publisher" dropdown. Select "WikiTree Apps Project" to act as the group publisher.

You should see the extension in the list of items. Click on the title of the extension you want to update.

In the menu on the left, choose "Package".

In the top right, click the "Upload new package" button. Upload the .zip file you created before.

You should be take to the "Store Listing" page. Make sure the description and screenshots are updated if needed.

Click the "Submit for review" button.