// Ancestors in history (2026-10-03, the "Wow!" visuals): the events the ancestors
// lived through, matched to where they were born. "What history did my ancestors
// live through?", "which of my ancestors lived through the Great Famine?". The
// lifespans chart draws them as a lane above the bars. Countries are as
// getCountryFromLocation gives them ("England", "United States", "Ireland").
// Record events (registers, censuses, record losses) are the genealogist's own history.

import { getCountryFromLocation } from "./chat_place_country";

const BRITAIN = ["England", "Scotland", "Wales", "Northern Ireland", "United Kingdom"];
const BRITISH_ISLES = [...BRITAIN, "Ireland"];
const EMPIRE = [...BRITISH_ISLES, "Canada", "Australia", "New Zealand", "South Africa", "India"];
const EUROPE = [
  ...BRITISH_ISLES,
  "France",
  "Germany",
  "Netherlands",
  "Belgium",
  "Luxembourg",
  "Switzerland",
  "Austria",
  "Italy",
  "Spain",
  "Portugal",
  "Denmark",
  "Norway",
  "Sweden",
  "Finland",
  "Poland",
  "Czech Republic",
  "Czechia",
  "Slovakia",
  "Hungary",
  "Russia",
  "Ukraine",
  "Lithuania",
  "Latvia",
  "Estonia",
  "Croatia",
  "Slovenia",
  "Serbia",
  "Romania",
  "Bulgaria",
  "Greece",
];
const WORLD = ["*"];

