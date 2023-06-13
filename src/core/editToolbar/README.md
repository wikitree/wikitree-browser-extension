## Adding items to editMenu

Items are added based on the page type. There are 5 possibilities:
* Profiles are defined in [editToolbarProfileOptions.js](./core/editToolbar/editToolbarProfileOptions.js)
* Space pages are defined in [editToolbarSpaceOptions.js](./core/editToolbar/editToolbarSpaceOptions.js)
* Categories are defined in [editToolbarCategoryOptions.js](./core/editToolbar/editToolbarCategoryOptions.js)
* Templates are defined in [editToolbarTemplateOptions.js](./core/editToolbar/editToolbarTemplateOptions.js)
* Other Wiki pages are defined in [editToolbarGenericOptions.js](./core/editToolbar/editToolbarGenericOptions.js)

In those files menus are defined in JSON format. 

You can add new buttons if needed. For now only `button:` property is defined and sets the button name and `items:` property contain an array of menu items.

New items are added in the appropriate place with the following properties:
* `featureid:` links the item to a feature in [options.js](./options.js).
* `title:` name of the item.
* `hint:` hint displayed for menu item.
* `call` function that will be called on selection. function must be defined as `export function` and it must be imported to the options file. 
  There are 2 predefined functions for links `editToolbarApp` and space pages `editToolbarWiki`.
* `params:` you can define the params passed to the function as json object as needed.
* `items:` you can also define a sub menu usint this property. 
