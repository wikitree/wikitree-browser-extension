function updateAncestryLink(linkText, options) {
  if (options.ancestryDomain == "none") {
    return;
  }

  let newLink = linkText;

  let newDomain = options.ancestryDomain;
  newLink = newLink.replace(/\:\/\/([^\.]+\.)ancestry\.[^/]+/, `://$1${newDomain}`);
  newLink = newLink.replace(/\:\/\/([^\.]+\.)ancestrylibrary\.[^/]+/, `://$1${newDomain}`);
  newLink = newLink.replace(/\:\/\/([^\.]+\.)ancestrylibraryedition\.[^/]+/, `://$1${newDomain}`);

  if (newLink != linkText) {
    return newLink;
  }
}

function updateFmpLink(linkText, options) {
  if (options.fmpDomain == "none") {
    return;
  }

  let newLink = linkText;

  let newDomain = options.fmpDomain;
  newLink = newLink.replace(/\:\/\/([^\.]+\.)findmypast\.[^/]+/, `://$1${newDomain}`);

  if (newLink != linkText) {
    return newLink;
  }
}

// Given the text from an href return a new value depending on what options are set
// If no change is needed then undefined is returned to indicate that
function updateLink(linkText, options) {
  let newLink = undefined;

  if (linkText.search(/\:\/\/[^\.]+\.ancestry[\.\l]/) != -1) {
    newLink = updateAncestryLink(linkText, options);
  }

  if (linkText.search(/\:\/\/[^\.]+\.findmypast\./) != -1) {
    newLink = updateFmpLink(linkText, options);
  }

  return newLink;
}

export { updateLink };