// kind: war, record, disaster, epidemic, politics, migration, progress.
// match: words a question uses for it ("which of my ancestors lived through the civil war").
export const WORLD_EVENTS = [
  { id: "black-death", start: 1347, end: 1351, label: "The Black Death", kind: "epidemic", regions: EUROPE, match: "black\\s+death|bubonic\\s+plague" },
  { id: "columbus", start: 1492, end: 1492, label: "Columbus reaches the Americas", kind: "migration", regions: WORLD },
  { id: "reformation", start: 1517, end: 1517, label: "Luther's 95 Theses begin the Reformation", kind: "politics", regions: EUROPE, match: "reformation" },
  { id: "parish-registers", start: 1538, end: 1538, label: "Parish registers begin in England", kind: "record", regions: ["England", "Wales"] },
  { id: "eighty-years", start: 1568, end: 1648, label: "The Eighty Years' War", kind: "war", regions: ["Netherlands", "Belgium", "Spain"], match: "eighty\\s+years['’]?\\s+war|dutch\\s+revolt" },
  { id: "jamestown", start: 1607, end: 1607, label: "Jamestown, the first lasting English colony in America", kind: "migration", regions: ["United States", "England"] },
  { id: "thirty-years", start: 1618, end: 1648, label: "The Thirty Years' War", kind: "war", regions: ["Germany", "Czech Republic", "Czechia", "Austria", "Sweden", "Denmark", "France", "Netherlands"], match: "thirty\\s+years['’]?\\s+war" },
  { id: "mayflower", start: 1620, end: 1620, label: "The Mayflower lands at Plymouth", kind: "migration", regions: ["United States", "England", "Netherlands"], match: "mayflower" },
  { id: "great-migration", start: 1630, end: 1640, label: "The Great Migration to New England", kind: "migration", regions: ["United States", "England"] },
  { id: "irish-rebellion-1641", start: 1641, end: 1641, label: "The Irish Rebellion of 1641", kind: "war", regions: ["Ireland"] },
  { id: "english-civil-war", start: 1642, end: 1651, label: "The English Civil Wars", kind: "war", regions: BRITISH_ISLES, match: "english\\s+civil\\s+wars?" },
  { id: "great-plague", start: 1665, end: 1666, label: "The Great Plague of London", kind: "epidemic", regions: ["England"], match: "great\\s+plague" },
  { id: "great-fire", start: 1666, end: 1666, label: "The Great Fire of London", kind: "disaster", regions: ["England"], match: "great\\s+fire\\s+of\\s+london" },
  { id: "boyne", start: 1690, end: 1690, label: "The Battle of the Boyne", kind: "war", regions: ["Ireland", "Northern Ireland"], match: "(?:battle\\s+of\\s+the\\s+)?boyne" },
  { id: "salem", start: 1692, end: 1692, label: "The Salem witch trials", kind: "politics", regions: ["United States"], match: "salem(?:\\s+witch\\s+trials)?" },
  { id: "union-1707", start: 1707, end: 1707, label: "England and Scotland unite as Great Britain", kind: "politics", regions: BRITAIN },
  { id: "jacobite-45", start: 1745, end: 1746, label: "The Jacobite rising and Culloden", kind: "war", regions: ["Scotland", "England"], match: "jacobite(?:\\s+rising)?|culloden|the\\s+['’]?45" },
  { id: "calendar-1752", start: 1752, end: 1752, label: "Britain and its colonies switch to the Gregorian calendar", kind: "record", regions: [...BRITISH_ISLES, "United States", "Canada"] },
  { id: "hardwicke", start: 1754, end: 1754, label: "Hardwicke's Marriage Act: weddings in church, by banns or licence", kind: "record", regions: ["England", "Wales"] },
  { id: "acadians", start: 1755, end: 1764, label: "The expulsion of the Acadians", kind: "migration", regions: ["Nova Scotia", "New Brunswick", "Prince Edward Island", "Quebec", "Louisiana", "France"], match: "(?:acadian\\s+)?expulsion|grand\\s+d[ée]rangement|great\\s+upheaval" },
  { id: "lisbon", start: 1755, end: 1755, label: "The Lisbon earthquake", kind: "disaster", regions: ["Portugal", "Spain"] },
  { id: "seven-years", start: 1756, end: 1763, label: "The Seven Years' War (the French and Indian War)", kind: "war", regions: [...EUROPE, "United States", "Canada"], match: "seven\\s+years['’]?\\s+war|french\\s+and\\s+indian\\s+war" },
  { id: "clearances", start: 1750, end: 1860, label: "The Highland Clearances", kind: "migration", regions: ["Scottish Highlands"], match: "(?:highland\\s+)?clearances", approx: true },
  { id: "revolutionary-war", start: 1775, end: 1783, label: "The American Revolutionary War", kind: "war", regions: ["United States", "England", "Canada", "Scotland", "Ireland"], match: "(?:american\\s+)?revolution(?:ary\\s+war)?|war\\s+of\\s+independence" },
  { id: "first-fleet", start: 1788, end: 1788, label: "The First Fleet reaches Australia", kind: "migration", regions: ["Australia", "England"], match: "first\\s+fleet" },
  { id: "french-revolution", start: 1789, end: 1799, label: "The French Revolution", kind: "politics", regions: ["France", "Belgium", "Switzerland"], match: "french\\s+revolution" },
  { id: "us-census-1790", start: 1790, end: 1790, label: "The first US census", kind: "record", regions: ["United States"] },
  { id: "rebellion-1798", start: 1798, end: 1798, label: "The Irish Rebellion of 1798", kind: "war", regions: ["Ireland"], match: "(?:irish\\s+)?rebellion\\s+of\\s+1798|1798\\s+rebellion" },
  { id: "union-1801", start: 1801, end: 1801, label: "Ireland joins the United Kingdom", kind: "politics", regions: BRITISH_ISLES },
  { id: "napoleonic", start: 1803, end: 1815, label: "The Napoleonic Wars", kind: "war", regions: EUROPE, match: "napoleonic\\s+wars?|waterloo" },
  { id: "war-1812", start: 1812, end: 1815, label: "The War of 1812", kind: "war", regions: ["United States", "Canada"], match: "war\\s+of\\s+1812" },
  { id: "no-summer", start: 1816, end: 1816, label: "The Year Without a Summer", kind: "disaster", regions: [...EUROPE, "United States", "Canada"], match: "year\\s+without\\s+a\\s+summer" },
  { id: "cholera-1832", start: 1832, end: 1832, label: "Cholera reaches Britain and North America", kind: "epidemic", regions: [...BRITISH_ISLES, "United States", "Canada"], match: "cholera" },
  { id: "abolition-1833", start: 1833, end: 1833, label: "Slavery abolished across the British Empire", kind: "politics", regions: [...EMPIRE, "Jamaica", "Barbados"] },
  { id: "civil-registration-ew", start: 1837, end: 1837, label: "Civil registration begins in England and Wales", kind: "record", regions: ["England", "Wales"] },
  { id: "victoria", start: 1837, end: 1901, label: "Queen Victoria's reign", kind: "politics", regions: EMPIRE, match: "victorian\\s+(?:era|times|age)|(?:queen\\s+)?victoria['’]?s\\s+reign" },
  { id: "trail-of-tears", start: 1838, end: 1839, label: "The Trail of Tears", kind: "migration", regions: ["United States"], match: "trail\\s+of\\s+tears" },
  { id: "waitangi", start: 1840, end: 1840, label: "The Treaty of Waitangi", kind: "politics", regions: ["New Zealand"] },
  { id: "census-1841", start: 1841, end: 1841, label: "The first British census to name everyone", kind: "record", regions: BRITAIN },
  { id: "great-famine", start: 1845, end: 1852, label: "The Great Famine in Ireland", kind: "disaster", regions: ["Ireland", "Northern Ireland"], match: "(?:great\\s+|irish\\s+(?:potato\\s+)?)famine|potato\\s+famine|an\\s+gorta\\s+m[óo]r" },
  { id: "revolutions-1848", start: 1848, end: 1849, label: "Revolutions across Europe", kind: "politics", regions: ["France", "Germany", "Austria", "Italy", "Hungary", "Czech Republic", "Czechia", "Denmark", "Poland"] },
  { id: "gold-rush", start: 1848, end: 1855, label: "The California Gold Rush", kind: "migration", regions: ["United States"], match: "(?:california\\s+)?gold\\s+rush" },
  { id: "us-census-1850", start: 1850, end: 1850, label: "The first US census to name everyone", kind: "record", regions: ["United States"] },
  { id: "victorian-gold-rush", start: 1851, end: 1860, label: "The Australian gold rushes", kind: "migration", regions: ["Australia"], match: "(?:australian\\s+|victorian\\s+)gold\\s+rush" },
  { id: "crimean", start: 1853, end: 1856, label: "The Crimean War", kind: "war", regions: [...BRITAIN, "France", "Russia", "Turkey", "Italy"], match: "crimean\\s+war|crimea" },
  { id: "civil-registration-scotland", start: 1855, end: 1855, label: "Civil registration begins in Scotland", kind: "record", regions: ["Scotland"] },
  { id: "indian-rebellion", start: 1857, end: 1858, label: "The Indian Rebellion", kind: "war", regions: ["India", "England"] },
  { id: "us-civil-war", start: 1861, end: 1865, label: "The American Civil War", kind: "war", regions: ["United States"], match: "(?:american\\s+|us\\s+|u\\.s\\.\\s+)?civil\\s+war|war\\s+between\\s+the\\s+states" },
  { id: "italy-unified", start: 1861, end: 1861, label: "Italy is unified", kind: "politics", regions: ["Italy"] },
  { id: "civil-registration-ireland", start: 1864, end: 1864, label: "Civil registration of all births begins in Ireland", kind: "record", regions: ["Ireland", "Northern Ireland"] },
  { id: "confederation", start: 1867, end: 1867, label: "Canadian Confederation", kind: "politics", regions: ["Canada"] },
  { id: "transcontinental", start: 1869, end: 1869, label: "The first transcontinental railroad", kind: "progress", regions: ["United States"] },
  { id: "franco-prussian", start: 1870, end: 1871, label: "The Franco-Prussian War and German unification", kind: "war", regions: ["France", "Germany"], match: "franco[\\s-]prussian\\s+war" },
  { id: "chicago-fire", start: 1871, end: 1871, label: "The Great Chicago Fire", kind: "disaster", regions: ["United States"] },
  { id: "ellis-island", start: 1892, end: 1954, label: "Ellis Island receives immigrants", kind: "migration", regions: ["United States", ...EUROPE], match: "ellis\\s+island" },
  { id: "boer-war", start: 1899, end: 1902, label: "The Second Boer War", kind: "war", regions: [...BRITAIN, "South Africa", "Australia", "Canada", "New Zealand", "Ireland"], match: "boer\\s+war" },
  { id: "federation", start: 1901, end: 1901, label: "The Federation of Australia", kind: "politics", regions: ["Australia"] },
  { id: "sf-earthquake", start: 1906, end: 1906, label: "The San Francisco earthquake", kind: "disaster", regions: ["United States"] },
  { id: "titanic", start: 1912, end: 1912, label: "The Titanic sinks", kind: "disaster", regions: WORLD, match: "(?:sinking\\s+of\\s+the\\s+)?titanic" },
  { id: "ww1", start: 1914, end: 1918, label: "The First World War", kind: "war", regions: WORLD, match: "(?:first\\s+world\\s+war|world\\s+war\\s+(?:one|1|i)|ww\\s*(?:1|i)|the\\s+great\\s+war)" },
  { id: "easter-rising", start: 1916, end: 1916, label: "The Easter Rising", kind: "war", regions: ["Ireland"], match: "easter\\s+rising" },
  { id: "flu-1918", start: 1918, end: 1920, label: "The 1918 influenza pandemic", kind: "epidemic", regions: WORLD, match: "(?:1918\\s+|spanish\\s+)(?:flu|influenza)|flu\\s+pandemic|influenza\\s+pandemic" },
  { id: "irish-independence", start: 1919, end: 1923, label: "The Irish War of Independence and Civil War", kind: "war", regions: ["Ireland", "Northern Ireland"], match: "irish\\s+(?:war\\s+of\\s+independence|civil\\s+war)" },
  { id: "prohibition", start: 1920, end: 1933, label: "Prohibition", kind: "politics", regions: ["United States"], match: "prohibition" },
  { id: "census-1890-fire", start: 1921, end: 1921, label: "Fire destroys most of the 1890 US census", kind: "record", regions: ["United States"] },
  { id: "four-courts", start: 1922, end: 1922, label: "Ireland's Public Record Office burns, with most early census returns", kind: "record", regions: ["Ireland", "Northern Ireland"] },
  { id: "depression", start: 1929, end: 1939, label: "The Great Depression", kind: "disaster", regions: WORLD, match: "(?:great\\s+)?depression|wall\\s+street\\s+crash" },
  { id: "dust-bowl", start: 1930, end: 1936, label: "The Dust Bowl", kind: "disaster", regions: ["United States"], match: "dust\\s+bowl" },
  { id: "register-1939", start: 1939, end: 1939, label: "The 1939 Register of England and Wales", kind: "record", regions: ["England", "Wales"] },
  { id: "ww2", start: 1939, end: 1945, label: "The Second World War", kind: "war", regions: WORLD, match: "(?:second\\s+world\\s+war|world\\s+war\\s+(?:two|2|ii)|ww\\s*(?:2|ii))" },
  { id: "nhs", start: 1948, end: 1948, label: "The NHS is founded", kind: "progress", regions: BRITAIN },
  { id: "korean-war", start: 1950, end: 1953, label: "The Korean War", kind: "war", regions: ["United States", "Korea", "South Korea", ...BRITAIN, "Canada", "Australia"], match: "korean\\s+war" },
  { id: "vietnam", start: 1955, end: 1975, label: "The Vietnam War", kind: "war", regions: ["United States", "Vietnam", "Australia", "New Zealand"], match: "vietnam(?:\\s+war)?" },
  { id: "moon", start: 1969, end: 1969, label: "The first Moon landing", kind: "progress", regions: WORLD, match: "moon\\s+landing" },
  { id: "berlin-wall", start: 1989, end: 1989, label: "The Berlin Wall falls", kind: "politics", regions: WORLD },
  // (2026-10-04, the user: "more historical things… more relevant to the person")
  { id: "quebec-1759", start: 1759, end: 1760, label: "The British conquest of New France (the Plains of Abraham)", kind: "war", regions: ["Canada", "France"] },
  { id: "loyalists", start: 1783, end: 1784, label: "Loyalist refugees settle Nova Scotia, New Brunswick and Quebec", kind: "migration", regions: ["Canada", "United States"], match: "loyalists?|united\\s+empire\\s+loyalists" },
  { id: "new-brunswick-1784", start: 1784, end: 1784, label: "New Brunswick is split from Nova Scotia", kind: "politics", regions: ["New Brunswick", "Nova Scotia"] },
  { id: "constitutional-1791", start: 1791, end: 1791, label: "Quebec is divided into Upper and Lower Canada", kind: "politics", regions: ["Quebec", "Ontario"] },
  { id: "smallpox-vaccine", start: 1796, end: 1796, label: "Jenner's smallpox vaccine", kind: "progress", regions: [...BRITISH_ISLES, "United States", "Canada"] },
  { id: "louisiana-purchase", start: 1803, end: 1803, label: "The Louisiana Purchase", kind: "politics", regions: ["United States"] },
  { id: "erie-canal", start: 1825, end: 1825, label: "The Erie Canal opens", kind: "progress", regions: ["United States"] },
  { id: "miramichi-fire", start: 1825, end: 1825, label: "The Great Miramichi Fire", kind: "disaster", regions: ["New Brunswick"] },
  { id: "reform-1832", start: 1832, end: 1832, label: "The Great Reform Act widens the vote", kind: "politics", regions: BRITAIN },
  { id: "poor-law-1834", start: 1834, end: 1834, label: "The New Poor Law and its workhouses", kind: "politics", regions: ["England", "Wales"], match: "(?:new\\s+)?poor\\s+law|workhouses?" },
  { id: "canadas-1837", start: 1837, end: 1838, label: "The Rebellions in Upper and Lower Canada", kind: "war", regions: ["Quebec", "Ontario"], match: "(?:1837\\s+)?rebellions?\\s+(?:of\\s+1837|in\\s+upper\\s+and\\s+lower\\s+canada)|patriotes?\\s+war" },
  { id: "chartists", start: 1838, end: 1848, label: "The Chartist movement", kind: "politics", regions: BRITAIN },
  { id: "rebecca-riots", start: 1839, end: 1843, label: "The Rebecca Riots", kind: "politics", regions: ["Wales"] },
  { id: "penny-post", start: 1840, end: 1840, label: "The Penny Post: the first postage stamps", kind: "progress", regions: BRITAIN },
  { id: "province-of-canada", start: 1841, end: 1841, label: "Upper and Lower Canada are united as the Province of Canada", kind: "politics", regions: ["Quebec", "Ontario"] },
  { id: "disruption", start: 1843, end: 1843, label: "The Disruption of the Church of Scotland", kind: "politics", regions: ["Scotland"] },
  { id: "railway-mania", start: 1845, end: 1847, label: "Railway Mania", kind: "progress", regions: BRITAIN },
  { id: "german-emigration", start: 1845, end: 1890, label: "Mass emigration from Germany to America", kind: "migration", regions: ["Germany"], approx: true },
  { id: "mexican-american", start: 1846, end: 1848, label: "The Mexican–American War", kind: "war", regions: ["United States", "Mexico"] },
  { id: "highland-famine", start: 1846, end: 1856, label: "The Highland Potato Famine", kind: "disaster", regions: ["Scottish Highlands"] },
  { id: "typhus-1847", start: 1847, end: 1847, label: "Typhus among Irish famine emigrants at Grosse Île and Partridge Island", kind: "epidemic", regions: ["Quebec", "New Brunswick", "Ireland"] },
  { id: "canada-census-1851", start: 1851, end: 1852, label: "The first Canadian census to name everyone", kind: "record", regions: ["Canada"] },
  { id: "homestead-act", start: 1862, end: 1862, label: "The Homestead Act", kind: "migration", regions: ["United States"] },
  { id: "emancipation", start: 1863, end: 1863, label: "The Emancipation Proclamation", kind: "politics", regions: ["United States"] },
  { id: "scandinavian-emigration", start: 1866, end: 1914, label: "Mass emigration from Scandinavia to America", kind: "migration", regions: ["Norway", "Sweden", "Denmark", "Finland"], approx: true },
  { id: "transportation-ends", start: 1868, end: 1868, label: "The last convict ship reaches Australia", kind: "migration", regions: ["Australia"] },
  { id: "education-1870", start: 1870, end: 1870, label: "Schooling for every child (the Elementary Education Act)", kind: "progress", regions: ["England", "Wales"] },
  { id: "intercolonial", start: 1876, end: 1876, label: "The Intercolonial Railway links the Maritimes and Quebec", kind: "progress", regions: ["Quebec", "New Brunswick", "Nova Scotia"] },
  { id: "telephone", start: 1876, end: 1876, label: "Bell patents the telephone", kind: "progress", regions: ["United States", "Canada", ...BRITAIN] },
  { id: "saint-john-fire", start: 1877, end: 1877, label: "The Great Fire of Saint John", kind: "disaster", regions: ["New Brunswick"] },
  { id: "land-war", start: 1879, end: 1882, label: "The Irish Land War", kind: "politics", regions: ["Ireland", "Northern Ireland"] },
  { id: "pogroms-1881", start: 1881, end: 1884, label: "Pogroms drive Jewish families west", kind: "migration", regions: ["Russia", "Ukraine", "Poland", "Lithuania", "Belarus"] },
  { id: "italian-emigration", start: 1880, end: 1914, label: "Mass emigration from Italy", kind: "migration", regions: ["Italy"], approx: true },
  { id: "cpr", start: 1885, end: 1885, label: "The Canadian Pacific Railway reaches the Pacific", kind: "progress", regions: ["Canada"] },
  { id: "klondike", start: 1896, end: 1899, label: "The Klondike Gold Rush", kind: "migration", regions: ["Canada", "United States"], match: "klondike(?:\\s+gold\\s+rush)?" },
  { id: "spanish-american", start: 1898, end: 1898, label: "The Spanish–American War", kind: "war", regions: ["United States", "Spain", "Cuba", "Philippines"] },
  { id: "gallipoli", start: 1915, end: 1915, label: "Gallipoli", kind: "war", regions: ["Australia", "New Zealand"], match: "gallipoli|anzac" },
  { id: "halifax-explosion", start: 1917, end: 1917, label: "The Halifax Explosion", kind: "disaster", regions: ["Nova Scotia"], match: "halifax\\s+explosion" },
  { id: "conscription-1917", start: 1917, end: 1918, label: "The Conscription Crisis", kind: "politics", regions: ["Canada"] },
  { id: "russian-revolution", start: 1917, end: 1922, label: "The Russian Revolution and Civil War", kind: "war", regions: ["Russia", "Ukraine", "Belarus", "Lithuania", "Latvia", "Estonia", "Finland", "Poland"] },
  { id: "women-vote-1918", start: 1918, end: 1918, label: "Women over 30 win the vote", kind: "politics", regions: BRITISH_ISLES },
  { id: "women-vote-1920", start: 1920, end: 1920, label: "American women win the vote", kind: "politics", regions: ["United States"] },
  { id: "general-strike", start: 1926, end: 1926, label: "The General Strike", kind: "politics", regions: BRITAIN },
  { id: "blitz", start: 1940, end: 1941, label: "The Blitz", kind: "war", regions: BRITAIN, match: "(?:the\\s+)?blitz" },
  { id: "newfoundland-1949", start: 1949, end: 1949, label: "Newfoundland joins Canada", kind: "politics", regions: ["Newfoundland", "Canada"] },
  { id: "quiet-revolution", start: 1960, end: 1966, label: "The Quiet Revolution", kind: "politics", regions: ["Quebec"] },
  // Europe, the US, Australia and New Zealand (2026-10-04, the user: "expand it to many European countries…")
  { id: "peasants-war", start: 1524, end: 1525, label: "The German Peasants' War", kind: "war", regions: ["Germany", "Austria", "Switzerland"] },
  { id: "king-philips-war", start: 1675, end: 1676, label: "King Philip's War", kind: "war", regions: ["United States"] },
  { id: "huguenots", start: 1685, end: 1685, label: "The Edict of Nantes is revoked and Huguenots flee France", kind: "migration", regions: ["France", "Switzerland"], match: "huguenots?(?:\\s+flight)?" },
  { id: "great-awakening", start: 1734, end: 1745, label: "The First Great Awakening", kind: "politics", regions: ["United States"] },
  { id: "enclosures", start: 1750, end: 1850, label: "The Enclosure Acts fence the common land", kind: "politics", regions: ["England"], approx: true },
  { id: "partitions-poland", start: 1772, end: 1795, label: "The Partitions of Poland", kind: "politics", regions: ["Poland", "Lithuania", "Belarus", "Ukraine"] },
  { id: "etat-civil", start: 1792, end: 1792, label: "Civil registration begins in France", kind: "record", regions: ["France"] },
  { id: "civil-registration-nl", start: 1811, end: 1811, label: "Civil registration begins in the Netherlands", kind: "record", regions: ["Netherlands"] },
  { id: "belgian-revolution", start: 1830, end: 1831, label: "Belgium breaks away from the Netherlands", kind: "politics", regions: ["Belgium", "Netherlands", "Luxembourg"] },
  { id: "great-trek", start: 1835, end: 1840, label: "The Great Trek", kind: "migration", regions: ["South Africa"] },
  { id: "oregon-trail", start: 1843, end: 1869, label: "Wagon trains on the Oregon Trail", kind: "migration", regions: ["United States"], match: "oregon\\s+trail" },
  { id: "hungry-forties", start: 1845, end: 1849, label: "Potato blight and the \"Hungry Forties\" across Europe", kind: "disaster", regions: ["Belgium", "Netherlands", "Germany", "France", "England", "Scotland", "Denmark", "Poland"] },
  { id: "nz-wars", start: 1845, end: 1872, label: "The New Zealand Wars", kind: "war", regions: ["New Zealand"], match: "new\\s+zealand\\s+wars|maori\\s+wars|land\\s+wars" },
  { id: "sonderbund", start: 1847, end: 1848, label: "The Sonderbund War and the Swiss federal state", kind: "war", regions: ["Switzerland"] },
  { id: "eureka", start: 1854, end: 1854, label: "The Eureka Stockade", kind: "politics", regions: ["Australia"], match: "eureka(?:\\s+stockade|\\s+rebellion)?" },
  { id: "russian-serfs", start: 1861, end: 1861, label: "The serfs are freed in the Russian Empire", kind: "politics", regions: ["Russia", "Ukraine", "Belarus", "Lithuania", "Latvia", "Estonia"] },
  { id: "otago-gold", start: 1861, end: 1863, label: "The Otago gold rush", kind: "migration", regions: ["New Zealand"] },
  { id: "january-uprising", start: 1863, end: 1864, label: "The January Uprising", kind: "war", regions: ["Poland", "Lithuania", "Belarus"] },
  { id: "schleswig", start: 1864, end: 1864, label: "The Second Schleswig War", kind: "war", regions: ["Denmark", "Germany", "Austria"] },
  { id: "nordic-famine", start: 1866, end: 1868, label: "The famine years in Finland and northern Sweden", kind: "disaster", regions: ["Finland", "Sweden"] },
  { id: "austria-hungary", start: 1867, end: 1867, label: "Austria-Hungary is formed", kind: "politics", regions: ["Austria", "Hungary", "Czech Republic", "Czechia", "Slovakia", "Croatia", "Slovenia"] },
  { id: "long-depression", start: 1873, end: 1879, label: "The Long Depression", kind: "disaster", regions: ["United States", "Germany", "Austria", "England"] },
  { id: "civil-registration-de", start: 1874, end: 1876, label: "Civil registration begins across Germany", kind: "record", regions: ["Germany"] },
  { id: "tarawera", start: 1886, end: 1886, label: "The Tarawera eruption", kind: "disaster", regions: ["New Zealand"] },
  { id: "johnstown-flood", start: 1889, end: 1889, label: "The Johnstown Flood", kind: "disaster", regions: ["Pennsylvania"] },
  { id: "nz-women-vote", start: 1893, end: 1893, label: "New Zealand women win the vote, the first in the world", kind: "politics", regions: ["New Zealand"] },
  { id: "federation-drought", start: 1895, end: 1902, label: "The Federation Drought", kind: "disaster", regions: ["Australia"] },
  { id: "galveston", start: 1900, end: 1900, label: "The Galveston hurricane", kind: "disaster", regions: ["Texas"] },
  { id: "norway-1905", start: 1905, end: 1905, label: "Norway becomes independent of Sweden", kind: "politics", regions: ["Norway", "Sweden"] },
  { id: "messina", start: 1908, end: 1908, label: "The Messina earthquake", kind: "disaster", regions: ["Italy"] },
  { id: "portugal-republic", start: 1910, end: 1910, label: "Portugal becomes a republic", kind: "politics", regions: ["Portugal"] },
  { id: "hyperinflation", start: 1923, end: 1923, label: "Hyperinflation in Germany", kind: "disaster", regions: ["Germany"] },
  { id: "napier", start: 1931, end: 1931, label: "The Hawke's Bay (Napier) earthquake", kind: "disaster", regions: ["New Zealand"] },
  { id: "new-deal", start: 1933, end: 1939, label: "The New Deal", kind: "politics", regions: ["United States"] },
  { id: "spanish-civil-war", start: 1936, end: 1939, label: "The Spanish Civil War", kind: "war", regions: ["Spain"], match: "spanish\\s+civil\\s+war" },
  { id: "black-friday-1939", start: 1939, end: 1939, label: "The Black Friday bushfires", kind: "disaster", regions: ["Australia"] },
  { id: "hunger-winter", start: 1944, end: 1945, label: "The Dutch Hunger Winter", kind: "disaster", regions: ["Netherlands"] },
  { id: "ten-pound-poms", start: 1945, end: 1972, label: "Assisted passage: the \"Ten Pound Poms\"", kind: "migration", regions: ["Australia", "New Zealand", "England", "Scotland", "Wales"] },
  { id: "germany-divided", start: 1949, end: 1949, label: "Germany is divided into East and West", kind: "politics", regions: ["Germany"] },
  { id: "north-sea-flood", start: 1953, end: 1953, label: "The North Sea flood", kind: "disaster", regions: ["Netherlands", "England", "Belgium", "Scotland"] },
  { id: "troubles", start: 1968, end: 1998, label: "The Troubles", kind: "war", regions: ["Northern Ireland", "Ireland"], match: "(?:the\\s+)?troubles" },
];

