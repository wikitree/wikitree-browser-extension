# Adding An Additional Feature

## Basic Setup

Add a new folder with the feature name under the `features` folder to hold the code.

Make sure you update `manifest.json` with the javascript files.

In `core/js/options.js`, add information about the feature to the `feature` array. This will setup a basic on/off switch on the Options Page.

``` js
const features = [
	{
		name: 'My Feature',
		id: 'featureID',
		description: 'This feature does stuff.',
	}
];
```

In the feature's javascript files, you should check if a user has it turned on or off using the following code:

``` js
chrome.storage.sync.get('featureID', (result) => {
	if (result.featureID) {
        // additional code
    }
}
```

You may want to include a README file in the folder to explain what the feature does.

## Adding Your Feature to the Top Menu

The extension adds a new "App Features" section in the top menu.

You can add a menu item to it using the `createTopMenuItem` function.

For example,

``` js
createTopMenuItem({
	title: 'This is shown when you hover.',
	name: 'My Feature',
	id: 'wte-tm-my-feature'
});
```

| option | description |
|--------|-------------|
| name | The text that you want to show in the menu item. |
| title | The text that shows when you hover over the menu item. |
| id | The HTML ID for the menu item. Ideally, it will start with `wte-tm-`|

If you want a function to be triggered when someone clicks on the menu item, add a listener in your code:

``` js
$('#wte-tm-my-feature').on('click', () => {
	// this gets executed when someone clicks on the menu item
});
```
