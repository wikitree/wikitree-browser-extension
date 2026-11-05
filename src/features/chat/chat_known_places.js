// Place names the search reader can be sure of, so "Devon profiles with no sources" is a place and
// "Garver profiles" is still a surname (2026-10-10). Countries, US states, Canadian provinces, Australian
// states and British and Irish counties: enough to tell a place from a surname, not a gazetteer.

const NAMES = [
  // countries and nations
  "England", "Scotland", "Wales", "Ireland", "Northern Ireland", "Britain", "Great Britain", "United Kingdom", "UK",
  "United States", "USA", "America", "Canada", "Australia", "New Zealand", "South Africa", "India", "Germany", "France",
  "Netherlands", "Holland", "Belgium", "Switzerland", "Austria", "Italy", "Spain", "Portugal", "Norway", "Sweden",
  "Denmark", "Finland", "Poland", "Russia", "Mexico", "Jamaica", "Isle of Man", "Jersey", "Guernsey", "Prussia",
  "Bohemia", "Hungary", "Czech Republic", "Ukraine", "Lithuania", "Latvia", "Greece", "Iceland", "Argentina", "Brazil",
  "Chile", "China", "Japan", "Philippines", "Barbados", "Bermuda", "Newfoundland",
  // US states
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "West Virginia",
  "Wisconsin", "Wyoming",
  // Canada
  "Ontario", "Quebec", "Nova Scotia", "New Brunswick", "Manitoba", "Saskatchewan", "Alberta", "British Columbia",
  "Prince Edward Island",
  // Australia
  "New South Wales", "Victoria", "Queensland", "Tasmania", "South Australia", "Western Australia",
  // English counties
  "Bedfordshire", "Berkshire", "Buckinghamshire", "Cambridgeshire", "Cheshire", "Cornwall", "Cumberland", "Cumbria",
  "Derbyshire", "Devon", "Dorset", "Durham", "Essex", "Gloucestershire", "Hampshire", "Herefordshire", "Hertfordshire",
  "Huntingdonshire", "Kent", "Lancashire", "Leicestershire", "Lincolnshire", "London", "Middlesex", "Norfolk",
  "Northamptonshire", "Northumberland", "Nottinghamshire", "Oxfordshire", "Rutland", "Shropshire", "Somerset",
  "Staffordshire", "Suffolk", "Surrey", "Sussex", "Warwickshire", "Westmorland", "Wiltshire", "Worcestershire",
  "Yorkshire",
  // Welsh, Scottish and Irish counties (the common ones)
  "Anglesey", "Brecknockshire", "Caernarvonshire", "Cardiganshire", "Carmarthenshire", "Denbighshire", "Flintshire",
  "Glamorgan", "Merionethshire", "Monmouthshire", "Montgomeryshire", "Pembrokeshire", "Radnorshire",
  "Aberdeenshire", "Argyll", "Ayrshire", "Banffshire", "Berwickshire", "Caithness", "Dumfriesshire", "Fife",
  "Inverness-shire", "Lanarkshire", "Midlothian", "Perthshire", "Renfrewshire", "Ross-shire", "Roxburghshire",
  "Stirlingshire", "Sutherland", "Antrim", "Armagh", "Cork", "Donegal", "Dublin", "Fermanagh", "Galway",
  "Kerry", "Kildare", "Kilkenny", "Limerick", "Londonderry", "Mayo", "Sligo", "Tipperary", "Tyrone", "Waterford",
  "Wexford", "Wicklow",
];

const KNOWN = new Set(NAMES.map((name) => name.toLowerCase()));

/** True when the words name a place from the list above ("Devon", "New York"). */
export function isKnownPlaceName(text) {
  return KNOWN.has(String(text || "").trim().replace(/\s+/g, " ").toLowerCase());
}
