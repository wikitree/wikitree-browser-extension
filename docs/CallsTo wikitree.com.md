Standardization of retrieving pages within applications and extensions. That is not needed for images, css and js files.

# Identifying a caller

There are several different applications/extensions/services that can retrieve a page. Here is a standard to identify the caller (xxx in the rest of the page). All calls should start with "api" followed by the type of application
* "Ext" for extensions
  * "apiExtWbe" for WikiTree Browser Extension.
  * "apiExtBee" for WikiTree Bee.
  * "apiExtSrc" for Sourcerer.
* "Apps" for applications on apps.wikitree.com.
  * "apiApps_harris5439_maps" for WikiTree Maps application.
* "TreeApp" for the tree applications
  * "apiTreeApp_FanChart"
* "Svc" for services running on other servers.
  * "apiSvc_Straub620_g2g2rss" for services running on other servers.
  * "apiSvc_wtPlus_EditBot" for services running on other servers.

Additional text can be added if you want to distinguish between multiple calls in the same application.

# Retrieving a page from

## www.wikitree.com

In all calls to www.wikitree.com you should add a parameter appID=xxx. That applies to all calls. Even if you POST some parameters, you can still add a parameter to the URL.
* For a page without parameters add ?appID=xxx to the URL. 
* For a page with parameters add &appID=xxx to the URL. 

## api.wikitree.com

All calls to api should have the &appID=xxx parameter. At some point in the future it will be a required parameter.

## apps.wikitree.com

Calls to the apps domain don't require the appID=xxx parameter unless you are using other user's data. I think I noticed that some Tree apps do calls to the apps domain and in those cases it is useful to add the identification parameter.
* For a page without parameters add ?appID=xxx to the URL. 
* For a page with parameters add &appID=xxx to the URL. 

## plus.wikitree.com

In all calls to plus.wikitree.com you should identify the caller. add a parameter appID=xxx. That applies to all calls. Even if you POST some parameters, you can still add a parameter to the URL.
* For static pages (all pages without /function/ in the url) add ?appID=xxx to the URL. 
* For dynamic pages (all pages without /function/ in the url) change the page name to xxx. A path should look like /function/wt.../xxx.json?Query=...

## www.softdata.si/wt
In all calls to www.softdata.si you should identify the caller. add a parameter ?appID=xxx.