export const EVENT_KIND_COLOURS = {
  war: "#c0392b",
  record: "#2a7f62",
  disaster: "#d17a00",
  epidemic: "#7b4fd6",
  politics: "#2f6fb3",
  migration: "#0f8b8d",
  progress: "#8a6d3b",
};
export const EVENT_KIND_LABELS = {
  war: "Wars",
  record: "Records",
  disaster: "Disasters",
  epidemic: "Epidemics",
  politics: "Politics",
  migration: "Migration",
  progress: "Progress",
};

/** True when an event belongs to one of the countries (or to everyone). */
export function eventFits(event, countries) {
  if (event.regions.includes("*")) return true;
  return (countries || []).some((country) => event.regions.includes(country));
}

/** "1861–1865" or "1912" (with "c." for approximate spans). */
export function eventYears(event) {
  const span = event.start === event.end ? String(event.start) : `${event.start}–${event.end}`;
  return event.approx ? `c. ${span}` : span;
}

// Places without their country (2026-10-04: "Halifax, Nova Scotia" and "Ellsworth, Maine"
// came back as "Nova Scotia" and "Maine", so Canada's and America's events never matched).
// Each part of a place is looked up; the province or state is kept as a region of its own.
const PROVINCES = {
  Canada: [
    "Ontario", "Quebec", "Québec", "Nova Scotia", "New Brunswick", "Prince Edward Island", "Newfoundland", "Newfoundland and Labrador", "Labrador",
    "Manitoba", "Saskatchewan", "Alberta", "British Columbia", "Yukon", "Northwest Territories", "Nunavut",
    "Lower Canada", "Upper Canada", "Canada East", "Canada West", "Province of Canada", "New France", "Nouvelle-France", "Acadia", "Acadie", "Cape Breton", "Cape Breton Island",
  ],
  "United States": [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois",
    "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
    "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma",
    "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming", "District of Columbia", "New England", "Massachusetts Bay", "Province of Massachusetts Bay", "Plymouth Colony", "New Netherland",
  ],
  Australia: ["New South Wales", "Queensland", "Tasmania", "Van Diemen's Land", "South Australia", "Western Australia", "Northern Territory", "Australian Capital Territory"],
  Scotland: [
    "Aberdeenshire", "Angus", "Forfarshire", "Argyll", "Argyllshire", "Ayrshire", "Banffshire", "Berwickshire", "Bute", "Buteshire", "Caithness", "Clackmannanshire",
    "Cromarty", "Dumfriesshire", "Dunbartonshire", "Dumbartonshire", "East Lothian", "Haddingtonshire", "Fife", "Inverness-shire", "Invernessshire", "Kincardineshire",
    "Kinross-shire", "Kirkcudbrightshire", "Lanarkshire", "Midlothian", "Edinburghshire", "Moray", "Elginshire", "Nairnshire", "Orkney", "Peeblesshire", "Perthshire",
    "Renfrewshire", "Ross-shire", "Ross and Cromarty", "Roxburghshire", "Selkirkshire", "Shetland", "Stirlingshire", "Sutherland", "West Lothian", "Linlithgowshire",
    "Wigtownshire", "Isle of Skye", "Skye", "Isle of Lewis", "Lewis", "Harris", "Hebrides", "Outer Hebrides", "Inner Hebrides",
  ],
  Wales: [
    "Anglesey", "Brecknockshire", "Breconshire", "Caernarvonshire", "Carnarvonshire", "Cardiganshire", "Carmarthenshire", "Denbighshire", "Flintshire", "Glamorgan",
    "Glamorganshire", "Merionethshire", "Monmouthshire", "Montgomeryshire", "Pembrokeshire", "Radnorshire",
  ],
  England: [
    "Bedfordshire", "Berkshire", "Buckinghamshire", "Cambridgeshire", "Cheshire", "Cornwall", "Cumberland", "Derbyshire", "Devon", "Devonshire", "Dorset", "Durham",
    "Essex", "Gloucestershire", "Hampshire", "Herefordshire", "Hertfordshire", "Huntingdonshire", "Kent", "Lancashire", "Leicestershire", "Lincolnshire", "London",
    "Middlesex", "Norfolk", "Northamptonshire", "Northumberland", "Nottinghamshire", "Oxfordshire", "Rutland", "Shropshire", "Somerset", "Staffordshire", "Suffolk",
    "Surrey", "Sussex", "Warwickshire", "Westmorland", "Wiltshire", "Worcestershire", "Yorkshire",
  ],
};
// The Highlands, for the Clearances and the Highland famine (not Glasgow or the Borders).
const HIGHLANDS = new Set(
  ["Argyll", "Argyllshire", "Caithness", "Cromarty", "Inverness-shire", "Invernessshire", "Ross-shire", "Ross and Cromarty", "Sutherland", "Isle of Skye", "Skye", "Isle of Lewis", "Lewis", "Harris", "Hebrides", "Outer Hebrides", "Inner Hebrides", "Highland", "Highlands", "Scottish Highlands"].map((name) => name.toLowerCase())
);
const COUNTRY_OF_PART = new Map();
Object.entries(PROVINCES).forEach(([country, names]) => names.forEach((name) => COUNTRY_OF_PART.set(name.toLowerCase(), country)));
const CANONICAL_PART = new Map([["québec", "Quebec"], ["newfoundland and labrador", "Newfoundland"], ["acadie", "Acadia"], ["cape breton island", "Nova Scotia"], ["cape breton", "Nova Scotia"]]);

