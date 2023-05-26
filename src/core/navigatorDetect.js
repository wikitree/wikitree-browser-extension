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
  if (n && !n.detect) {
    n.detect = navigatorDetect;
    // user-agent detection is not ideal, but for now it seems to work for the 3 browsers supported by the extension
    if (/\bOPR\//.test(n.userAgent)) {
      n.detect.browser.engine = "WebKit";
      n.detect.browser.name = "Opera";
    } else if (/^((?!\b(Chrome|Firefox)\/).)*(?=\bSafari\/)/.test(n.userAgent)) {
      n.detect.browser.engine = "WebKit";
      n.detect.browser.name = "Safari";
    } else if (/\bFirefox\//.test(n.userAgent)) {
      n.detect.browser.engine = "Gecko";
      n.detect.browser.name = "Firefox";
    } else if (/\bEdg(e|iOS|A)?\//.test(n.userAgent)) {
      n.detect.browser.engine = "Blink";
      n.detect.browser.name = "Edge";
    } else if (/\bChrom(e|ium)\//.test(n.userAgent)) {
      n.detect.browser.engine = "Blink";
      n.detect.browser.name = "Chrome";
    }
    // let's also detect the OS and whether it is mobile in case the UI needs to be customized to match
    if (/\bi(Phone|Pad|Pod|OS)\b/.test(n.userAgent)) {
      n.detect.os.name = "iOS";
      n.detect.os.Mobile = true;
    } else if (/\bAndroid\b/.test(n.userAgent)) {
      n.detect.os.name = "Android";
      n.detect.os.Mobile = true;
    } else if (/\bCrOS\b/.test(n.userAgent)) {
      n.detect.os.name = "Chrome";
      n.detect.os.Mobile = false;
    } else if (/\bLinux\b/.test(n.userAgent)) {
      n.detect.os.name = "Linux";
      n.detect.os.Mobile = false;
    } else if (/\b(Macintosh|Mac OS X)\b/.test(n.userAgent)) {
      n.detect.os.name = "Mac";
      n.detect.os.Mobile = false;
    } else if (/\bWindows\b/.test(n.userAgent)) {
      n.detect.os.name = "Windows";
      n.detect.os.Mobile = false;
    }
    if (n.detect.browser.engine) {
      n.detect.browser[n.detect.browser.engine] = true;
      document.documentElement.classList.add("browser-" + n.detect.browser.engine.toLowerCase());
    }
    if (n.detect.browser.name) {
      n.detect.browser[n.detect.browser.name] = true;
      document.documentElement.classList.add("browser-" + n.detect.browser.name.toLowerCase());
    }
    if (n.detect.os.name) {
      n.detect.os[n.detect.os.name] = true;
      document.documentElement.classList.add("os-" + n.detect.os.name.toLowerCase());
    }
    document.documentElement.classList.add(n.detect.os.Mobile ? "os-mobile" : "os-desktop");
  }
})(navigator);
