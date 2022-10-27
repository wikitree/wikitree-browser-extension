/*
The MIT License (MIT)

Copyright (c) 2022 Kathryn J Knight

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
/**
 * Contains information about a WikiTree Profile
 * only contains a subset of the complete set of data available
 */
export class PersonDate {

  static TOO_OLD_TO_REMEMBER_DEATH = 100;
  static TOO_OLD_TO_REMEMBER_BIRTH = 150;

  personDate = {
    birthDate: null,                // birth date as Date
    deathDate: null,                // death date as Date
    birthDateString: "",            // birth date string as from server
    deathDateString: "",            // death date string as from server
    hasBirthDate: true,
    hasDeathDate: true,
    lastDateCheckedEmpty: false,   // HACK
    oneYearAgo: null,
    isPre1700: false,
    isPre1500: false,
    tooOldToRemember: false,
    personUndated: false,
  }

  /**
   * constructor
   */
  constructor() {
  }

  /**
   * Initialize person dates from null, 0000 or various forms
   * @param bDay birth date
   * @param dDay death date
   */
  initWithDates(bDay, dDay) {
    this.personDate.birthDate = null;
    this.personDate.deathDate = null;
    if ((bDay != null) && (bDay.length > 0)) {
      this.personDate.birthDateString = bDay;
      this.personDate.birthDate = this.getDate(this.personDate.birthDateString);
    }
    if (this.personDate.lastDateCheckedEmpty) {
      this.personDate.hasBirthDate = false;
    }
    if ((dDay != null) && (dDay.length > 0)) {
      this.personDate.deathDateString = dDay;
      this.personDate.deathDate = this.getDate(this.personDate.deathDateString);
    }
    if (this.personDate.lastDateCheckedEmpty) {
      this.personDate.hasDeathDate = false;
    }
    // Go ahead and see if pre1500, pre1700 or too old
    this.isPersonPre1500();
    this.isPersonPre1700();
    this.mustBeOpen();
  }

  /**
   * Initialize person dates
   * @param profileObj containing the profile
   */
  init(profileObj) {

    if (profileObj.BirthDate != null) {
      this.personDate.birthDateString = profileObj.BirthDate;
      this.personDate.birthDate = this.getDate(this.personDate.birthDateString);
    } else {
      if (profileObj.BirthDateDecade != null) {
        this.personDate.birthDateString = profileObj.BirthDateDecade.slice(0, -1);
        this.personDate.birthDate = this.getDate(this.personDate.birthDateString);
      }
    }
    if (this.personDate.lastDateCheckedEmpty) {
      this.personDate.hasBirthDate = false;
    }
    if (profileObj.DeathDate != null) {
      this.personDate.deathDateString = profileObj.DeathDate;
      this.personDate.deathDate = this.getDate(this.personDate.deathDateString);
    } else {
      if (profileObj.DeathDateDecade != null) {
        this.personDate.deathDateString = profileObj.DeathDateDecade.slice(0, -1);
        this.personDate.deathDate = this.getDate(this.personDate.deathDateString);
      }
    }
    if (this.personDate.lastDateCheckedEmpty) {
      this.personDate.hasDeathDate = false;
    }

    // Go ahead and see if pre1500, pre1700 or too old
    this.isPersonPre1500();
    this.isPersonPre1700();
    this.mustBeOpen();

  }

