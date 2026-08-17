/**
 * Ordering for lists of family members in a generated biography.
 */

export function sortPeopleByBirthDate(people) {
  // Define the priority for DataStatus.BirthDate
  const birthDatePriority = {
    before: 1,
    certain: 2,
    "": 3, // Blank or missing status
    guess: 4,
    after: 5,
  };

  /**
   * Adjusts the OrderBirthDate based on the DataStatus.BirthDate status.
   * If status is 'after', it moves the date immediately after the specified date.
   *
   * @param {string} dateStr - The original OrderBirthDate in 'YYYY-MM-DD' format.
   * @param {string} status - The DataStatus.BirthDate status.
   * @returns {Object} An object containing adjusted year, month, and day as integers.
   */
  function adjustDate(dateStr, status) {
    const [yearStr, monthStr, dayStr] = dateStr.split("-");
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10);
    let day = parseInt(dayStr, 10);

    if (status === "after") {
      if (month === 0 && day === 0) {
        // Only year is present: set to January 1 of the next year
        year += 1;
        month = 1;
        day = 1;
      } else if (day === 0) {
        // Year and month are present: set to the first day of the next month
        month += 1;
        if (month > 12) {
          month = 1;
          year += 1;
        }
        day = 1;
      } else {
        // Full date is present: increment the day by 1
        day += 1;
        // Determine the number of days in the current month
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day > daysInMonth) {
          day = 1;
          month += 1;
          if (month > 12) {
            month = 1;
            year += 1;
          }
        }
      }
    }

    return { year, month, day };
  }

  /**
   * Converts the adjusted date into a sortable array.
   * Treats '00' as the earliest possible value for comparison.
   *
   * @param {Object} dateObj - An object containing year, month, and day.
   * @returns {Array} An array [year, month, day] for comparison.
   */
  function getSortKey(dateObj) {
    // Ensure that month and day are at least 1 for sorting purposes
    // '00' will be treated as 0, which is less than any valid month/day
    const sortMonth = dateObj.month || 0;
    const sortDay = dateObj.day || 0;
    return [dateObj.year, sortMonth, sortDay];
  }

  /**
   * Custom comparison function for sorting.
   *
   * @param {Object} a - First person object.
   * @param {Object} b - Second person object.
   * @returns {number} Comparison result for sorting.
   */
  function comparePeople(a, b) {
    const aStatus = a?.DataStatus?.BirthDate || "";
    const bStatus = b?.DataStatus?.BirthDate || "";

    const aAdjusted = adjustDate(a.OrderBirthDate, aStatus);
    const bAdjusted = adjustDate(b.OrderBirthDate, bStatus);

    const aKey = getSortKey(aAdjusted);
    const bKey = getSortKey(bAdjusted);

    // Compare year
    if (aKey[0] !== bKey[0]) {
      return aKey[0] - bKey[0];
    }

    // Compare month, treating 0 as less than any month
    if (aKey[1] !== bKey[1]) {
      if (aKey[1] === 0) return -1;
      if (bKey[1] === 0) return 1;
      return aKey[1] - bKey[1];
    }

    // Compare day, treating 0 as less than any day
    if (aKey[2] !== bKey[2]) {
      if (aKey[2] === 0) return -1;
      if (bKey[2] === 0) return 1;
      return aKey[2] - bKey[2];
    }

    // If adjusted dates are equal, sort based on DataStatus priority
    const aPriority = birthDatePriority[aStatus] || 3;
    const bPriority = birthDatePriority[bStatus] || 3;

    return aPriority - bPriority;
  }

  // Perform the sort using the custom comparison function
  people.sort(comparePeople);
}
