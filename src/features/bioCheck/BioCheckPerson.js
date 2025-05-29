/*
The MIT License (MIT)

Copyright (c) 2025 Kathryn J Knight

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/* **********************************************************************************
 * *****************************    WARNING    **************************************
 *
 * This class is used in the BioCheck app, in the WikiTree Dynamic Tree and in the 
 * WikiTree Browser Extension. Ensure that any changes do not bring in components 
 * that are not supported in each of these environments.
 *
 * **********************************************************************************
 * ******************************************************************************** */

/**
 * Contains information about a WikiTree Profile.
 * Could be a profile obtained via the API in the app
 * or could be a profile in the WikiTree Browser Extension.
 * Only contains a subset of the complete set of data available.
 * Expects the profile to contain the following fields from the API:
 * Id,Name,IsLiving,Privacy,Manager,IsMember,
 * BirthDate,DeathDate,BirthDateDecade,DeathDateDecade,
 * FirstName,RealName,LastNameCurrent,LastNameAtBirth,Mother,Father,DataStatus,Bio
 */
export class BioCheckPerson {

  #birthDate = null;  // as a Date object
  #deathDate = null;  // as a Date object
  #lastDateCheckedEmpty =  false; // HACK
  #birthDateString = ""; // birth date string as from WikiTree API
  #deathDateString = ""; // death date string as from WikiTree API
  #hasBirthDate = true;
  #hasDeathDate = true;
  #oneYearAgo = null;
  #isPre1700 = false;
  #isPre1500 = false;
  #tooOldToRemember = false;

  person = {
    profileId: 0,
    wikiTreeId: "",
    managerId: 0,
    firstName: "", // name for reporting
    lastName: "", // name for reporting if there is current use that else LNAB
    hasBio: false,
    bio: "",
    hasName: false,
    privacyLevel: 0,
    isMember: false,
    isOrphan: false,
    uncheckedDueToPrivacy: false,
    uncheckedDueToDate: false,
    fatherDnaConfirmed: false,
    motherDnaConfirmed: false,
  };

  static TOO_OLD_TO_REMEMBER_DEATH = 100;
  static TOO_OLD_TO_REMEMBER_BIRTH = 150;
  static MIN_PRIVACY = 40;
  static OPEN_PRIVACY = 60;
  static CONF_WITH_DNA_STATUS = "30";

  /**
   * constructor
   */
  constructor() {
  }