  /**
   * Convert date from form returned by server to a Date
   * The server may have 00 for any year, month, day
   * In that case, the value 1 is used
   * @param dateString as input from server in the form 0000-00-00
   * @return Date for the input string
   */
  getDate(dateString) {
    let year = 0;             // default in case of 0 values
    let month = 0;
    let day = 0;
    this.personDate.lastDateCheckedEmpty = false;    // hack hack
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
    if ((year + month + day) === 0) {
      this.personDate.lastDateCheckedEmpty = true;
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
    return (new Date(year, month, day));
  }

  /**
   * Is the person before 1500
   * @return true if either birth or death date before 1500
   */
  isPersonPre1500() {
    let theYear1500 = new Date("1500-01-01");
    if (this.personDate.birthDate != null) {
      if (this.personDate.birthDate < theYear1500) {
        this.personDate.isPre1500 = true;
      }
    }
    if (this.personDate.deathDate != null) {
      if (this.personDate.deathDate < theYear1500) {
        this.personDate.isPre1500 = true;
      }
    }
    if (this.personDate.isPre1500) {
      this.personDate.isPre1700 = true;
      this.personDate.tooOldToRemember = true;
    }
    return this.personDate.isPre1500;
  }

  /**
   * Is the person before 1700
   * @return true if either birth or death date before 1700
   */
  isPersonPre1700() {
    let theYear1700 = new Date("1700-01-01");
    if (this.personDate.birthDate != null) {
      if (this.personDate.birthDate < theYear1700) {
        this.personDate.isPre1700 = true;
      }
    }
    if (this.personDate.deathDate != null) {
      if (this.personDate.deathDate < theYear1700) {
        this.personDate.isPre1700 = true;
      }
    }
    if (this.isPre1700) {
      this.personDate.tooOldToRemember = true;
    }
    return this.personDate.isPre1700;
  }
  /**
   * Is the person born > 150 years ago or died > 100 years ago
   * @return true if born > 150 years ago or died > 100 years ago
   */
  mustBeOpen() {
    let today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth();
    let day = today.getDate();
    let earliestMemoryBeforeDeath = new Date(year - PersonDate.TOO_OLD_TO_REMEMBER_DEATH, month, day);
    let earliestMemoryBeforeBirth = new Date(year - PersonDate.TOO_OLD_TO_REMEMBER_BIRTH, month, day);
    if (this.personDate.birthDate != null) {
      if (this.personDate.birthDate < earliestMemoryBeforeBirth) {
        this.personDate.tooOldToRemember = true;
      }
    }
    if (this.personDate.deathDate != null) {
      if (this.personDate.deathDate < earliestMemoryBeforeDeath) {
        this.personDate.tooOldToRemember = true;
      }
    }
    /*
     * Since you already have today, pick up the date to use for
     * a source will be entered by xxxx tests
    */
    this.oneYearAgo = new Date(year - 1, month, day);
    return this.personDate.tooOldToRemember;
  }

  /**
   * Does the profile lack dates
   * @return true if profile has neither birth nor death date
   */
  isUndated() {
    if (!this.personDate.hasBirthDate && !this.personDate.hasDeathDate) {
      this.personDate.isPre1500 = true;
      this.personDate.isPre1700 = true;
      this.personDate.tooOldToRemember = true;
      return true;
    } else {
      return false;
    }
  }

  /**
   * Get birth date
   * @return birth date as Date
  */
  getBirthDate() {
    return this.personDate.birthDate;
  }
  /**
   * Get death date
   * @return death date as Date
  */
  getDeathDate() {
    return this.personDate.deathDate;
  }

  /**
   * Convert date to a display format
   * @param true to get birth date, else death date
   * @return string in the form yyyy mon dd
   */
  getReportDate(isBirth) {

    // handle cases without any date. sigh.
    let dateString = "";
    let hasDate = this.personDate.hasDeathDate;
    if (isBirth) {
      hasDate = this.personDate.hasBirthDate;
      if (hasDate) {
        dateString = this.personDate.birthDateString;
      }
    } else {
      if (hasDate) {
        dateString = this.personDate.deathDateString;
      }
    }
    let displayDate = "";
    if (hasDate) {
      let year = 0;             // default in case of 0 values
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
        let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let monthNumber = parseInt(month);
        let monthName = months[monthNumber-1];
        displayDate += monthName + " ";
      }
      if (year > 0) {
        displayDate += year;
      }
    }
    return displayDate;
  }

}