/** The regions a place belongs to: its country, its province or state, and "Scottish Highlands". */
export function placeRegions(location) {
  const regions = new Set();
  const country = getCountryFromLocation(location);
  if (country) regions.add(country);
  String(location || "")
    .split(",")
    .map((part) => part.trim().replace(/\.$/, ""))
    .filter(Boolean)
    .forEach((part) => {
      const key = part.toLowerCase().replace(/^(?:county|co\.?)\s+/, "");
      const inCountry = COUNTRY_OF_PART.get(key);
      if (inCountry) {
        regions.add(inCountry);
        regions.add(CANONICAL_PART.get(key) || part);
      }
      if (HIGHLANDS.has(key)) regions.add("Scottish Highlands").add("Scotland");
    });
  // (Ambiguous names such as "Victoria" are left out of the lists rather than guessed.)
  return [...regions];
}

/** The country of a place, through its province, state or county when it doesn't name one. */
export function placeCountry(location) {
  const country = getCountryFromLocation(location);
  return COUNTRY_OF_PART.get(country.toLowerCase()) || country;
}

/** Where a person was born and died, as regions. */
export function rowRegions(row) {
  return [...new Set([...placeRegions(row?.birthLocation), ...placeRegions(row?.deathLocation)])];
}

/**
 * The events that touched these people (2026-10-04, the user: the Highland Clearances
 * appeared though no one on the chart was from Scotland): an event counts when someone
 * alive during it was born or died where it happened. World events need only someone alive.
 */
