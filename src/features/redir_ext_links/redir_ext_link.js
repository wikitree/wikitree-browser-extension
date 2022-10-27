function updateAncestryOldFormatLink(linkText, options) {
  if (!options.ancestryOldLinks) {
    return linkText;
  }

  let newLink = linkText;

  const allDomains = "(com|co\\.uk|cs|com\\.au|de|it|fr|se|ms)";

  const oldLinkReplacements = [
    {
      from: `http://trees\\.ancestry\\.${allDomains}/rd\\?f=sse&`,
      to: "http://search.ancestry.$1/cgi-bin/sse.dll?",
    },
    {
      from: `https?://www\\.ancestry\\.${allDomains}/pt/PersonMatch\\.aspx\\?tid=(\\d{2,})&pid=([-]?\\d{6,})`,
      to: "https://www.ancestry.$1/family-tree/person/tree/$2/person/$3/facts",
    },
    {
      from: `https?://trees\\.ancestry\\.${allDomains}/pt/PersonMatch\\.aspx\\?tid=(\\d{2,})&pid=([-]?\\d{6,})`,
      to: "https://www.ancestry.$1/family-tree/person/tree/$2/person/$3/facts",
    },
    {
      from: `https?://trees\\.ancestry\\.${allDomains}/pt/AMTCitationRedir\\.aspx\\?tid=(\\d{2,})&pid=([-]?\\d{6,})`,
      to: "https://www.ancestry.$1/family-tree/person/tree/$2/person/$3/facts",
    },
    {
      from: `https?://www\\.ancestry\\.${allDomains}/pt/PersonMatch\\.aspx\\?tid=(\\d{2,})&pid=(\\d{0,5})`,
      to: "https://www.ancestry.$1/family-tree/tree/$2/family",
    },
    {
      from: `https?://trees\\.ancestry\\.${allDomains}/pt/PersonMatch\\.aspx\\?tid=(\\d{2,})&pid=(\\d{0,5})`,
      to: "https://www.ancestry.$1/family-tree/tree/$2/family",
    },
    {
      from: `https?://trees\\.ancestry\\.${allDomains}/pt/AMTCitationRedir\\.aspx\\?tid=(\\d{2,})&pid=(\\d{0,5})`,
      to: "https://www.ancestry.$1/family-tree/tree/$2/family",
    },
  ];

  for (let oldLinkReplacement of oldLinkReplacements) {
    const regex = new RegExp(oldLinkReplacement.from, "g");
    newLink = newLink.replace(regex, oldLinkReplacement.to);
  }

  return newLink;
}

function updateAncestryDomain(linkText, options) {
  if (options.ancestryDomain == "none" || !options.ancestryDomain) {
    return linkText;
  }

  let newLink = linkText;

  let newDomain = options.ancestryDomain;
  newLink = newLink.replace(/\:\/\/([^\.]+\.)ancestry\.[^/]+/, `://$1${newDomain}`);
  newLink = newLink.replace(/\:\/\/([^\.]+\.)ancestrylibrary\.[^/]+/, `://$1${newDomain}`);
  newLink = newLink.replace(/\:\/\/([^\.]+\.)ancestrylibraryedition\.[^/]+/, `://$1${newDomain}`);

  return newLink;
}

function updateAncestryLink(linkText, options) {
  let newLink = linkText;

  newLink = updateAncestryOldFormatLink(newLink, options);

  newLink = updateAncestryDomain(newLink, options);

  return newLink;
}

function updateFmpLink(linkText, options) {
  if (options.fmpDomain == "none") {
    return linkText;
  }

  let newLink = linkText;

  let newDomain = options.fmpDomain;
  newLink = newLink.replace(/\:\/\/([^\.]+\.)findmypast\.[^/]+/, `://$1${newDomain}`);

  return newLink;
}

// Given the text from an href return a new value depending on what options are set
// If no change is needed then undefined is returned to indicate that
function updateLink(linkText, options) {
  let newLink = linkText;

  if (newLink.search(/\:\/\/[^\.]+\.ancestry[\.\l]/) != -1) {
    newLink = updateAncestryLink(newLink, options);
  }

  if (newLink.search(/\:\/\/[^\.]+\.findmypast\./) != -1) {
    newLink = updateFmpLink(newLink, options);
  }

  if (newLink != linkText) {
    return newLink;
  }
}

export { updateLink };