  /**
   * Build person from WikiTree API profile object
   * and determine if it can be used to check sources and style
   * This method is used from an app, either on app server or tree tools
   * @param {Object} profileObj containing the profile as returned from WikiTree APIs
   * @param {Boolean} mustBeOpen true if profile must be open privacy
   * @param {Boolean} mustBeOpen true if profile must not have a manager
   * @param {Boolean} ignorePre1500 true to ignore Pre1500 profiles
   * @param {String} userId wikiTreeId of the person running the app
   * @returns {Boolean} true if this person can be checked
   */
  canUse(profileObj, mustBeOpen, mustBeOrphan, ignorePre1500, userId) {
    let canUseThis = false;
    canUseThis = true;
    if (profileObj.BirthDate != null) {
      this.#birthDateString = profileObj.BirthDate;
      this.#birthDate = this.#getDateFromString(this.#birthDateString);
    } else {
      if (profileObj.BirthDateDecade != null) {
        this.#birthDateString = profileObj.BirthDateDecade.slice(0, -1);
        this.#birthDate = this.#getDateFromString(this.#birthDateString);
      }
    }
    if (this.#lastDateCheckedEmpty) {
      this.#hasBirthDate = false;
    }
    if (profileObj.DeathDate != null) {
      this.#deathDateString = profileObj.DeathDate;
      this.#deathDate = this.#getDateFromString(this.#deathDateString);
    } else {
      if (profileObj.DeathDateDecade != null) {
        this.#deathDateString = profileObj.DeathDateDecade.slice(0, -1);
        this.#deathDate = this.#getDateFromString(this.#deathDateString);
      }
    }
    if (this.#lastDateCheckedEmpty) {
      this.#hasDeathDate = false;
    }
    // Go ahead and see if pre1500, pre1700 or too old
    this.#checkEarlyDates();

    this.person.profileId = profileObj.Id;
    this.person.firstName = "";
    this.person.lastName = "";
    this.person.bio = "";
    // Even if something returned, we can't process it without a Name
    if (profileObj.Name != null) {
      this.person.wikiTreeId = profileObj.Name;
      this.person.hasName = true;
      if (profileObj.Manager != null) {
        this.person.managerId = profileObj.Manager;
      }
      if (profileObj.Privacy != null) {
        this.person.privacyLevel = profileObj.Privacy;
      }
      if (profileObj.IsMember != null) {
        if (profileObj.IsMember === 1) {
          this.person.isMember = true;
        }
      }
      if (profileObj.FirstName != null) {
        this.person.firstName = profileObj.FirstName;
      } else {
      if (profileObj.RealName != null) {
          this.person.firstName = profileObj.RealName;
        }
      }
      if (profileObj.LastNameCurrent != null) {
        this.person.lastName = profileObj.LastNameCurrent;
      } else {
        if (profileObj.LastNameAtBirth != null) {
            this.person.lastName = profileObj.LastNameAtBirth;
        }
      }
      if (profileObj.DataStatus != null) { 
        if (profileObj.DataStatus.Father != null) {
          if (profileObj.DataStatus.Father == BioCheckPerson.CONF_WITH_DNA_STATUS) {
            this.person.fatherDnaConfirmed = true;
          }
        }
        if (profileObj.DataStatus.Mother != null) {
          if (profileObj.DataStatus.Mother == BioCheckPerson.CONF_WITH_DNA_STATUS) {
            this.person.motherDnaConfirmed = true;
          }
        }
      }
      // can use if logged in user is the same as Manager
      if (this.person.privacyLevel < BioCheckPerson.MIN_PRIVACY) {
        if (userId === 0) {
          canUseThis = false; // user not logged in
        } else {
          if (this.person.managerId !== userId) {
            canUseThis = false;
          }
        }
      }
      if (profileObj.bio == null) {
        canUseThis = false;
      }
      if ((profileObj.Manager !== null) && (profileObj.Manager === 0)) {
        this.person.isOrphan = true;
      }
      if (mustBeOrphan && !this.person.isOrphan) {
        canUseThis = false;
      }

      // Do not check the profile for a member
      // TODO not sure that you want to do this, need team guidance
      /*
      if (this.person.isMember) {
        canUseThis = false;
      }
      */
      if (mustBeOpen && this.person.privacyLevel < BioCheckPerson.OPEN_PRIVACY) {
        canUseThis = false;
      }
      if (!canUseThis) {
        this.person.uncheckedDueToPrivacy = true;
      } else {
        // check for birth/death date before 1500
        if (ignorePre1500 && this.#isPre1500) {
          canUseThis = false;
          this.person.uncheckedDueToDate = true;
        }
      }
      // Don't bother with REDIRECT unless you can use the profile anyway
      if (canUseThis && (profileObj.bio != null)) {
        this.person.bio = profileObj.bio;
        this.person.hasBio = true;
        // TODO this is a HACK 
        // to see if resolveRedirect was not honored by the API
        // look for a bio content that starts with 
        // and if so set hasBio false to force a call to the getBio API
        if (profileObj.bio.startsWith('#REDIRECT')) {
          console.log('BioCheck biography starts with #REDIRECT for profile Id ' + profileObj.Id);
          this.person.hasBio = false;
        }
      }
    } else {
      // this might be a living person or a deleted account or a space page
      canUseThis = false;
    }
    return canUseThis;
  }

  /**
   * Does this person have a bio
   * @returns {Boolean} true if person has bio
   */
  hasBio() {
    return this.person.hasBio;
  }
  /**
   * Get bio string for this person
   * @returns {String} bio string
   */
  getBio() {
    return this.person.bio;
  }
  /**
   * Clear bio for this person
   * to allow for garbage collection
   */
  clearBio() {
    this.person.bio = "";
  }
  /**
   * Get wikiTreeId for the person
   * @returns {String} wikiTreeId (e.g., Doe-100)
   */
  getWikiTreeId() {
    return this.person.wikiTreeId;
  }
  /**
   * Get profileId for the person
   * @returns {String} profileId (e.g., 12345678)
   */
  getProfileId() {
    return this.person.profileId;
  }
  /**
   * Get name to report
   * @returns {String} string with first and last name
   */
  getReportName() {
    let reportName = this.person.firstName + " " + this.person.lastName;
    return reportName;
  }
  /**
   * Get manager Id for the person
   * @returns {String} manager Id
   */
  getManagerId() {
    return this.person.managerId;
  }
  /** 
   * Is profile for a member
   * @returns {Boolean} true if profile for a member
   */
  isMember() {
    return this.person.isMember;
  }

  /** 
   * Is profile an orphan
   * @returns {Boolean} true if profile is an orphan
   */
  isOrphan() {
    return this.person.isOrphan;
  }

