/**
 * SQL Wizard templates for WikiTree+ Query Builder
 * Organized by category with comprehensive WT+ SQL examples
 */

export const SQL_TEMPLATES = [
  // Names
  {
    category: "Names",
    id: "first-name-exact",
    label: "First name equals",
    description: "Find profiles with exact first name",
    buildSql: (n) => (n ? `sql="([Default].[First Name].AsString = '${n}')"` : ""),
    inputs: [{ type: "text", label: "First name", placeholder: "John" }],
  },
  {
    category: "Names",
    id: "last-name-birth",
    label: "Last name at birth equals",
    description: "Find profiles with exact last name at birth",
    buildSql: (n) => (n ? `sql="([Default].[Last Name at Birth].AsString = '${n.toLowerCase()}')"` : ""),
    inputs: [{ type: "text", label: "Last name", placeholder: "berkelmans" }],
  },
  {
    category: "Names",
    id: "current-last-name",
    label: "Current last name equals",
    description: "Find profiles with exact current last name",
    buildSql: (n) => (n ? `sql="([Default].[Current Last Name].AsString = '${n.toLowerCase()}')"` : ""),
    inputs: [{ type: "text", label: "Last name", placeholder: "whittemore" }],
  },
  {
    category: "Names",
    id: "no-first-name",
    label: "No first name",
    description: "Find profiles without a first name",
    buildSql: () => "sql=\"([Default].[First Name].AsString = '')\"",
    inputs: [],
  },
  // Dates - Birth
  {
    category: "Dates: Birth",
    id: "birth-before",
    label: "Born before date",
    description: "Find profiles born before specified date",
    buildSql: (d) => {
      const n = d?.replace(/-/g, "").substr(0, 8);
      return n ? `sql="([Default].[Birth Date].AsNumber < ${n})"` : "";
    },
    inputs: [{ type: "date", label: "Date", placeholder: "1852-01-01" }],
  },
  {
    category: "Dates: Birth",
    id: "birth-after",
    label: "Born after date",
    description: "Find profiles born after specified date",
    buildSql: (d) => {
      const n = d?.replace(/-/g, "").substr(0, 8);
      return n ? `sql="([Default].[Birth Date].AsNumber > ${n})"` : "";
    },
    inputs: [{ type: "date", label: "Date", placeholder: "1852-01-01" }],
  },
  {
    category: "Dates: Birth",
    id: "birth-decade",
    label: "Born in decade",
    description: "Find profiles born in a specific decade",
    buildSql: (d) => {
      const cleaned = String(d || "").replace(/[^0-9]/g, "");
      const decade = cleaned.slice(0, 4);
      if (!/^[0-9]{4}$/.test(decade) || !decade.endsWith("0")) return "";
      const s = decade + "0000";
      const e = String(parseInt(decade, 10) + 9) + "9999";
      return `sql="([Default].[Birth Date].AsNumber In ${s}..${e})"`;
    },
    inputs: [{ type: "text", label: "Decade", placeholder: "1950s" }],
  },
  {
    category: "Dates: Birth",
    id: "birth-no-day",
    label: "Birth without day",
    description: "Find profiles where day of birth is not set",
    buildSql: () => "sql=\"([Default].[Birth Date].AsString Like '*00')\"",
    inputs: [],
  },
  {
    category: "Dates: Birth",
    id: "birth-year-only",
    label: "Birth year only",
    description: "Find profiles with only year (no month/day)",
    buildSql: () => "sql=\"([Default].[Birth Date].AsString Like '*0000')\"",
    inputs: [],
  },
  // Dates - Death
  {
    category: "Dates: Death",
    id: "death-before",
    label: "Died before date",
    description: "Find profiles who died before specified date",
    buildSql: (d) => {
      const n = d?.replace(/-/g, "").substr(0, 8);
      return n ? `sql="([Default].[Death Date].AsNumber < ${n})"` : "";
    },
    inputs: [{ type: "date", label: "Date", placeholder: "1852-01-01" }],
  },
  {
    category: "Dates: Death",
    id: "long-lived",
    label: "Lived over 100 years",
    description: "Find profiles of people who lived more than 100 years",
    buildSql: () => 'sql="([Default].[Death Age].AsNumber > 100)"',
    inputs: [],
  },
  // Locations
  {
    category: "Locations",
    id: "birth-location",
    label: "Birth location contains",
    description: "Find profiles with text in birth location",
    buildSql: (t) => (t ? `sql="([Default].[Birth Location].AsString Like '*${t}*')"` : ""),
    inputs: [{ type: "text", label: "Location text", placeholder: "azores" }],
  },
  {
    category: "Locations",
    id: "death-location",
    label: "Death location contains",
    description: "Find profiles with text in death location",
    buildSql: (t) => (t ? `sql="([Default].[Death Location].AsString Like '*${t}*')"` : ""),
    inputs: [{ type: "text", label: "Location text", placeholder: "azores" }],
  },
  {
    category: "Locations",
    id: "death-country",
    label: "Death country equals",
    description: "Find profiles by death country",
    buildSql: (c) => (c ? `sql="([Default].[Death Location Country].AsString = '${c.toLowerCase()}')"` : ""),
    inputs: [{ type: "text", label: "Country", placeholder: "canada" }],
  },
  {
    category: "Locations",
    id: "unrecognized-locations",
    label: "Unrecognized death locations",
    description: "Find profiles with unrecognized death locations",
    buildSql: () => "sql=\"(Trim([Default].[Death Location Country, Region, City].AsString) = '')\"",
    inputs: [],
  },
  // Marriage
  {
    category: "Marriage",
    id: "marriage-date-like",
    label: "Marriage date (exact or wildcard)",
    description: "Find marriages by date using YYYYMMDD or wildcards",
    buildSql: (d) => (d ? `sql="([Marriage].[Marriage Date].AsString Like '${d}')"` : ""),
    inputs: [{ type: "text", label: "Date", placeholder: "19011225 or 190112**" }],
  },
  {
    category: "Marriage",
    id: "marriage-date-between",
    label: "Marriage date between",
    description: "Find marriages between two dates",
    buildSql: (from, to) => {
      const f = from?.replace(/-/g, "").slice(0, 8);
      const t = to?.replace(/-/g, "").slice(0, 8);
      return f && t ? `sql="([Marriage].[Marriage Date] in ${f}..${t})"` : "";
    },
    inputs: [
      { type: "date", label: "From", placeholder: "1499-12-31" },
      { type: "date", label: "To", placeholder: "1973-12-31" },
    ],
  },
  {
    category: "Marriage",
    id: "marriage-location-like",
    label: "Marriage location contains phrase",
    description: "Match exact phrases in marriage location",
    buildSql: (p) => (p ? `sql=\"([Marriage].[Marriage Location].AsString like '*${p}*')\"` : ""),
    inputs: [{ type: "text", label: "Phrase", placeholder: "West Sussex" }],
  },
  {
    category: "Marriage",
    id: "single-marriage",
    label: "Exactly one marriage",
    description: "Filter profiles with a single marriage entry",
    buildSql: () => 'sql="([Marriage].[Marriage Location].LineCount = 1)"',
    inputs: [],
  },
  {
    category: "Marriage",
    id: "many-marriages",
    label: "More than N marriages",
    description: "Find profiles with more than specified marriages",
    buildSql: (c) => (c ? `sql="([Marriage].[Marriage Date].LineCount > ${c})"` : ""),
    inputs: [{ type: "number", label: "Min marriages", placeholder: "2" }],
  },
  // Relations
  {
    category: "Relations",
    id: "no-father",
    label: "No father defined",
    description: "Find profiles without a father link",
    buildSql: () => 'sql="([Default].[Father id].AsNumber = 0)"',
    inputs: [],
  },
  {
    category: "Relations",
    id: "no-mother",
    label: "No mother defined",
    description: "Find profiles without a mother link",
    buildSql: () => 'sql="([Default].[Mother id].AsNumber = 0)"',
    inputs: [],
  },
  {
    category: "Relations",
    id: "many-children",
    label: "More than N children",
    description: "Find profiles with more than specified children",
    buildSql: (c) => (c ? `sql="([Children].[User ID].LineCount > ${c})"` : ""),
    inputs: [{ type: "number", label: "Min children", placeholder: "5" }],
  },
  {
    category: "Relations",
    id: "many-siblings",
    label: "More than N siblings",
    description: "Find profiles with more than specified siblings",
    buildSql: (c) => (c ? `sql="([Siblings].[User ID].LineCount > ${c})"` : ""),
    inputs: [{ type: "number", label: "Min siblings", placeholder: "5" }],
  },
  // Privacy
  {
    category: "Privacy",
    id: "public",
    label: "Public & open profiles",
    description: "Find public and open profiles only",
    buildSql: () => 'sql="([Default].[Privacy].AsNumber > 40)"',
    inputs: [],
  },
  {
    category: "Privacy",
    id: "private",
    label: "Private profiles",
    description: "Find private profiles only",
    buildSql: () => 'sql="([Default].[Privacy].AsNumber < 50)"',
    inputs: [],
  },
  // Profile Management
  {
    category: "Management",
    id: "created-after",
    label: "Created after date",
    description: "Find profiles created since specified date",
    buildSql: (d) => {
      const n = d?.replace(/-/g, "").substr(0, 8);
      return n ? `sql="([Bio].[Created Date].AsNumber > ${n})"` : "";
    },
    inputs: [{ type: "date", label: "Date", placeholder: "2024-01-01" }],
  },
  {
    category: "Management",
    id: "created-before",
    label: "Created before date",
    description: "Find profiles created before specified date",
    buildSql: (d) => {
      const n = d?.replace(/-/g, "").substr(0, 8);
      return n ? `sql="([Bio].[Created Date].AsNumber < ${n})"` : "";
    },
    inputs: [{ type: "date", label: "Date", placeholder: "2024-01-01" }],
  },
  {
    category: "Management",
    id: "edited-range",
    label: "Edited in date range",
    description: "Find profiles edited between two dates",
    buildSql: (s, e) => {
      const sd = s?.replace(/-/g, "").substr(0, 8);
      const ed = e?.replace(/-/g, "").substr(0, 8);
      return sd && ed && new Date(s) < new Date(e) ? `sql="([Bio].[LastEdit Date].AsNumber In ${sd}..${ed})"` : "";
    },
    inputs: [
      { type: "date", label: "Start", placeholder: "2024-01-01" },
      { type: "date", label: "End", placeholder: "2024-12-31" },
    ],
  },
  {
    category: "Management",
    id: "created-year",
    label: "Created in year",
    description: "Find profiles created in a specific year",
    buildSql: (y) => (y ? `sql="([Bio].[Created Year].AsNumber = ${y})"` : ""),
    inputs: [{ type: "number", label: "Year", placeholder: "2020" }],
  },
  {
    category: "Management",
    id: "many-errors",
    label: "Many error suggestions",
    description: "Find profiles with more than specified errors",
    buildSql: (c) => (c ? `sql="([Default].[Nr of errors].AsNumber > ${c})"` : ""),
    inputs: [{ type: "number", label: "Min errors", placeholder: "10" }],
  },
  {
    category: "Management",
    id: "multiple-managers",
    label: "Multiple managers",
    description: "Find profiles with more than one manager",
    buildSql: () => 'sql="([Manager].[ManagerWikitreeId].LineCount > 1)"',
    inputs: [],
  },
  {
    category: "Management",
    id: "no-category",
    label: "No categories assigned",
    description: "Find profiles without any category",
    buildSql: () => 'sql="([Categories].[Category].LineCount = 0)"',
    inputs: [],
  },
  {
    category: "Management",
    id: "from-gedcom",
    label: "Imported from GEDCOM",
    description: "Find profiles imported using GEDCOM",
    buildSql: () => "sql=\"([Bio].[GED File].AsString <> '')\"",
    inputs: [],
  },
  {
    category: "Management",
    id: "with-heading",
    label: "Has heading",
    description: "Find profiles with specific heading",
    buildSql: (h) => (h ? `sql="([Bio].[Headings].AsString Like '*${h}*')"` : ""),
    inputs: [{ type: "text", label: "Heading", placeholder: "Acknowledgements" }],
  },
];
