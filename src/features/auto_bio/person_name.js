export class PersonName {
  static #emptySet = new Set();
  // The field names starting with Upper case are the part names the user specifies in wantedParts
  // The all lower case field names below are the internal names used for the different components
  // needed to construct the requested part. These components are extracted and constructed from
  // the various API fields.
  static #fieldMap = new Map([
    [
      "PedigreeName", // 'Prefix FirstName MiddleNames "Nicknames" (LastNameAtBirth) LastNameCurrent Suffix aka LastNameOther'
      {
        needs: new Set([
          "prefix",
          "firstName",
          "middleNames",
          "bracketedPreferredName",
          "quotedNicknames",
          "surname",
          "suffix",
          "otherLastNames",
        ]),
        supercedes: new Set([
          "FullName",
          "Prefix",
          "FirstName",
          "MiddleNames",
          "PreferredName",
          "Nicknames",
          "LastName",
          "LastNameAtBirth",
          "LastNameCurrent",
          "Suffix",
          "LastNameOther",
        ]),
      },
    ],
    [
      "FullName", //'Prefix FirstName MiddleNames (LastNameAtBirth) LastNameCurrent Suffix'
      {
        needs: new Set(["prefix", "firstName", "middleNames", "surname", "suffix"]),
        supercedes: new Set([
          "Prefix",
          "FirstName",
          "MiddleNames",
          "PreferredName",
          "LastName",
          "LastNameAtBirth",
          "LastNameCurrent",
          "Suffix",
        ]),
      },
    ],
    [
      "LastName", // LastNameCurrent if it exists, else LastNameAtBirth;
      {
        needs: new Set(["lastName"]),
        supercedes: new Set(["LastNameAtBirth", "LastNameCurrent"]),
      },
    ],
    [
      "LastNameCurrent", // the LastNameCurrent API field
      {
        needs: new Set(["lastNameCurrent"]),
        supercedes: PersonName.#emptySet,
      },
    ],
    [
      "LastNameAtBirth", // the lastNameAtBirth API field
      {
        needs: new Set(["lastNameAtBirth"]),
        supercedes: PersonName.#emptySet,
      },
    ],
    [
      "LastNameOther", // the LastNameOther API field
      {
        needs: new Set(["lastNameOther"]),
        supercedes: PersonName.#emptySet,
      },
    ],
    [
      "PreferredName", // the first name in the RealName API field if present, else the first name in the FirstName API field
      {
        needs: new Set(["preferredName"]),
        supercedes: PersonName.#emptySet,
      },
    ],
    [
      "FirstNames", // FirstName plus MiddleNames
      {
        needs: new Set(["firstNames"]),
        supercedes: new Set(["FirstName", "FullFirstName", "FirstInitial", "MiddleNames", "MiddleInitials"]),
      },
    ],
    [
      "FullFirstName", // the FirstName API field
      {
        needs: new Set(["fullFirstName"]),
        supercedes: new Set(["FirstName", "FirstInitial"]),
      },
    ],
    [
      "FirstName", // the first name in the FirstName API field if present, otherwise the first name in BirthNamePrivate
      {
        needs: new Set(["firstName"]),
        supercedes: new Set(["FirstInitial"]),
      },
    ],
    [
      "FirstInitial", // The first letter, capitalised, of FirstName
      {
        needs: new Set(["firstInitial"]),
        supercedes: PersonName.#emptySet,
      },
    ],
    [
      "MiddleNames", // all names other than any last name and the first name in FirstName
      {
        needs: new Set(["middleNames"]),
        supercedes: new Set(["MiddleName", "MiddleInitials"]),
      },
    ],
    [
      "MiddleName", // the MiddleName API field
      {
        needs: new Set(["middleName"]),
        supercedes: new Set(["MiddleInitials"]),
      },
    ],
    [
      "MiddleInitials", // The first letters, capitalised, space separated, of MiddleNames
      {
        needs: new Set(["middleInitials"]),
        supercedes: PersonName.#emptySet,
      },
    ],
    [
      "Nicknames",
      {
        needs: new Set(["nicknames"]),
        supercedes: PersonName.#emptySet,
      },
    ],
    [
      "Prefix",
      {
        needs: new Set(["prefix"]),
        supercedes: PersonName.#emptySet,
      },
    ],
    [
      "Suffix",
      {
        needs: new Set(["suffix"]),
        supercedes: PersonName.#emptySet,
      },
    ],
  ]);

  static #getWantsAndNeeds(wantedParts, forSingleName) {
    const partsWanted = new Set(wantedParts);
    const fieldsNeeded = new Set();

    // Remove superfluous parts if the result is only going to be used for a singe name
    if (forSingleName) {
      PersonName.#fieldMap.forEach((value, key) => {
        if (partsWanted.has(key)) {
          // if we have to use 'key', we don't have to also use its 'supercedes'
          for (const elem of value.supercedes) {
            partsWanted.delete(elem);
          }
        }
      });
    }

    // Map the wants parts to a standardised set of needed components
    partsWanted.forEach((w) => {
      const spec = PersonName.#fieldMap.get(w);
      if (spec) {
        for (const s of spec.needs) {
          fieldsNeeded.add(s);
        }
      }
    });
    return [partsWanted, fieldsNeeded];
  }

  static #getInvalidParts(wantedParts) {
    const invalidParts = [];
    for (const i in wantedParts) {
      if (!PersonName.#fieldMap.has(wantedParts[i])) {
        invalidParts.push(wantedParts[i]);
      }
    }
    return invalidParts;
  }

  /**
   * Construct a name with the given composition for this person.
   * @param {*} wantedParts The parts of the name to be used in the construction of the name.
   *    Possible part values are below. Note that the part value names do not always correspond with the API
   *    field name. Only the parts marked with (*) map directly to a single API field and will be used unadultered.
   *    If a part is part of other parts specified in wantedParts, it will be ignored.
   *    If a part is a combination of other parts in wantedParts, those other parts will be ignored.
   *    The order of the parts in the list is not important since their order in the name construction
   *    is predetermined (for now - this might have to change).
   *       * PedigreeName - 'Prefix FirstName MiddleNames (PreferredName) "Nicknames" (LastNameAtBirth) LastNameCurrent Suffix aka LastNameOther'.
   *       * FullName - 'Prefix FirstName MiddleNames (LastNameAtBirth) LastNameCurrent Suffix'.
   *       * LastName - LastNameCurrent if it exists, else LastNameAtBirth;
   *       * LastNameCurrent(*) - the LastNameCurrent API field
   *       * LastNameAtBirth(*) - the LastNameAtBirth API field
   *       * LastNameOther(*) - the LastNameOther API field
   *       * FirstName - the first name in the FirstName API field if present, otherwise the first name in BirthNamePrivate
   *       * FirstNames - FirstName plus MiddleNames
   *       * FullFirstName(*) - the FirstName API field
   *       * PreferredName - the first name in the RealName API field if present, else the first name in the FirstName API field
   *       * FirstInitial - The first letter, capitalised, of FirstName above
   *       * MiddleName(*) - the MiddleName API field
   *       * MiddleNames - all names other than any last name and the first name in FirstName
   *       * MiddleInitials - The first letters, capitalised, space separated, of MiddleNames
   *       * Nicknames(*) - the Nicknames API field
   *       * Prefix(*) - the Prefix API field
   *       * Suffix(*) - the Suffix API field
   * @returns a name constructed as requested. If a part is specified, but it, or its constituent parts are not
   * present in the profile, it will be ignored.
   */
  withParts(wantedParts) {
    const invalidParts = PersonName.#getInvalidParts(wantedParts);
    if (invalidParts.length > 0) {
      return `Invalid name part(s) ${invalidParts} requested`;
    }
    const [partsWanted, fieldsNeeded] = PersonName.#getWantsAndNeeds(wantedParts, true);

    const parts = [
      fieldsNeeded.has("prefix") ? this.prefix || null : null,
      fieldsNeeded.has("firstInitial") ? this.firstInitial || null : null,
      fieldsNeeded.has("firstName") ? this.firstName || null : null,
      fieldsNeeded.has("firstNames") ? this.firstNames || null : null,
      fieldsNeeded.has("fullFirstName") ? this.fullFirstName || null : null,
      fieldsNeeded.has("middleInitials") ? this.middleInitials || null : null,
      fieldsNeeded.has("middleName") ? this.middleName || null : null,
      fieldsNeeded.has("middleNames") ? this.middleNames || null : null,
      fieldsNeeded.has("preferredName") ? this.preferredName || null : null,
      fieldsNeeded.has("bracketedPreferredName") ? this.bracketedPreferredName || null : null,
      fieldsNeeded.has("nicknames") && this.nicknames ? `<span class="nickname">${this.nicknames}</span>` : null,
      fieldsNeeded.has("quotedNicknames") && this.nicknames
        ? `<span class="nickname">"${this.nicknames}"</span>`
        : null,
      this.#formSurname(partsWanted),
      fieldsNeeded.has("suffix") ? this.suffix || null : null,
      fieldsNeeded.has("otherLastNames") ? this.otherLastNames || null : null,
      fieldsNeeded.has("lastNameOther") ? this.lastNameOther || null : null,
    ];
    return parts.filter((part) => part !== null).join(" ");
  }

  /**
   * Form a name based on a template string with placeholders.
   * @param {*} template A string with placeholders, specifying the name parts to use,
   *     e.g. "He is [FullName], better known as [PreferredName], but also as [Nicknames]."
   */
  withFormat(template) {
    const partsWanted = new Set();
    for (const part of PersonName.#fieldMap.keys()) {
      if (template.includes(`[${part}]`)) {
        partsWanted.add(part);
      }
    }
    const invalidParts = PersonName.#getInvalidParts(partsWanted);
    for (const part of invalidParts) {
      partsWanted.delete(part);
    }
    const parts = this.getParts(partsWanted);

    let result = template;
    for (const [part, value] of parts.entries()) {
      result = result.replaceAll(`[${part}]`, value);
    }
    return result;
  }

  /**
   * Obtain the given name parts for this person.
   * @param {*} wantedParts see withParts
   * @returns a Map of partName => String for every requested part.
   */
  getParts(wantedParts) {
    const invalidParts = PersonName.#getInvalidParts(wantedParts);
    if (invalidParts.length > 0) {
      return `Invalid name part(s) ${invalidParts} requested`;
    }
    const [partsWanted, fieldsNeeded] = PersonName.#getWantsAndNeeds(wantedParts, false);

    const self = this;
    const result = new Map();
    for (const want of partsWanted) {
      result.set(want, getNamePart(PersonName.#fieldMap.get(want).needs));
    }

    return result;

    function getNamePart(theNeed) {
      const parts = [
        theNeed.has("prefix") ? self.prefix || null : null,
        theNeed.has("firstInitial") ? self.firstInitial || null : null,
        theNeed.has("firstName") ? self.firstName || null : null,
        theNeed.has("firstNames") ? self.firstNames || null : null,
        theNeed.has("fullFirstName") ? self.fullFirstName || null : null,
        theNeed.has("middleInitials") ? self.middleInitials || null : null,
        theNeed.has("middleName") ? self.middleName || null : null,
        theNeed.has("middleNames") ? self.middleNames || null : null,
        theNeed.has("preferredName") ? self.preferredName || null : null,
        theNeed.has("bracketedPreferredName") ? self.bracketedPreferredName || null : null,
        theNeed.has("nicknames") ? self.nicknames || null : null,
        theNeed.has("quotedNicknames") && self.nicknames ? `"${self.nicknames}"` : null,
        theNeed.has("surname") ? self.#formSurname(partsWanted) || null : null,
        theNeed.has("lastName") ? self.lastName || null : null,
        theNeed.has("lastNameAtBirth") ? self.lastNameAtBirth || null : null,
        theNeed.has("lastNameCurrent") ? self.lastNameCurrent || null : null,
        theNeed.has("suffix") ? self.suffix || null : null,
        theNeed.has("otherLastNames") ? self.otherLastNames || null : null,
        theNeed.has("lastNameOther") ? self.lastNameOther || null : null,
      ];
      return parts.filter((part) => part !== null).join(" ");
    }
  }

  #formSurname(wanted) {
    let surname = null;
    if (
      wanted.has("FullName") ||
      wanted.has("PedigreeName") ||
      (wanted.has("LastNameAtBirth") && wanted.has("LastNameCurrent"))
    ) {
      let lnc = this.lastNameCurrent || null;
      let lnb = this.lastNameAtBirth || null;
      surname = lnc == lnb ? lnb || null : (lnb ? `(${lnb}) ` : null) + lnc;
    } else if (wanted.has("LastNameAtBirth")) {
      surname = this.lastNameAtBirth || null;
    } else if (wanted.has("LastNameCurrent")) {
      surname = this.lastNameCurrent || null;
    } else if (wanted.has("LastName")) {
      surname = this.lastName;
    }
    return surname;
  }

  /**
   * The best results will be obtained if the following set of fields are requested in the API call
   * when obtaining the profile data (personData). These are the requested fields, not all these fields
   * will necessarily be in the data returned from the API, but that should be OK.
   *   Id, Name, FirstName, LastNameCurrent, LastNameAtBirth, LastNameOther, Suffix, Prefix, Derived.BirthName,
   *   Derived.BirthNamePrivate, MiddleName, MiddleInitial, RealName, Nicknames
   * @param {*} personData The JSON data obtained for a profile via the WikiTree API
   */
  constructor(personData) {
    // Construct the set of internal components from which the name will be put together.

    // last name (surname)
    this.lastNameAtBirth = personData.LastNameAtBirth;
    this.lastNameCurrent = personData.LastNameCurrent;
    this.lastName = this.lastNameCurrent ? this.lastNameCurrent : this.lastNameAtBirth || null;

    // We prefer to go through this rigmarole rather than using the name fields directly in order to cater for
    // the case of private profiles that return minimal fields.  The below results in something decent for them
    // and still gives the expected results for pubic profiles
    let nameToSplit;
    this.birthName = personData.BirthName || personData.BirthNamePrivate;
    if (this.birthName) {
      const hasSuffix = personData.Suffix && personData.Suffix.length > 0;
      nameToSplit = this.birthName;
      if (hasSuffix) {
        // Remove the suffix from birthName so we can split it into the other names
        const idx = this.birthName.lastIndexOf(personData.Suffix);
        if (idx > 0) {
          nameToSplit = nameToSplit.substring(0, idx - 1);
        }
      }
      // Remove lastNameAtBirth from nameToSplit so we can split the result into the other names
      const idx = this.birthName.lastIndexOf(this.lastNameAtBirth);
      if (idx > 0) {
        nameToSplit = nameToSplit.substring(0, idx - 1);
      }
    } else {
      console.log(
        "Fields BirthName and/or BirthNamePrivate are not present in the profile data " +
          "(i.e. Derived.BirthName and/or Derived.BirthNamePrivate were not requested via the API) " +
          `therefore name construction for ${personData.Name || personData.id} might be less than optimal`
      );
      nameToSplit = (personData.FirstName || "") + " " + (personData.MiddleName || "");
      if (nameToSplit == " ") {
        nameToSplit = personData.preferredName || personData.RealName || "";
      }
    }

    const firstNamesParts = nameToSplit.split(" ");

    this.firstName = firstNamesParts[0];
    this.preferredName = this.firstName;
    this.firstNames = firstNamesParts.join(" ");
    this.fullFirstName = personData.FirstName;
    this.firstInitial = this.firstName.substring(0, 1).toUpperCase();
    if (personData.RealName) {
      this.preferredName = personData.RealName.split(" ")[0];
    }
    if (this.preferredName && this.preferredName != nameToSplit) {
      this.bracketedPreferredName = `(${this.preferredName})`;
    }

    this.middleName = personData.MiddleName;
    this.middleNames = firstNamesParts.slice(1).join(" ");
    this.middleInitials = firstNamesParts
      .slice(1)
      .map((item) => item.substring(0, 1).toUpperCase())
      .join(" ");

    this.nicknames = personData.Nicknames;

    this.lastNameOther = personData.LastNameOther;
    if (this.lastNameOther) {
      this.otherLastNames = `aka ${this.lastNameOther.split(",").join(" or ")}`;
    }
    this.prefix = personData.Prefix;
    this.suffix = personData.Suffix;
  }

  wants(field) {
    return this.wanted.has(field);
  }
  needs(field) {
    return this.fieldsNeeded.has(field);
  }
}