  /**
   * Get the privacy
   * @returns {Number} numeric privacy level
   */
  getPrivacy() {
    return this.person.privacyLevel;
  }
  /**
   * Get the privacy as a string to be displayed to the user
   * @returns {String} privacy string (i.e., the color)
   */
  getPrivacyString() {
    let privacyString = "";
    switch (this.person.privacyLevel) {
      case 0: // Not returned by API
        privacyString = "Unknown";
        break;
      case 10: // Unlisted
        privacyString = "Black";
        break;
      case 20: // Private
        privacyString = "Red";
        break;
      case 30: // Private, Public Bio
        privacyString = "Orange";
        break;
      case 35: // Private, Public Tree
        privacyString = "Light Orange";
        break;
      case 40: // Private, Public Bio & Tree
        privacyString = "Yellow";
        break;
      case 50: // Public
        privacyString = "Green";
        break;
      case 60: // Open
        privacyString = " ";
        break;
    }
    return privacyString;
  }
  /**
   * Was profile not checked due to privacy
   * @returns {Boolean} true if profile could not be checked due to privacy
   */
  isUncheckedDueToPrivacy() {
    return this.person.uncheckedDueToPrivacy;
  }
  /**
   * Was profile not checked due to date
   * @returns {Boolean} true if profile could not be checked due to date
   */
  isUncheckedDueToDate() {
    return this.person.uncheckedDueToDate;
  }

  /**
   * Initalize person for browser extension.
   * This method should only be used from the Browser Extension
   * Uses fields from the web page including mBirthDate, mDeathDate,
   * mStatusFather, mStatusMother
   */
  build() {

    let bDay = document.getElementById("mBirthDate").value;
    let dDay = document.getElementById("mDeathDate").value;
    this.#birthDate = null;
    this.#deathDate = null;
    // the API returns date string in the form yyyy-mon-dd
    // the edit page document element is in the form yyyy mon dd
    // well the edit page tells the user to use one of the forms
    //   yyyy-mm-dd
    //   dd mon yyyy
    //   mon dd, yyyy
    // or maybe just whatever is entered by the user?
    // test example is day month year
    // can the edit page document element be in a different form?
    if (bDay != null && bDay.length > 0) {
      this.#birthDateString = bDay;
      this.#birthDate = this.#getDateFromString(this.#birthDateString);
    } else {
      this.#hasBirthDate = false;
    }
    if (this.#lastDateCheckedEmpty) {
      this.#hasBirthDate = false;
    }
    if (dDay != null && dDay.length > 0) {
      this.#deathDateString = dDay;
      this.#deathDate = this.#getDateFromString(this.#deathDateString);
    } else {
      this.#hasDeathDate = false;
    }
    if (this.#lastDateCheckedEmpty) {
      this.#hasDeathDate = false;
    }
    // Go ahead and see if pre1500, pre1700 or too old
    this.#checkEarlyDates();

    // get DNA confirmation status
    let val = document.getElementsByName('mStatus_Father');
    for (let radio of val) {
      if (radio.checked) {
        if (radio.value == BioCheckPerson.CONF_WITH_DNA_STATUS) {
          this.person.fatherDnaConfirmed = true;
        }
      }
    }
    val = document.getElementsByName('mStatus_Mother');
    for (let radio of val) {
      if (radio.checked) {
        if (radio.value == BioCheckPerson.CONF_WITH_DNA_STATUS) {
          this.person.motherDnaConfirmed = true;
        }
      }
    }
    // Active profile manager has an email address
    let emailElements = document.getElementsByName('mEmail');
    if (emailElements.length > 0) {
      this.person.isMember = true;
    }
  }

  /*
   * Convert date from form returned by WikiTree API to a Date
   * The WikiTree API may have 00 for any year, month, day
   * In that case, the value 1 is used
   * @param {String} dateString as input from WikiTree API in the form 0000-00-00
   * @returns {Date} Date for the input string
   */
  #getDateFromString(dateString) {
    let year = 0; // default in case of 0 values
    let month = 0;
    let day = 0;
    this.#lastDateCheckedEmpty = false; // hack hack

    // okay possible forms are
    // maybe more, but these are 'official'
    //   yyyy-mm-dd
    //   mon dd, yyyy
    //   dd mon yyyy
    //   mon yyyy
    //   yyyy
    if (dateString.includes("-")) {
      let splitString = dateString.split("-");
      let len = splitString.length;
      if (len > 0) {
        year = splitString[0];
      }
      if (len > 1) {
        month = splitString[1];
      }
      if (len >= 2) {
        day = splitString[2];
      }
    } else {
      if (dateString.includes(",")) {    // mon dd, yyyy
        let splitString = dateString.split(" ");
        let len = splitString.length;
          if (len > 0) {
            month = splitString[0];
          }
          if (len > 1) {
            day = splitString[1];
            day = day.replace(",", "");
          }
          if (len >= 2) {
            year = splitString[2];
          }
      } else {
        let splitString = dateString.split(" ");
        let len = splitString.length;
        if (len === 1) {
          year = splitString[0];
        }
        if (len === 2) {
          year = splitString[1];
          month = splitString[0];
        }
        if (len === 3) {
          year = splitString[2];
          month = splitString[1];
          day = splitString[0];
        }
      }
    }
    let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let monthNum = months.indexOf(month);
    if (monthNum >= 0) {
      month = monthNum;
    }

