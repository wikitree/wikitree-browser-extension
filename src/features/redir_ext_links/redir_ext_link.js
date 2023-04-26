/*
Created By: Rob Pavey (Pavey-429)
*/

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

function updateAncestryRakutenLink(link, options) {
  if (options.ancestryDomain == "none" || !options.ancestryDomain) {
    return link;
  }

  // NOTE: Ancestry switched from Partnerize to Rakuten on 18 Apr 2023. Partnerize used the
  // "prf.hn" format, Rakuten uses this new click.linksynergy format.
  // And example link in this format:
  // https://click.linksynergy.com/deeplink?id=Xib7NfnK11s&amp;mid=50138&amp;murl=https%3A%2F%2Fsearch.ancestry.com%2Fcgi-bin%2Fsse.dll%3Findiv%3D1%26db%3D61596%26h%3D8900762
  let linkStartText = "https%3A%2F%2Fsearch.ancestry";
  let realLinkIndex = link.indexOf(linkStartText);
  if (realLinkIndex == -1) {
    linkStartText = "https%3A%2F%2Fwww.ancestry";
    realLinkIndex = link.indexOf(linkStartText);
  }
  //console.log("openAncestryLink, realLinkIndex is: " + realLinkIndex);
  if (realLinkIndex != -1) {
    let domainEndIndex = link.indexOf("%2F", realLinkIndex + linkStartText.length);
    if (domainEndIndex != -1) {
      let linkStart = link.substring(realLinkIndex, domainEndIndex);
      // linkStart = https%3A%2F%2Fsearch.ancestry.com for example
      let ancestryStartIndex = linkStart.indexOf("ancestry");
      if (ancestryStartIndex != -1) {
        let domain = linkStart.substring(ancestryStartIndex);
        //console.log("openAncestryLink, domain is: " + domain);

        let desiredDomain = options.ancestryDomain;
        //console.log("openAncestryLink, desiredDomain is: " + desiredDomain);

        if (desiredDomain != domain) {
          // we want to change the link, first decide if we are changing to a domain supported by
          // the Rakuten links
          const rukutenSupportedDomains = [
            { domain: "ancestry.com", mid: "50138" },
            { domain: "ancestry.co.uk", mid: "50140" },
            { domain: "ancestry.ca", mid: "50139" },
            { domain: "ancestry.com.au", mid: "50142" },
          ];
          let mid = "";
          for (let entry of rukutenSupportedDomains) {
            if (entry.domain == desiredDomain) {
              mid = entry.mid;
              break;
            }
          }
          if (mid) {
            // it is a supported domain to modify the mid and domain in link
            let newLink = link.replace(domain, desiredDomain);
            if (newLink && newLink != link) {
              link = newLink;
              //console.log("openAncestryLink, new link is: " + newLink);
            }
            newLink = link.replace(/([&;])mid=\d+/, "$1mid=" + mid);
            if (newLink && newLink != link) {
              link = newLink;
              //console.log("openAncestryLink, new link is: " + newLink);
            }
          } else {
            // not one of the supported domains - change to a non-referral link
            let encodedPlainLink = link.substring(realLinkIndex);
            //console.log("openAncestryLink, encodedPlainLink is: " + encodedPlainLink);
            let plainLink = decodeURIComponent(encodedPlainLink);
            //console.log("openAncestryLink, plainLink is: " + plainLink);
            let newLink = plainLink.replace(domain, desiredDomain);
            if (newLink && newLink != plainLink) {
              link = newLink;
              //console.log("openAncestryLink, new link is: " + newLink);
            }
          }
        }
      }
    }
  }

  return link;
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

  if (newLink.search(/\:\/\/[^\.]+\.linksynergy\./) != -1 && newLink.search(/\.ancestry[\.l]/) != -1) {
    newLink = updateAncestryRakutenLink(newLink, options);
  } else if (newLink.search(/\:\/\/[^\.]+\.ancestry[\.\l]/) != -1) {
    newLink = updateAncestryLink(newLink, options);
  } else if (newLink.search(/\:\/\/[^\.]+\.findmypast\./) != -1) {
    newLink = updateFmpLink(newLink, options);
  }

  if (newLink != linkText) {
    return newLink;
  }
}

export { updateLink };
