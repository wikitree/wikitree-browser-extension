/*
 * Created By: Jonathan Duke (Duke-5773)
 * Used for browser and OS detection
 */

export let navigatorDetect = {
  browser: {},
  os: {},
};

(function (n) {
  // only run once per page
  if (!navigatorDetect.isInitialized) {
    // user-agent detection is not ideal, but for now it seems to work for the 3 browsers supported by the extension
    if (/\bOPR\//.test(n.userAgent)) {
      navigatorDetect.browser.engine = "Blink";
      navigatorDetect.browser.name = "Opera";
    } else if (/^((?!\b(Chrome|Firefox)\/).)*(?=\bSafari\/)/.test(n.userAgent)) {
      navigatorDetect.browser.engine = "WebKit";
      navigatorDetect.browser.name = "Safari";
    } else if (/\bFirefox\//.test(n.userAgent)) {
      navigatorDetect.browser.engine = "Gecko";
      navigatorDetect.browser.name = "Firefox";
    } else if (/\bEdg(e|iOS|A)?\//.test(n.userAgent)) {
      navigatorDetect.browser.engine = "Blink";
      navigatorDetect.browser.name = "Edge";
    } else if (/\bChrom(e|ium)\//.test(n.userAgent)) {
      navigatorDetect.browser.engine = "Blink";
      navigatorDetect.browser.name = "Chrome";
    }
    // let's also detect the OS and whether it is mobile in case the UI needs to be customized to match
    if (/\bi(Phone|Pad|Pod|OS)\b/.test(n.userAgent)) {
      navigatorDetect.os.name = "iOS";
      navigatorDetect.os.Mobile = true;
    } else if (/\bAndroid\b/.test(n.userAgent)) {
      navigatorDetect.os.name = "Android";
      navigatorDetect.os.Mobile = true;
    } else if (/\bCrOS\b/.test(n.userAgent)) {
      navigatorDetect.os.name = "Chrome";
      navigatorDetect.os.Mobile = false;
    } else if (/\bLinux\b/.test(n.userAgent)) {
      navigatorDetect.os.name = "Linux";
      navigatorDetect.os.Mobile = false;
    } else if (/\b(Macintosh|Mac OS X)\b/.test(n.userAgent)) {
      navigatorDetect.os.name = "Mac";
      navigatorDetect.os.Mobile = false;
    } else if (/\bWindows\b/.test(n.userAgent)) {
      navigatorDetect.os.name = "Windows";
      navigatorDetect.os.Mobile = false;
    }
    if (navigatorDetect.browser.engine) {
      navigatorDetect.browser[navigatorDetect.browser.engine] = true;
      document.documentElement.classList.add("browser-" + navigatorDetect.browser.engine.toLowerCase());
    }
    if (navigatorDetect.browser.name) {
      navigatorDetect.browser[navigatorDetect.browser.name] = true;
      document.documentElement.classList.add("browser-" + navigatorDetect.browser.name.toLowerCase());
    }
    if (navigatorDetect.os.name) {
      navigatorDetect.os[navigatorDetect.os.name] = true;
      document.documentElement.classList.add("os-" + navigatorDetect.os.name.toLowerCase());
    }
    document.documentElement.classList.add(navigatorDetect.os.Mobile ? "os-mobile" : "os-desktop");
    navigatorDetect.isInitialized = true;
  }
})(navigator);
