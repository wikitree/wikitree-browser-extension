import $ from "jquery";

export function createChatBioHandlers({
  WBE_CHAT_APP_ID,
  CHAT_LAST_BIO_KEY,
  wtAPIProfileSearch,
  WikiTreeAPI,
  getProfilePersonInfo,
  getProfileRootPerson,
  setHighestZIndex,
  escapeHtml,
  setPopupPositionAndSize,
  showChatShaky,
  hideChatShaky,
  sanitizeHtmlForPopup,
  extractProfileBios,
  showBioListPopup,
  showTiledBioPopups,
  addBioButton,
  appendMessage,
  resolveToWTID,
  fetchProfilesForIds,
  fetchPeoplePaged,
  mapApiPersonToStandardRow,
  makeStandardProfileTable,
  resolveConnectionTargetPerson,
  hasAnyApiKey,
  buildRecentConversationForAi,
  getLastStructuredResult,
  getLastConnectionCandidates,
  findSpouseProfileIdsFromDOM,
  findChildrenProfileIdsFromDOM,
  findSiblingProfileIdsFromDOM,
  findParentProfileIdsFromDOM,
  setLastBioPopupState,
}) {
  async function showBioPopupForId(id, opts = { bioFormat: "both" }) {
    if (window.wbeSuppressAutoBioOpen) {
      try {
        appendMessage("assistant", "Could not load some biographies. Partial results may be shown.", {
          shouldPersist: false,
        });
      } catch (error) {
        /* ignore */
      }
      window.wbeSuppressAutoBioOpen = false;
      return;
    }
    if (!id) return;

    try {
      const resolved = await resolveToWTID(id);
      if (resolved) id = resolved;
    } catch (error) {
      /* ignore resolution failure and proceed with original id */
    }

    try {
      showChatShaky("Loading biography...");
      const [profile, status, page_name] = await WikiTreeAPI.getProfile(
        WBE_CHAT_APP_ID,
        id,
        "Bio,BioHtml,BioText,Biography,Name,RealName,Id",
        {
          bioFormat: opts.bioFormat,
          resolveRedirect: 1,
        }
      );
      console.debug("wbe: showBioPopupForId fetched profile", { id, status, page_name, profile });
      hideChatShaky();
      if (!profile || Object.keys(profile).length === 0) {
        console.info("wbe: showBioPopupForId - no profile data or private", { id, profile });
        appendMessage("assistant", "No profile data returned or profile is private.");
        return;
      }

      const { wikiBio, htmlBio } = extractProfileBios(profile);
      if (!wikiBio && !htmlBio) {
        console.info("wbe: showBioPopupForId - profile has no biography content", { id, profile });
        appendMessage("assistant", `No biography content found for ${profile?.Name || id}.`);
        return;
      }

      $("#wbe-bio-popup").remove();
      const popupWidth = Math.max(520, Math.floor(window.innerWidth * 0.85));
      const $popup = $(
        `<div id="wbe-bio-popup" class="wbe-popup chat-popup ui-draggable" style="display:block;width:${popupWidth}px;left:${Math.floor(
          (window.innerWidth - popupWidth) / 2
        )}px">
          <div class="chat-popup-header ui-draggable-handle">
            <strong>Biography: ${escapeHtml(profile.Name || id)}</strong>
            <div class="chat-popup-controls">
              <button type="button" class="small close-popup" aria-label="Close" title="Close">×</button>
            </div>
          </div>
          <div class="chat-popup-body chat-popup-body--columns">
            <div class="bio-column bio-column--wiki">
              <h4>Wiki Text</h4>
              <pre class="bio-wiki-pre">${escapeHtml(wikiBio || "(no wiki text returned)")}</pre>
            </div>
            <div class="bio-column">
              <h4>HTML</h4>
              <div class="bio-html-container">${sanitizeHtmlForPopup(htmlBio) || "<i>(no html returned)</i>"}</div>
            </div>
          </div>
        </div>`
      ).appendTo(document.body);
      setPopupPositionAndSize(
        $popup.get(0),
        Math.round((window.innerWidth - $popup.get(0).getBoundingClientRect().width) / 2),
        110
      );
      $popup.find(".close-popup").on("click", () => $popup.remove());
      setHighestZIndex($popup.get(0));
      $popup.draggable({
        handle: ".chat-popup-header",
        containment: "window",
        scroll: false,
        start: () => {
          $popup.get(0).style.right = "auto";
          $popup.get(0).style.transform = "none";
        },
      });
      $popup.resizable({ handles: "n,e,s,w,se,sw,ne,nw", minWidth: 520, minHeight: 260 });

      const canonicalId = profile?.Name || (profile?.Id != null ? String(profile.Id) : id);
      setLastBioPopupState({ id: canonicalId, profile });
      try {
        sessionStorage.setItem(CHAT_LAST_BIO_KEY, JSON.stringify({ id: canonicalId }));
      } catch (error) {
        /* ignore */
      }
      addBioButton();
    } catch (err) {
      hideChatShaky();
      hideChatShaky();
      console.error("Error loading profile:", err);
      try {
        const em = String(err?.message || err || "unknown error");
        appendMessage("assistant", `Failed to load biography: ${em}`);
      } catch (error) {
        appendMessage("assistant", "Failed to load biography.");
      }
    }
  }

  async function listSpousesForId(id) {
    if (!id) return;
    try {
      showChatShaky("Loading spouses...");
      const [profile] = await WikiTreeAPI.getProfile(WBE_CHAT_APP_ID, id, "Spouses,Name,RealName,Id", {
        getSpouses: 1,
        resolveRedirect: 1,
      });
      console.debug("wbe: listSpousesForId fetched profile", { id, profile });
      hideChatShaky();
      const spousesObj = profile?.Spouses || {};
      const spouses = Object.values(spousesObj || []).map((spouse) => ({
        wtid: spouse.Name,
        displayName: spouse.RealName || (spouse.Derived && spouse.Derived.ShortName) || spouse.Name,
      }));

      if (!spouses.length) {
        console.info("wbe: listSpousesForId - no spouses", { id, profile });
        appendMessage("assistant", `No spouses found for ${profile?.Name || id}.`);
        return;
      }

      if (spouses.length === 1) {
        showBioPopupForId(spouses[0].wtid);
        return;
      }

      $("#wbe-spouses-popup").remove();
      const popupWidth = Math.max(360, Math.floor(window.innerWidth * 0.4));
      const $popup = $(
        `<div id="wbe-spouses-popup" class="wbe-popup chat-popup ui-draggable" style="display:block;width:${popupWidth}px;left:${Math.floor(
          (window.innerWidth - popupWidth) / 2
        )}px">
          <div class="chat-popup-header ui-draggable-handle">
            <strong>Spouses of ${escapeHtml(profile?.Name || id)}</strong>
            <div class="chat-popup-controls">
              <button type="button" class="small close-popup" aria-label="Close" title="Close">×</button>
            </div>
          </div>
          <div class="chat-popup-body chat-popup-body--compact">
            <ul class="spouse-list">
              ${spouses
                .map(
                  (spouse) =>
                    `<li><span>${escapeHtml(spouse.displayName)} (${escapeHtml(
                      spouse.wtid
                    )})</span><button class="open-bio" data-wtid="${escapeHtml(spouse.wtid)}">Open Bio</button></li>`
                )
                .join("")}
            </ul>
          </div>
        </div>`
      ).appendTo(document.body);
      $popup.find(".close-popup").on("click", () => $popup.remove());
      $popup.find(".open-bio").on("click", async (event) => {
        const raw = $(event.currentTarget).attr("data-wtid");
        if (!raw) return;
        const resolved = await resolveToWTID(raw);
        if (resolved) showBioPopupForId(resolved);
      });
      setHighestZIndex($popup.get(0));
      $popup.draggable({ handle: ".chat-popup-header", containment: "window", scroll: false });
    } catch (err) {
      hideChatShaky();
      hideChatShaky();
      console.error("Error listing spouses:", err);
      try {
        const em = String(err?.message || err || "unknown error");
        appendMessage("assistant", `Failed to list spouses: ${em}`);
      } catch (error) {
        appendMessage("assistant", "Failed to list spouses.");
      }
    }
  }

  async function dumpProfileForId(id) {
    if (!id) return;
    try {
      showChatShaky("Fetching profile for debug...");
      const [profile, status, page_name] = await WikiTreeAPI.getProfile(
        WBE_CHAT_APP_ID,
        id,
        "Bio,BioHtml,BioText,Biography,Spouses,Name,RealName,Id",
        {
          bioFormat: "both",
          getSpouses: 1,
          resolveRedirect: 1,
        }
      );
      hideChatShaky();
      console.log("wbe: profile dump", { id, profile, status, page_name });
      const hasProfile = profile && Object.keys(profile).length > 0;
      const privacy = profile?.Privacy ?? null;
      const spouses = profile?.Spouses ? Object.keys(profile.Spouses).length : 0;
      console.info("wbe: dumpProfileForId result", { id, hasProfile, privacy, spouses });
      appendMessage("assistant", `Profile fetched: present=${hasProfile}, privacy=${privacy}, spouses=${spouses}.`, {
        shouldPersist: false,
      });
    } catch (err) {
      hideChatShaky();
      console.error("wbe: dumpProfileForId error", err);
      try {
        const em = String(err?.message || err || "unknown error");
        appendMessage("assistant", `Failed to fetch profile: ${em}`);
      } catch (error) {
        appendMessage("assistant", "Failed to fetch profile.");
      }
    }
  }

  async function showTiledViaApi(ids = []) {
    return showTiledBioPopups(ids, (toOpen) =>
      fetchProfilesForIds(toOpen, "Bio,BioHtml,BioText,Biography,Name,RealName,Id", {
        bioFormat: "both",
        resolveRedirect: 1,
      })
    );
  }

  async function handleOpenFromBioList(ids = []) {
    if (!Array.isArray(ids) || !ids.length) return;
    const toOpen = ids.slice(0, 12);
    try {
      if (toOpen.length === 1) {
        const raw = toOpen[0];
        const wtid = await resolveToWTID(raw);
        if (wtid) await showBioPopupForId(wtid).catch(() => {});
        return;
      }
      const resolved = [];
      for (const raw of toOpen) {
        try {
          const wtid = await resolveToWTID(raw);
          if (wtid) resolved.push(wtid);
        } catch (error) {
          console.warn("wbe: handleOpenFromBioList resolve failed", raw, error);
        }
      }
      if (resolved.length) {
        await showTiledViaApi(resolved);
      }
    } catch (error) {
      console.error("wbe: handleOpenFromBioList error", error);
    }
  }

  async function fetchSiblingIdsForId(id) {
    if (!id) return [];
    try {
      showChatShaky("Loading siblings...");
      try {
        const relatives = await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, id, "Id,Name,RealName", { getSiblings: 1 });
        const [peopleResult] = relatives || [];
        const profile = peopleResult?.person || {};
        const siblingsObj = profile?.Siblings || {};
        const siblings = Object.values(siblingsObj || [])
          .map((sibling) => sibling?.Name || (sibling?.Id ? String(sibling.Id) : null))
          .filter(Boolean);
        if (siblings.length) {
          hideChatShaky();
          return siblings;
        }
      } catch (error) {
        /* ignore and fall back to getProfile/DOM */
      }
      const [profile] = await WikiTreeAPI.getProfile(WBE_CHAT_APP_ID, id, "Siblings,Name,Id", {
        getSiblings: 1,
        resolveRedirect: 1,
      });
      hideChatShaky();
      const siblingsObj = profile?.Siblings || {};
      const siblings = Object.values(siblingsObj || [])
        .map((sibling) => sibling.Name)
        .filter(Boolean);
      if (siblings.length) return siblings;

      const domCandidates = findSiblingProfileIdsFromDOM();
      if (!domCandidates.length) return [];
      const profiles = await fetchProfilesForIds(domCandidates, "Name,Id", { resolveRedirect: 1 });
      return profiles.map((profileData, index) => (profileData ? domCandidates[index] : null)).filter(Boolean);
    } catch (err) {
      hideChatShaky();
      console.error("wbe: fetchSiblingIdsForId error", err);
      return [];
    }
  }

  async function fetchChildrenIdsForId(id) {
    if (!id) return [];
    try {
      showChatShaky("Loading children...");
      try {
        const relatives = await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, id, "Id,Name,RealName", { getChildren: 1 });
        const [peopleResult] = relatives || [];
        const profile = peopleResult?.person || {};
        const childrenObj = profile?.Children || {};
        const children = Object.values(childrenObj || [])
          .map((child) => child?.Name || (child?.Id ? String(child.Id) : null))
          .filter(Boolean);
        if (children.length) {
          hideChatShaky();
          return children;
        }
      } catch (error) {
        /* ignore and fall back to getProfile/DOM */
      }
      const [profile] = await WikiTreeAPI.getProfile(WBE_CHAT_APP_ID, id, "Children,Name,Id", {
        getChildren: 1,
        resolveRedirect: 1,
      });
      hideChatShaky();
      const childrenObj = profile?.Children || {};
      const children = Object.values(childrenObj || [])
        .map((child) => child.Name)
        .filter(Boolean);
      if (children.length) return children;

      const domCandidates = findChildrenProfileIdsFromDOM();
      if (!domCandidates.length) return [];
      const candidateProfiles = await fetchProfilesForIds(domCandidates, "Name,Id", { resolveRedirect: 1 });
      return candidateProfiles.map((profileData, index) => (profileData ? domCandidates[index] : null)).filter(Boolean);
    } catch (err) {
      hideChatShaky();
      console.error("wbe: fetchChildrenIdsForId error", err);
      return [];
    }
  }

  async function fetchParentIds(personKey) {
    try {
      const relatives = await WikiTreeAPI.getRelatives(WBE_CHAT_APP_ID, personKey, "Id,Name,RealName", {
        getParents: 1,
      });
      const [peopleResult] = relatives || [];
      const profile = peopleResult?.person || {};
      const parentsObj = profile?.Parents || {};
      const parentNames = Object.values(parentsObj || [])
        .map((parent) => parent?.Name || (parent?.Id ? String(parent.Id) : null))
        .filter(Boolean);
      if (parentNames.length) return parentNames;
    } catch (error) {
      /* ignore getRelatives errors and fall back */
    }

    try {
      const person = await WikiTreeAPI.getPerson("Chat", personKey, "Id,Name,Father,Mother");
      const parents = [person?.Father, person?.Mother].filter((id) => Number(id) > 0);
      if (parents.length) return parents;
    } catch (error) {
      /* ignore */
    }

    try {
      const domParents = findParentProfileIdsFromDOM();
      if (domParents && domParents.length) {
        const numericIds = [];
        for (const wtid of domParents) {
          try {
            const [profile] = await WikiTreeAPI.getProfile(WBE_CHAT_APP_ID, wtid, "Id,Name", { resolveRedirect: 1 });
            if (profile && Number(profile.Id) > 0) numericIds.push(Number(profile.Id));
          } catch (error) {
            /* ignore individual failures */
          }
        }
        if (numericIds.length) return numericIds;
        return domParents;
      }
    } catch (error) {
      /* ignore DOM fallback errors */
    }

    return [];
  }

  async function tryHandleSpouseBioIntent(params = {}, prompt = "") {
    const target = String(params?.target || "").trim();
    const bioFormat = String(params?.bioFormat || "both").toLowerCase();
    const allowLookup = params?.allowLookup !== undefined ? Boolean(params.allowLookup) : true;

    if (!target) {
      if (!allowLookup) {
        const reply = `I don't have the wife's name or bio from the single page context you gave (${
          getProfilePersonInfo()?.Name || "unknown"
        }). I can't invent or assume her profile.\n\nTell me one of these and I'll fetch and return her bio:\n- The wife's WikiTree profile ID or URL (for example: Surname-1234), or\n- Her full name as shown on ${
          getProfilePersonInfo()?.Name || "the profile"
        }, or\n- Permission to look up ${
          getProfilePersonInfo()?.Name || "the profile owner"
        } and fetch their spouse's bio.`;
        console.debug("wbe: tryHandleSpouseBioPrompt no targetRaw - asking user for clarification", {
          profileContext: getProfilePersonInfo()?.Name,
          reply,
        });
        return reply;
      }
      params.target = getProfileRootPerson()?.Name || "";
    }

    const resolved = await resolveConnectionTargetPerson(params.target || target, prompt);
    if (!resolved?.Name && !resolved?.Id) {
      return `I couldn't identify which profile you meant by "${params.target || target}".`;
    }

    const personKey = resolved.Id || resolved.Name;
    try {
      showChatShaky("Looking up spouse(s)...");
      const [profile] = await WikiTreeAPI.getProfile(WBE_CHAT_APP_ID, personKey, "", {
        getSpouses: 1,
        resolveRedirect: 1,
      });
      hideChatShaky();
      const spousesObj = profile?.Spouses || {};
      const spouses = Object.values(spousesObj || []);
      if (!spouses.length) {
        try {
          const domIds = findSpouseProfileIdsFromDOM();
          console.debug("wbe: tryHandleSpouseBioPrompt DOM fallback ids", { domIds });
          if (domIds && domIds.length) {
            if (domIds.length === 1) {
              const spouseId = domIds[0];
              try {
                showChatShaky("Loading spouse bio from page link...");
                const [spProfile] = await WikiTreeAPI.getProfile(
                  WBE_CHAT_APP_ID,
                  spouseId,
                  "Bio,BioHtml,BioText,Biography,Name,RealName,Id",
                  { bioFormat: "both", resolveRedirect: 1 }
                );
                hideChatShaky();
                console.debug("wbe: spouse profile fetched via DOM fallback", { spouseId, spProfile });
                const { wikiBio: domWiki } = extractProfileBios(spProfile);
                return {
                  message: `Biography for ${spProfile?.Name || spouseId}:`,
                  action: {
                    label: "Show Bio",
                    onClick: async () => {
                      const wtid = await resolveToWTID(spouseId);
                      showBioPopupForId(wtid).catch(() => {});
                    },
                  },
                  inlineMore: { text: domWiki },
                };
              } catch (err) {
                hideChatShaky();
                console.error("wbe: error fetching spouse profile via DOM fallback", err);
                return `Failed to fetch spouse profile found on the page (${spouseId}).`;
              }
            }
            return {
              message: `Found spouse links on the page for ${resolved.RealName || resolved.Name}. Click to open one.`,
              action: {
                label: "Spouses",
                onClick: () => {
                  listSpousesForId(resolved.Name);
                },
              },
            };
          }
        } catch (error) {
          console.error("wbe: DOM fallback error", error);
        }

        return `No spouse information found for ${resolved.RealName || resolved.Name} (${resolved.Name}).`;
      }
      if (spouses.length === 1) {
        const spouseId = spouses[0].Name;
        showChatShaky("Loading spouse bio...");
        const [spProfile] = await WikiTreeAPI.getProfile(
          WBE_CHAT_APP_ID,
          spouseId,
          "Bio,BioHtml,BioText,Biography,Name,RealName,Id",
          { bioFormat, resolveRedirect: 1 }
        );
        hideChatShaky();
        const wikiBio = spProfile?.Bio || spProfile?.BioText || spProfile?.Biography || "";
        return {
          message: `Biography for ${spProfile?.Name || spouseId}:`,
          action: {
            label: "Show Bio",
            onClick: async () => {
              const wtid = await resolveToWTID(spouseId);
              showBioPopupForId(wtid).catch(() => {});
            },
          },
          inlineMore: { text: wikiBio },
        };
      }
      const preview = spouses.map((spouse) => `- ${spouse.RealName || spouse.Name} (${spouse.Name})`).join("\n");
      return {
        message: `Multiple spouses found for ${resolved.RealName || resolved.Name}:\n${preview}`,
        action: { label: "Spouses", onClick: () => listSpousesForId(personKey) },
      };
    } catch (err) {
      hideChatShaky();
      console.error("wbe: tryHandleSpouseBioIntent error", err);
      return `Failed to lookup spouse information for ${resolved.RealName || resolved.Name}.`;
    }
  }

  async function tryHandlePersonBioPrompt(prompt) {
    console.info("wbe: tryHandlePersonBioPrompt called", { prompt });

    try {
      const detectCategoryEarly = (value) => {
        if (!value) return null;
        const str0 = String(value).trim();
        let match = str0.match(/["“”'‘’]([^"“”'‘’]+)["“”'‘’]\s+category/i);
        if (match) return match[1].trim();
        match = str0.match(/^\s*search\s+["“”'‘’]?(.*?)["“”'‘’]?\s+category\??$/i);
        if (match) return match[1].trim();
        match = str0.match(/\bcategory\s*[:\-]?\s*(.+)$/i);
        if (match) return match[1].trim();
        return null;
      };

      console.debug("wbe: early category detection start", { prompt });
      const earlyCategory = detectCategoryEarly(prompt);
      console.debug("wbe: early category detection result", { earlyCategory });
      if (earlyCategory) {
        showChatShaky(`Looking up category "${earlyCategory}" via WT+...`);
        try {
          let chosenCategory = earlyCategory.replace(/^\s*Search\s+[:\-]?\s*/i, "").trim();
          let catVal = chosenCategory.replace(/,\s+/g, "__");
          catVal = catVal.replace(/\s+/g, "_");
          const qb = `CategoryFull=${catVal}`;
          const encodedQ = encodeURIComponent(qb);
          console.debug("wbe: WT+ early CategoryFull", { earlyCategory, catVal, qb, encodedQ });

          console.debug("wbe: wtAPIProfileSearch calling", { qb, encodedQ });
          let resp;
          try {
            resp = await wtAPIProfileSearch("ChatCategory", encodedQ, { maxProfiles: 500 });
          } catch (apiErr) {
            console.debug("wbe: wtAPIProfileSearch threw", { qb, apiErr });
            hideChatShaky();
            return `WT+ profile search failed for Category:${chosenCategory}. Error: ${apiErr?.message || apiErr}`;
          }
          const profiles = resp?.response?.profiles || [];
          console.debug("wbe: wtAPIProfileSearch response", {
            found: resp?.response?.found,
            profilesLength: profiles.length,
          });
          if (!profiles.length) {
            console.debug("wbe: wtAPIProfileSearch returned no profiles for early category", { qb, resp });
            hideChatShaky();
            return `I couldn't find any profiles for Category:${chosenCategory} via WT+.`;
          }

          const uniqueIds = [...new Set(profiles.map((profile) => String(profile)))].slice(0, 200);
          showChatShaky(`Fetching ${uniqueIds.length} profiles...`);
          const fields =
            "FirstName,MiddleName,LastNameAtBirth,LastNameCurrent,RealName,BirthDate,BirthLocation,DeathDate,DeathLocation,Gender,Id,Name";
          const [, resultByKey, peopleData] = await WikiTreeAPI.getPeople(WBE_CHAT_APP_ID, uniqueIds, fields, {
            resolveRedirect: 1,
          });

          const people = uniqueIds
            .map((key) => WikiTreeAPI.lookupProfile(key, resultByKey, peopleData))
            .filter(Boolean);
          const rows = people.map((person) => mapApiPersonToStandardRow(person, { wtId: person?.Name }));

          const table = makeStandardProfileTable(`Category: ${chosenCategory}`, rows, [[0, "asc"]]);
          table.columns = (table.columns || []).filter(
            (column) => !["degrees", "spouse", "spouseList"].includes(column.key)
          );
          hideChatShaky();
          return {
            message: `Found ${rows.length} profiles in Category:${chosenCategory}`,
            table,
          };
        } catch (error) {
          hideChatShaky();
          console.debug("wbe: early category search failed", error);
          return `I couldn't complete the category lookup for "${earlyCategory}". Error: ${error?.message || error}`;
        }
      }
    } catch (err) {
      console.debug("wbe: early category detection error", err);
    }

    const str = String(prompt || "").trim();
    let targetRaw = null;
    let relationRaw = null;

    let match = str.match(/^\s*bio(?:graphy|s)?\s+of\s+(.+?)\??$/i) || str.match(/^\s*profile(?:s)?\s+of\s+(.+?)\??$/i);
    if (match) {
      targetRaw = (match[1] || "").trim();
      relationRaw = "self";
    }

    if (!targetRaw) {
      match = str.match(/^\s*([^']+?)'s\s+(.+?)\??$/i);
      if (match) {
        targetRaw = (match[1] || "").trim();
        let relPart = (match[2] || "").trim();
        relPart = relPart
          .replace(/\b's\b/g, "")
          .replace(/\b'\b/g, "")
          .replace(/[\?\.!,:;]*/g, "")
          .trim();
        const relMatch = relPart.match(/^([a-zA-Z]+s?)\b/i);
        if (relMatch) {
          relationRaw = (relMatch[1] || "").trim().toLowerCase();
        }
        if (!relationRaw && /\bbio(?:graphy|s)?\b/i.test(str)) {
          relationRaw = "self";
        }
      }
    }

    if (!targetRaw) {
      match = str.match(/^\s*(.+?)'s\s+bio(?:graphy|s)?\??$/i);
      if (match) {
        targetRaw = (match[1] || "").trim();
        relationRaw = "self";
      }
    }

    const relMap = {
      wife: "spouses",
      husband: "spouses",
      spouse: "spouses",
      spouses: "spouses",
      parent: "parents",
      parents: "parents",
      mother: "parents",
      father: "parents",
      child: "children",
      children: "children",
      son: "children",
      daughter: "children",
      sibling: "siblings",
      siblings: "siblings",
      brother: "siblings",
      sister: "siblings",
      self: "self",
    };

    const hasBioKeyword = /\b(bio|biography|profile|bios)\b/i.test(str);
    const isSupportedRelationPrompt = relationRaw && Object.prototype.hasOwnProperty.call(relMap, relationRaw);

    if (!targetRaw && !hasBioKeyword) {
      console.info("wbe: tryHandlePersonBioPrompt - pattern did not match and no bio keyword, ignoring", { prompt });
      return null;
    }

    if (targetRaw && !hasBioKeyword && !isSupportedRelationPrompt) {
      console.info("wbe: tryHandlePersonBioPrompt - possessive prompt is not a bio/family request, ignoring", {
        prompt,
        relationRaw,
      });
      return null;
    }

    console.info("wbe: tryHandlePersonBioPrompt parsed", { prompt, targetRaw, relationRaw });

    if (relationRaw && /(ancest|descend)/i.test(String(relationRaw))) {
      console.info("wbe: tryHandlePersonBioPrompt - ancestor/descendant relation detected, deferring to main router", {
        relationRaw,
      });
      return null;
    }

    const wantsBioPlural = /\bbios?\b/i.test(str) || /\bprofiles?\b/i.test(str);

    let resolved = null;
    if (targetRaw) resolved = await resolveConnectionTargetPerson(targetRaw, prompt);
    console.info("wbe: tryHandlePersonBioPrompt resolved target", { resolved });

    try {
      const needle = String(targetRaw || "")
        .trim()
        .toLowerCase();
      const lastStructuredResult = getLastStructuredResult();
      if (needle && lastStructuredResult?.rows?.length) {
        const tokenMatch = (text) => {
          if (!text) return false;
          const lower = String(text).toLowerCase();
          if (lower === needle) return true;
          if (lower.startsWith(`${needle} `) || lower.startsWith(needle)) return true;
          const parts = lower.split(/\s+/).filter(Boolean);
          return parts.includes(needle);
        };

        const pagePerson = getProfilePersonInfo();
        for (const row of lastStructuredResult.rows) {
          const candidateId = String(row.wtid || row.wtId || row.id || "").trim();
          if (pagePerson && candidateId && (candidateId === pagePerson.Name || candidateId === pagePerson.Id)) {
            continue;
          }
          const display = String(row.displayName || row.wtid || row.wtId || "").trim();
          const firstName = String(row.firstName || display.split(/\s+/)[0] || "").trim();
          if (
            tokenMatch(firstName) ||
            tokenMatch(display) ||
            tokenMatch(row.wtid) ||
            tokenMatch(row.wtId) ||
            tokenMatch(row.id)
          ) {
            resolved = { Name: candidateId || null, RealName: row.displayName || row.wtid };
            console.info("wbe: tryHandlePersonBioPrompt overridden by lastStructuredResult match", {
              resolved,
              needle,
            });
            break;
          }
        }
      }
    } catch (error) {
      /* ignore */
    }

    if (!resolved?.Name && !resolved?.Id) {
      try {
        const needle = String(targetRaw || "")
          .trim()
          .toLowerCase();
        const lastStructuredResult = getLastStructuredResult();
        if (lastStructuredResult?.rows?.length) {
          const pagePerson = getProfilePersonInfo();
          for (const row of lastStructuredResult.rows) {
            const candidateId = String(row.wtid || row.wtId || row.id || "").trim();
            if (pagePerson && candidateId && (candidateId === pagePerson.Name || candidateId === pagePerson.Id)) {
              continue;
            }
            const name = String(row.displayName || row.wtid || "").toLowerCase();
            if (name.startsWith(needle) || name === needle) {
              resolved = { Name: candidateId || null, RealName: row.displayName || row.wtid };
              console.info("wbe: tryHandlePersonBioPrompt resolved from lastStructuredResult", { resolved, needle });
              break;
            }
          }
        }
      } catch (error) {
        /* ignore */
      }
    }

    if (!resolved?.Name && !resolved?.Id) {
      try {
        const needle = String(targetRaw || "")
          .trim()
          .toLowerCase();
        const lastConnectionCandidates = getLastConnectionCandidates();
        if (needle && lastConnectionCandidates?.length) {
          const pagePerson = getProfilePersonInfo();
          for (const candidate of lastConnectionCandidates) {
            const candidateId = String(candidate?.Name || candidate?.wtid || candidate?.id || "").trim();
            if (pagePerson && candidateId && (candidateId === pagePerson.Name || candidateId === pagePerson.Id)) {
              continue;
            }
            const name = String(
              candidate?.RealName || candidate?.Derived?.ShortName || candidate?.Name || candidate?.displayName || ""
            ).toLowerCase();
            const first = String(candidate?.FirstName || name.split(/\s+/)[0] || "").toLowerCase();
            if (!name) continue;
            if (name === needle || name.startsWith(needle) || first === needle) {
              resolved = {
                Name: candidateId || null,
                RealName: candidate.RealName || candidate.displayName || candidate.Name,
              };
              console.info("wbe: tryHandlePersonBioPrompt resolved from lastConnectionCandidates", {
                resolved,
                needle,
              });
              break;
            }
          }
        }
      } catch (error) {
        /* ignore */
      }
    }

    if (!resolved?.Name && !resolved?.Id) {
      try {
        const needle = String(targetRaw || "")
          .trim()
          .toLowerCase();
        const domSpouseEls = Array.from(
          document.querySelectorAll(
            "a.spouseLink[href*='/wiki/'], a[itemprop=\"spouse\"][href*='/wiki/'], .spouseEntry a[href*='/wiki/']"
          )
        );
        const pagePerson = getProfilePersonInfo();
        for (const el of domSpouseEls) {
          const nameText = (el.textContent || "").trim();
          const realName = nameText || (el.querySelector(".spouse-name")?.textContent || "").trim();
          if (realName && realName.toLowerCase().startsWith(needle)) {
            const href = el.getAttribute("href") || "";
            const hrefMatch = href.match(/\/wiki\/([^#?/]+)/);
            const id = hrefMatch ? decodeURIComponent(hrefMatch[1]) : null;
            if (id) {
              if (pagePerson && (id === pagePerson.Name || id === pagePerson.Id)) {
                continue;
              }
              resolved = { Name: id, RealName: realName };
              console.info("wbe: tryHandlePersonBioPrompt resolved from DOM by name", { resolved, needle });
              break;
            }
          }
        }
      } catch (error) {
        /* ignore */
      }
    }

    if (!resolved?.Name && !resolved?.Id) {
      try {
        const hasKey = await hasAnyApiKey();
        if (hasKey) {
          showChatShaky("Asking AI to resolve the name...");
          const conversationContext = buildRecentConversationForAi();
          const candidates = [];
          const lastStructuredResult = getLastStructuredResult();
          if (lastStructuredResult?.rows?.length) {
            for (const row of lastStructuredResult.rows.slice(0, 50)) {
              candidates.push(`${row.displayName || row.wtid || ""} (ID: ${row.wtid || row.wtId || row.id || ""})`);
            }
          }
          const lastConnectionCandidates = getLastConnectionCandidates();
          if (lastConnectionCandidates?.length) {
            for (const candidate of lastConnectionCandidates.slice(0, 50)) {
              candidates.push(
                `${candidate.displayName || candidate.Name || candidate.name || ""} (ID: ${
                  candidate.Name || candidate.wtid || candidate.id || ""
                })`
              );
            }
          }
          const domEls = Array.from(
            document.querySelectorAll("a.spouseLink[href*='/wiki/'], .spouseEntry a[href*='/wiki/']")
          );
          for (const el of domEls.slice(0, 50)) {
            const href = el.getAttribute("href") || "";
            const hrefMatch = href.match(/\/wiki\/([^#?/]+)/);
            const id = hrefMatch ? decodeURIComponent(hrefMatch[1]) : null;
            const label = (el.textContent || "").trim();
            if (id && label) candidates.push(`${label} (ID: ${id})`);
          }

          const aiPrompt = [
            "You are given a short person name to match to a list of candidate WikiTree profiles.",
            candidates.length ? `Candidates:\n${candidates.join("\n")}` : "No explicit candidates available.",
            conversationContext ? `Recent conversation:\n${conversationContext}` : "",
            `Which candidate best matches the name \"${targetRaw}\"? Reply ONLY with the WikiTree ID (e.g. Name-123) or NO_ID if none match.`,
          ]
            .filter(Boolean)
            .join("\n\n");

          try {
            let aiResult = null;
            if (typeof window.callAiModel === "function") {
              aiResult = await window.callAiModel(aiPrompt);
            }
            if (aiResult) {
              const value = String(aiResult || "").trim();
              if (value && value !== "NO_ID") {
                resolved = { Name: value, RealName: targetRaw };
                console.info("wbe: tryHandlePersonBioPrompt resolved by AI", { resolved, aiText: aiResult });
              } else {
                console.info("wbe: tryHandlePersonBioPrompt AI returned NO_ID", { aiText: aiResult });
              }
            }
          } catch (error) {
            console.info("wbe: tryHandlePersonBioPrompt AI fallback failed", { error });
          }
          hideChatShaky();
        }
      } catch (error) {
        hideChatShaky();
      }
    }

    const personKey = resolved?.Id || resolved?.Name;
    let relationFetchFailedIds = [];
    try {
      if (!personKey) {
        return `I couldn't identify which profile you meant by "${targetRaw}". Try a WikiTree ID like Name-123, or a more specific name.`;
      }

      const mapped = relationRaw ? relMap[relationRaw.toLowerCase()] : null;
      const relationType = mapped || null;

      if (!relationType || relationType === "self") {
        showChatShaky("Loading biography...");
        try {
          const popup = document.getElementById("wbe-shaky-tree-popup");
          if (popup) setHighestZIndex(popup);
        } catch (error) {
          /* ignore */
        }
        console.info("wbe: tryHandlePersonBioPrompt fetching profile for self", { personKey });
        const [profile] = await WikiTreeAPI.getProfile(
          WBE_CHAT_APP_ID,
          personKey,
          "Bio,BioHtml,BioText,Biography,Name,RealName,Id",
          {
            bioFormat: "both",
            resolveRedirect: 1,
          }
        );
        hideChatShaky();
        if (!profile) return `No profile data found for ${personKey}.`;
        const result = {
          message: `Biography for ${profile?.Name || personKey}:`,
          action: {
            label: "Show Bio",
            onClick: async () => {
              const wtid = await resolveToWTID(profile?.Name || personKey);
              showBioPopupForId(wtid).catch(() => {});
            },
          },
          inlineMore: { text: profile?.Bio || profile?.BioText || null },
        };
        showBioPopupForId(profile?.Name || personKey).catch(() => {});
        return result;
      }

      let entries = [];
      if (relationType === "spouses") {
        showChatShaky("Looking up spouse(s)...");
        console.info("wbe: tryHandlePersonBioPrompt calling getRelatives for spouses", { personKey });
        const relativesResult = await WikiTreeAPI.getRelatives(
          WBE_CHAT_APP_ID,
          personKey,
          "Id,Name,RealName,Derived.ShortName,FirstName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,BirthLocation,DeathLocation,Gender",
          { getSpouses: 1 }
        );
        hideChatShaky();
        const [peopleResult] = relativesResult;
        const profile = peopleResult?.person || {};
        entries = Object.values(profile?.Spouses || {}).map((spouse) => ({
          wtid: spouse.Name,
          displayName: spouse.RealName || spouse.Name,
        }));
        if (!entries.length) {
          try {
            const domSpouseEls = Array.from(
              document.querySelectorAll(
                "a.spouseLink[href*='/wiki/'], a[itemprop=\"spouse\"][href*='/wiki/'], .spouseEntry a[href*='/wiki/']"
              )
            );
            const pagePerson = getProfilePersonInfo();
            const domSpouses = domSpouseEls
              .map((el) => {
                const href = el.getAttribute("href") || "";
                const hrefMatch = href.match(/\/wiki\/([^#?/]+)/);
                const id = hrefMatch ? decodeURIComponent(hrefMatch[1]) : null;
                const nameText = (el.textContent || "").trim();
                return id ? { wtid: id, displayName: nameText || id } : null;
              })
              .filter(Boolean)
              .filter((spouse) => {
                if (!spouse || !spouse.wtid) return false;
                if (pagePerson && (spouse.wtid === pagePerson.Name || spouse.wtid === pagePerson.Id)) return false;
                return true;
              });
            if (domSpouses.length) entries = domSpouses;
          } catch (error) {
            console.info("wbe: tryHandlePersonBioPrompt spouse DOM fallback failed", { error });
          }
        }
      } else if (relationType === "children") {
        const ids = await fetchChildrenIdsForId(personKey);
        if (ids && ids.length) {
          const failed = [];
          entries = [];
          const allNumeric = ids.every((value) => Number.isFinite(Number(value)) && Number(value) > 0);
          if (allNumeric && ids.length > 4) {
            const [, , peopleMap] = await fetchPeoplePaged(
              "Chat",
              ids,
              "Bio,BioHtml,BioText,Biography,Name,RealName,Id",
              {}
            );
            for (const id of ids) {
              const key = String(id);
              const person = peopleMap[key];
              if (person && Object.keys(person).length) {
                entries.push({ wtid: person.Name || id, displayName: person.RealName || person.Name || id });
              } else {
                failed.push(id);
              }
            }
          } else {
            const profiles = await fetchProfilesForIds(ids, "Bio,BioHtml,BioText,Biography,Name,RealName,Id", {
              bioFormat: "both",
              resolveRedirect: 1,
            });
            for (let index = 0; index < ids.length; index += 1) {
              const profile = profiles[index];
              if (profile && Object.keys(profile).length) {
                entries.push({
                  wtid: profile.Name || ids[index],
                  displayName: profile.RealName || profile.Name || ids[index],
                });
              } else {
                failed.push(ids[index]);
              }
            }
          }
          relationFetchFailedIds = failed.slice();
          if (!entries.length && failed.length) {
            return `Failed to load child profiles: ${failed.join(
              ", "
            )} - server errors or no data. No popups were opened.`;
          }
          if (relationFetchFailedIds.length) window.wbeSuppressAutoBioOpen = true;
        }
      } else if (relationType === "siblings") {
        const ids = await fetchSiblingIdsForId(personKey);
        if (ids && ids.length) {
          const failed = [];
          entries = [];
          const allNumeric = ids.every((value) => Number.isFinite(Number(value)) && Number(value) > 0);
          if (allNumeric) {
            const [, , peopleMap] = await fetchPeoplePaged(
              "Chat",
              ids,
              "Bio,BioHtml,BioText,Biography,Name,RealName,Id",
              {}
            );
            for (const id of ids) {
              const key = String(id);
              const person = peopleMap[key];
              if (person && Object.keys(person).length) {
                entries.push({ wtid: id, displayName: person.RealName || person.Name || id });
              } else {
                failed.push(id);
              }
            }
          } else {
            const profiles = await fetchProfilesForIds(ids, "Bio,BioHtml,BioText,Biography,Name,RealName,Id", {
              bioFormat: "both",
              resolveRedirect: 1,
            });
            for (let index = 0; index < ids.length; index += 1) {
              const profile = profiles[index];
              if (profile && Object.keys(profile).length) {
                entries.push({ wtid: ids[index], displayName: profile.RealName || profile.Name || ids[index] });
              } else {
                failed.push(ids[index]);
              }
            }
          }
          relationFetchFailedIds = failed.slice();
          if (!entries.length && failed.length) {
            return `Failed to load sibling profiles: ${failed.join(
              ", "
            )} - server errors or no data. No popups were opened.`;
          }
          if (relationFetchFailedIds.length) window.wbeSuppressAutoBioOpen = true;
        }
      } else if (relationType === "parents") {
        const ids = await fetchParentIds(personKey);
        if (ids && ids.length) {
          const failed = [];
          entries = [];
          const allNumeric = ids.every((value) => Number.isFinite(Number(value)) && Number(value) > 0);
          if (allNumeric) {
            const [, , peopleMap] = await fetchPeoplePaged(
              "Chat",
              ids,
              "Bio,BioHtml,BioText,Biography,Name,RealName,Id",
              {}
            );
            for (const id of ids) {
              const key = String(id);
              const person = peopleMap[key];
              if (person && Object.keys(person).length) {
                entries.push({ wtid: id, displayName: person.RealName || person.Name || id });
              } else {
                failed.push(id);
              }
            }
          } else {
            const profiles = await fetchProfilesForIds(ids, "Bio,BioHtml,BioText,Biography,Name,RealName,Id", {
              bioFormat: "both",
              resolveRedirect: 1,
            });
            for (let index = 0; index < ids.length; index += 1) {
              const profile = profiles[index];
              if (profile && Object.keys(profile).length) {
                entries.push({ wtid: ids[index], displayName: profile.RealName || profile.Name || ids[index] });
              } else {
                failed.push(ids[index]);
              }
            }
          }
          relationFetchFailedIds = failed.slice();
          if (!entries.length && failed.length) {
            return `Failed to load parent profiles: ${failed.join(
              ", "
            )} - server errors or no data. No popups were opened.`;
          }
          if (relationFetchFailedIds.length) window.wbeSuppressAutoBioOpen = true;
        }
      }

      if (!entries.length) {
        return `No ${relationType} information found for ${resolved?.RealName || resolved?.Name || personKey}.`;
      }

      if (entries.length === 1) {
        const singleId = entries[0].wtid;
        if (Array.isArray(relationFetchFailedIds) && relationFetchFailedIds.length) {
          showBioListPopup(
            `${relationType} for ${resolved?.RealName || resolved?.Name || personKey}`,
            entries.slice(0, 50),
            handleOpenFromBioList
          );
          return {
            message: `Found ${entries.length} ${relationType} for ${
              resolved?.RealName || resolved?.Name || personKey
            }, but some profiles failed to load (${relationFetchFailedIds.join(
              ", "
            )}). Open the list to view available entries.`,
            action: {
              label: "Open List",
              onClick: () =>
                showBioListPopup(
                  `${relationType} for ${resolved?.RealName || resolved?.Name || personKey}`,
                  entries.slice(0, 50),
                  handleOpenFromBioList
                ),
            },
          };
        }
        try {
          const resolvedWtid = await resolveToWTID(singleId);
          showBioPopupForId(resolvedWtid).catch(() => {});
          return {
            message: `Opened bio for ${entries[0].displayName || resolvedWtid}.`,
            action: {
              label: "Show Bio",
              onClick: async () => {
                const wtid = await resolveToWTID(singleId);
                showBioPopupForId(wtid).catch(() => {});
              },
            },
          };
        } catch (error) {
          return `Failed to open bio for ${entries[0].displayName || singleId}.`;
        }
      }

      if (wantsBioPlural) {
        const ids = entries.map((entry) => entry.wtid).filter(Boolean);
        try {
          showBioListPopup(
            `${relationType} bios for ${resolved?.RealName || resolved?.Name || personKey}`,
            entries.slice(0, 50),
            handleOpenFromBioList
          );
          await showTiledViaApi(ids.slice(0, 9));
          return {
            message: `Opened ${Math.min(ids.length, 9)} bios for ${resolved?.RealName || resolved?.Name || personKey}.`,
            action: {
              label: "Open List",
              onClick: () =>
                showBioListPopup(
                  `${relationType} bios for ${resolved?.RealName || resolved?.Name || personKey}`,
                  entries.slice(0, 50),
                  handleOpenFromBioList
                ),
            },
          };
        } catch (error) {
          console.error("wbe: tryHandlePersonBioPrompt failed to open tiled bios", error);
        }
      }

      showBioListPopup(
        `${relationType} for ${resolved?.RealName || resolved?.Name || personKey}`,
        entries.slice(0, 50),
        handleOpenFromBioList
      );
      return {
        message: `Found ${entries.length} ${relationType} for ${resolved?.RealName || resolved?.Name || personKey}.`,
        action: {
          label: "Open List",
          onClick: () =>
            showBioListPopup(
              `${relationType} for ${resolved?.RealName || resolved?.Name || personKey}`,
              entries.slice(0, 50),
              handleOpenFromBioList
            ),
        },
      };
    } catch (err) {
      hideChatShaky();
      console.error("wbe: tryHandlePersonBioPrompt error", err);
      return `Failed to lookup information for ${resolved?.RealName || resolved?.Name || targetRaw}.`;
    }
  }

  return {
    showBioPopupForId,
    listSpousesForId,
    dumpProfileForId,
    showTiledViaApi,
    handleOpenFromBioList,
    fetchSiblingIdsForId,
    fetchChildrenIdsForId,
    fetchParentIds,
    tryHandleSpouseBioIntent,
    tryHandlePersonBioPrompt,
  };
}
