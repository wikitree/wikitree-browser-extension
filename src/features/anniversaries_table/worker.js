self.onmessage = function (event) {
  let people = event.data.people;
  let tableData = event.data.tableData;

  const peopleKeys = Object.keys(people);
  if (people) {
    // Iterate over each person
    peopleKeys.forEach((key) => {
      let person = people[key];

      if (person.FirstName && person.LastNameCurrent && person.LastNameAtBirth && person.Name) {
        let LNAB = person.LastNameAtBirth; // Get the LNAB from the person.LastNameAtBirth

        // iterate over all rows in the data
        tableData.rows().every(function () {
          // get the data for the row
          var rowData = this.data();

          // iterate over all cells in the row data
          for (var i = 0; i < rowData.length; i++) {
            // create a temporary DOM element to hold the cell data
            var temp = $("<div></div>");
            temp.html(rowData[i]);

            // check if this is the link we need to update
            var link = temp.find(`a[href='/wiki/${person.Name}']`);
            if (link.length > 0) {
              // update the link text
              link.text(`${person.FirstName} (${LNAB}) ${person.LastNameCurrent}`);

              // update the cell data with the new HTML
              rowData[i] = temp.html();

              // update the row data
              this.data(rowData);
            }
          }
        });
      }
    });
    postMessage(tableData);
  }
};
