This adds the distance (degrees) between the user and the profile person and any relationship between the two people.  

It checks the database on the user's first visit to each profile, displays the results, and stores the results in the indexedDB to be shown on subsequent visits.  The results can be updated by clicking either the relationship text box or the distance text.

Dexie.js is used to managed the indexedDB.