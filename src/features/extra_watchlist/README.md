This adds two buttons to the header in the same place as the clipboard buttons:

- Binoculars: See the Extra Watchlist.
- Plus sign: Add (remove) profiles to (from) the Extra Watchlist. (Only shown on profile/space pages.)

Each column of the table - ID, Name, Note, and Changed - is sortable.  
There is one option for default sorting.
The Extra Watchlist is just a list of IDs saved in localStorage.

Each row has an editable **Note** column (handy for a project name or a reminder).
Type directly into the cell to add or change a note; it saves when you click away.
The cell is a textarea that grows and wraps, so long notes are shown in full rather
than being cut off (very long notes cap their height and scroll internally).
As you type, previously used notes are offered as a selectable dropdown (use the
mouse, or the arrow keys and Enter) so you don't have to retype the same thing.
Notes are stored in localStorage (`extraWatchlistNotes`, keyed by profile/space ID)
and can be sorted and searched like any other column.