    // very important the test below should be == and not ===
    // because you want to test for all dates of 0
    if (year + month + day == 0) {
      this.#lastDateCheckedEmpty = true;
      return new Date();
    }
    if (year === 0) {
      year = 1;
    }
    if (month === 0) {
      month = 1;
    }
    if (day === 0) {
      day = 1;
    }
    return new Date(year, month, day);
  }

  /*
   * Check for person that is Pre 1500, Pre1700 or too old to remember
   */
  #checkEarlyDates() {
    let theYear1500 = new Date("1500-01-01");
    let theYear1700 = new Date("1700-01-01");
    let today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth();
    let day = today.getDate();
    let earliestMemoryBeforeDeath = new Date(year - BioCheckPerson.TOO_OLD_TO_REMEMBER_DEATH, month, day);
    let earliestMemoryBeforeBirth = new Date(year - BioCheckPerson.TOO_OLD_TO_REMEMBER_BIRTH, month, day);

    if (this.#birthDate != null) {
      if (this.#birthDate < theYear1500) {
        this.#isPre1500 = true;
      }
      if (this.#birthDate < theYear1700) {
        this.#isPre1700 = true;
      }
      if (this.#birthDate < earliestMemoryBeforeBirth) {
        this.#tooOldToRemember = true;
      }
    }
    if (this.#deathDate != null) {
      if (this.#deathDate < theYear1500) {
        this.#isPre1500 = true;
      }
      if (this.#deathDate < theYear1700) {
        this.#isPre1700 = true;
      }
      if (this.#deathDate < earliestMemoryBeforeDeath) {
        this.#tooOldToRemember = true;
      }
    }
    if (this.#isPre1500) {
      this.#isPre1700 = true;
      this.#tooOldToRemember = true;
    }
    if (this.#isPre1700) {
      this.#tooOldToRemember = true;
    }
    /*
     * Since you already have today, pick up the date to use for
     * a source will be entered by xxxx tests
     */
    this.#oneYearAgo = new Date(year - 1, month, day);
  }

  /**
   * Is the person before 1500
   * @returns {Boolean} true if either birth or death date before 1500
   */
  isPre1500() {
    return this.#isPre1500;
  }
  /**
   * Is the person before 1700
   * @returns {Boolean}  true if either birth or death date before 1700
   */
  isPre1700() {
    return this.#isPre1700;
  }
  /**
   * Is the person born > 150 years ago or died > 100 years ago
   * @returns {Boolean} true if born > 150 years ago or died > 100 years ago
   */
  isTooOldToRemember() {
    return this.#tooOldToRemember;
  }
  /**
   * Does the profile lack dates
   * @returns {Boolean}  true if profile has neither birth nor death date
   */
  isUndated() {
    if (!this.#hasBirthDate && !this.#hasDeathDate) {
      this.#isPre1500 = true;
      this.#isPre1700 = true;
      this.#tooOldToRemember = true;
      return true;
    } else {
      return false;
    }
  }

  /**
   * Get birth date
   * @returns {Date} birth date 
   */
  getBirthDate() {
    return this.#birthDate;
  }
  /**
   * Get death date
   * @return {Date} death date 
   */
  getDeathDate() {
    return this.#deathDate;
  }

  /**
   * Convert date to a display format
   * @param {Boolean} true to get birth date, else death date
   * @returns {String} string in the form yyyy mon dd
   */
  getReportDate(isBirth) {
    // handle cases without any date. sigh.
    let dateString = "";
    let hasDate = this.#hasDeathDate;
    if (isBirth) {
      hasDate = this.#hasBirthDate;
      if (hasDate) {
        dateString = this.#birthDateString;
      }
    } else {
      if (hasDate) {
        dateString = this.#deathDateString;
      }
    }
    let displayDate = "";
    if (hasDate) {
      let year = 0; // default in case of 0 values
      let month = 0;
      let day = 0;
      let splitString = dateString.split("-");
      let len = splitString.length;
      if (len > 0) {
        year = splitString[0];
      }
      if (len > 1) {
        month = splitString[1];
      }
      if (len >= 2) {
        day = splitString[2];
      }
      if (day > 0) {
        displayDate = day + " ";
      }
      if (month > 0) {
        let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let monthNumber = parseInt(month);
        let monthName = months[monthNumber - 1];
        displayDate += monthName + " ";
      }
      if (year > 0) {
        displayDate += year;
      }
    }
    return displayDate;
  }
}