export function eventsForRows(rows, first, last) {
  const people = (rows || [])
    .filter((row) => row.start && (row.end || row.start))
    .map((row) => ({ start: row.start, end: row.end || row.start, regions: rowRegions(row) }));
  return WORLD_EVENTS.filter(
    (event) => event.end >= first && event.start <= last && people.some((person) => person.start <= event.end && person.end >= event.start && eventFits(event, person.regions))
  ).sort((a, b) => a.start - b.start || a.end - b.end);
}

/** The events between two years that fit any of the countries, in date order. */
export function eventsForSpan(first, last, countries) {
  return WORLD_EVENTS.filter((event) => event.end >= first && event.start <= last && eventFits(event, countries)).sort((a, b) => a.start - b.start || a.end - b.end);
}

/** The countries the rows were born in, most first. */
export function rowCountries(rows) {
  const counts = new Map();
  (rows || []).forEach((row) => {
    const country = placeCountry(row.birthLocation);
    if (country) counts.set(country, (counts.get(country) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([country]) => country);
}

/**
 * The events one person lived through: [{event, age}] (age when it began; 0 when
 * born during it). The events where they were born or died (row.extraRegions adds
 * more, such as where they married), plus the world's; someone with no places gets
 * the fallback countries.
 */
export function livedThrough(row, fallbackCountries = []) {
  const regions = [...rowRegions(row), ...(row.extraRegions || [])];
  const countries = regions.length ? regions : fallbackCountries;
  return WORLD_EVENTS.filter((event) => event.end >= row.start && event.start <= row.end && eventFits(event, countries))
    .sort((a, b) => a.start - b.start)
    .map((event) => ({ event, age: Math.max(0, event.start - row.start) }));
}

const OWNER = String.raw`(my|our|her|his|their|this\s+(?:profile|person)['’]s|[A-Z][A-Za-z' -]*?-\d+['’]s)`;
const PATTERNS = [
  // "what was happening when my ancestors were alive", "what was going on in the world when her ancestors lived"
  new RegExp(String.raw`^what\s+was\s+(?:happening|going\s+on)(?:\s+in\s+the\s+world)?\s+(?:when|while)\s+${OWNER}\s+ancestors\s+(?:were\s+alive|lived)$`, "i"),
  // "what history did my ancestors live through", "what events did her ancestors live through/see"
  new RegExp(String.raw`^what\s+(?:history|historical\s+events|events|wars)\s+did\s+${OWNER}\s+ancestors\s+(?:live\s+through|see|witness|experience|survive)$`, "i"),
  // "my ancestors in history", "Cook-8721's ancestors in history", "show my ancestors in historical context"
  new RegExp(String.raw`^(?:(?:show|put)(?:\s+me)?\s+)?(?:${OWNER}\s+)?ancestors\s+in\s+(?:history|(?:their\s+)?historical\s+context|context)$`, "i"),
  // "historical events in my ancestors' lives", "history timeline of my ancestors", "historical context for her ancestors"
  new RegExp(String.raw`^(?:show\s+(?:me\s+)?)?(?:the\s+)?(?:historical\s+events|history(?:\s+timeline)?|historical\s+context|world\s+events)\s+(?:in|of|for|during)\s+${OWNER}\s+ancestors['’]?(?:\s+lives)?$`, "i"),
];
// "which of my ancestors lived through the Great Famine", "who in her family was alive during the Civil War",
// "were any of my ancestors alive during WW1"
const EVENT_PATTERNS = [
  new RegExp(String.raw`^(?:which|who)\s+(?:of|in|among)\s+${OWNER}\s+(?:ancestors|family(?:\s+tree)?|tree)\s+(?:was|were)?\s*(?:alive\s+(?:during|in|for|at\s+the\s+time\s+of)|lived\s+(?:through|during)|survived|saw|experienced|witnessed)\s+(?:the\s+)?(.+)$`, "i"),
  new RegExp(String.raw`^(?:were|was|did)\s+any\s+of\s+${OWNER}\s+ancestors\s+(?:alive\s+(?:during|in|for|at\s+the\s+time\s+of)|live\s+through|survive|see|experience)\s+(?:the\s+)?(.+)$`, "i"),
];

// One person's life (live, 2026-10-04: "What was happening in the world during
// Philip's life?" got a general essay): "what history did Philip live through",
// "what was happening during his life", "world events in Cook-8721's lifetime".
const PERSON = String.raw`(he|she|they|[A-Z][A-Za-z' -]*?-\d+|[A-Z][A-Za-z'-]*(?:\s+[A-Z][A-Za-z'-]*){0,3})`;
const PERSON_OWNER = String.raw`(my|her|his|their|this\s+(?:profile|person)['’]s|[A-Z][A-Za-z' -]*?-\d+['’]s|[A-Z][A-Za-z'-]*(?:\s+[A-Z][A-Za-z'-]*){0,3}['’]s)`;
const PERSON_PATTERNS = [
  new RegExp(String.raw`^what\s+was\s+(?:happening|going\s+on)(?:\s+in\s+the\s+world)?\s+(?:during|in)\s+${PERSON_OWNER}\s+life(?:time)?$`, "i"),
  new RegExp(String.raw`^what\s+(?:history|historical\s+events|events|wars)\s+did\s+${PERSON}\s+(?:live\s+through|see|witness|experience|survive)$`, "i"),
  new RegExp(String.raw`^(?:(?:show\s+(?:me\s+)?)?(?:the\s+)?(?:historical\s+events|history|world\s+events))\s+(?:in|during)\s+${PERSON_OWNER}\s+life(?:time)?$`, "i"),
];

function personOwner(word) {
  const raw = String(word || "")
    .trim()
    .replace(/['’]s$/i, "");
  if (/^(?:he|she|they|his|her|their|this\s+(?:profile|person))$/i.test(raw)) return "";
  if (/^my$/i.test(raw)) return "my";
  return raw;
}

function canonicalOwner(word) {
  const raw = String(word || "")
    .trim()
    .replace(/['’]s$/i, "");
  if (!raw) return "";
  if (/^(?:my|our)$/i.test(raw)) return "my";
  if (/^(?:her|his|their)$/i.test(raw)) return raw.toLowerCase();
  if (/^this\s+(?:profile|person)$/i.test(raw)) return "";
  return raw;
}

/** The event a phrase names ("the Great Famine", "WW1", "the civil war"), or null. */
export function findEvent(phrase) {
  const text = String(phrase || "")
    .trim()
    .replace(/^the\s+/i, "")
    .replace(/[.!?]+$/, "");
  return WORLD_EVENTS.find((event) => event.match && new RegExp(`^(?:the\\s+)?(?:${event.match})$`, "i").test(text)) || null;
}

/** {owner, ancestorPrompt, history: true, eventId?} or null. A named event that isn't in the list declines. */
export function parseHistoryPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+please$/i, "")
    .replace(/^please\s+/i, "");
  const params = (owner, extra = {}) => {
    const ancestorPrompt = !owner ? "this profile's ancestors" : /^(?:my|her|his|their)$/.test(owner) ? `${owner} ancestors` : `${owner}'s ancestors`;
    return { owner, ancestorPrompt, history: true, ...extra };
  };
  for (const re of PATTERNS) {
    const match = text.match(re);
    if (match) return params(canonicalOwner(match[1]));
  }
  for (const re of PERSON_PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const owner = personOwner(match[1]);
    const ancestorPrompt = !owner ? "this profile's ancestors" : owner === "my" ? "my ancestors" : `${owner}'s ancestors`;
    return { owner, ancestorPrompt, history: true, personal: true };
  }
  for (const re of EVENT_PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const event = findEvent(match[2]);
    if (event) return params(canonicalOwner(match[1]), { eventId: event.id });
  }
  return null;
}

// "The Great Famine" → "the Great Famine"; "Italy is unified" stays.
const lower = (text) => String(text || "").replace(/^(?:The|A)\b/, (word) => word.toLowerCase());

/** Who was alive for an event: [{row, age}] (age when it began; 0 if born during it), oldest first. */
export function aliveFor(event, rows) {
  return rows
    .filter((row) => row.generation > 0 && (row.endKnown || row.living) && row.start <= event.end && row.end >= event.start)
    .map((row) => ({ row, age: Math.max(0, event.start - row.start) }))
    .sort((a, b) => b.age - a.age);
}

function personText(entry, ownerText) {
  const whose = ownerText === "Your" ? "your" : ownerText;
  return `${entry.row.name} (${whose} ${String(entry.row.relation || "").toLowerCase()}${entry.age ? `, aged ${entry.age}` : ", born during it"})`;
}

/**
 * The chat reply. rows: from buildLifespanRows; countries: the tree's birth countries.
 * eventId: one event ("which of my ancestors lived through the Great Famine").
 */
export function buildHistorySummary(rows, ownerText, countries, eventId = "") {
  const whose = ownerText === "Your" ? "your" : ownerText;
  const known = rows.filter((row) => row.generation > 0 && (row.endKnown || row.living));
  if (eventId) {
    const event = WORLD_EVENTS.find((item) => item.id === eventId);
    const alive = aliveFor(event, rows);
    if (!alive.length) return `None of ${whose} ancestors with known dates were alive during ${lower(event.label)} (${eventYears(event)}).`;
    // Those born where it happened lead; the rest are counted.
    const local = alive.filter((entry) => eventFits(event, rowRegions(entry.row)));
    const shown = local.length ? local : alive;
    const lines = [`${alive.length} of ${whose} ancestors with known dates were alive during ${lower(event.label)} (${eventYears(event)}):`];
    shown.slice(0, 8).forEach((entry) => lines.push(`• ${personText(entry, ownerText)}${entry.row.birthLocation ? `, born in ${entry.row.birthLocation}` : ""}`));
    if (shown.length > 8) lines.push(`…and ${shown.length - 8} more.`);
    if (local.length && local.length < alive.length) lines.push(`(${alive.length - local.length} more ${alive.length - local.length === 1 ? "was" : "were"} alive then but born and died elsewhere.)`);
    lines.push("The lifespans chart marks it: hover the event above the bars.");
    return lines.join("\n");
  }
  if (!known.length) return `${ownerText} ancestors don't have enough dates on WikiTree to put them in history yet.`;
  const first = Math.min(...known.map((row) => row.start));
  const last = Math.max(...known.map((row) => row.end));
  const touched = eventsForRows(known, first, last);
  const events = touched.filter((event) => event.kind !== "record");
  const lines = [`${ownerText} ancestors lived from ${first} to ${last}${countries.length ? `, mostly in ${countries.slice(0, 3).join(", ")}` : ""}. Some of what they lived through:`];
  const picked = events
    // (counting those born or died where it happened; the world's events count everyone alive)
    .map((event) => ({ event, alive: aliveFor(event, rows).filter((entry) => eventFits(event, rowRegions(entry.row))) }))
    .filter((entry) => entry.alive.length)
    .sort((a, b) => b.alive.length - a.alive.length || a.event.start - b.event.start)
    .slice(0, 6)
    .sort((a, b) => a.event.start - b.event.start);
  picked.forEach(({ event, alive }) => {
    const oldest = alive[0];
    lines.push(`• ${eventYears(event)}, ${lower(event.label)}: ${alive.length} alive, among them ${personText(oldest, ownerText)}`);
  });
  const records = touched.filter((event) => event.kind === "record");
  if (records.length) lines.push(`For the records: ${records.slice(0, 3).map((event) => `${event.start}, ${lower(event.label)}`).join("; ")}.`);
  lines.push("The lifespans chart shows them all above the bars: hover an event, or an ancestor for what they lived through.");
  return lines.join("\n");
}

/**
 * One person's history (params.personal): the events they lived through, with
 * their age, their own country's first. row: the lifespans row for generation 0.
 */
export function buildPersonHistorySummary(row, label, fallbackCountries = [], chartNote = "The lifespans chart shows them above the bars: hover an event.") {
  if (!row?.start) return `${label} has no birth year on WikiTree, so I can't place their life in history.`;
  const end = row.end || row.start;
  const all = livedThrough({ ...row, end }, fallbackCountries);
  const events = all.filter((entry) => entry.event.kind !== "record");
  const span = `${row.start}–${row.endKnown ? end : ""}`;
  if (!events.length) return `I have no world events on my list for ${label}'s lifetime (${span}).`;
  const lines = [`${label} (${span}${row.birthLocation ? `, born in ${row.birthLocation}` : ""}) lived through:`];
  events.slice(0, 10).forEach(({ event, age }) => {
    lines.push(`• ${eventYears(event)}, ${lower(event.label)} (${age ? `aged ${age}` : "born during it"})`);
  });
  if (events.length > 10) lines.push(`…and ${events.length - 10} more.`);
  const records = all.filter((entry) => entry.event.kind === "record");
  if (records.length) lines.push(`For the records: ${records.slice(0, 3).map(({ event }) => `${event.start}, ${lower(event.label)}`).join("; ")}.`);
  if (!row.endKnown && !row.living) lines.push(`(No death year is recorded, so this assumes about 60 years.)`);
  if (chartNote) lines.push(chartNote);
  return lines.join("\n");
}
