/**
 * SQL Wizard templates for WikiTree+ Query Builder
 * Organized by category with comprehensive WT+ SQL examples
 */

const normalizeSqlValue = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "_");

function parseDatePatternInput(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // Preferred format: dd/mm/yyyy, with ? wildcard support.
  let m = raw.match(/^([\d?*]{2})\/([\d?*]{2})\/([\d?*]{4})$/);
  let pattern;

  if (m) {
    const day = m[1].replace(/\*/g, "?");
    const month = m[2].replace(/\*/g, "?");
    const year = m[3].replace(/\*/g, "?");
    pattern = `${year}${month}${day}`;
  } else {
    m = raw.match(/^([\d?*]{4})-([\d?*]{2})-([\d?*]{2})$/);
    if (!m) return "";
    const year = m[1].replace(/\*/g, "?");
    const month = m[2].replace(/\*/g, "?");
    const day = m[3].replace(/\*/g, "?");
    pattern = `${year}${month}${day}`;
  }

  if (!pattern.includes("?")) {
    const year = Number(pattern.slice(0, 4));
    const month = Number(pattern.slice(4, 6));
    const day = Number(pattern.slice(6, 8));
    const probe = new Date(Date.UTC(year, month - 1, day));
    if (probe.getUTCFullYear() !== year || probe.getUTCMonth() + 1 !== month || probe.getUTCDate() !== day) {
      return "";
    }
  }

  return pattern;
}

function getDateBounds(value) {
  const pattern = parseDatePatternInput(value);
  if (!pattern) {
    return "";
  }

  return {
    pattern,
    exact: pattern,
    min: pattern.replace(/\?/g, "0"),
    max: pattern.replace(/\?/g, "9"),
    hasWildcard: pattern.includes("?"),
  };
}

export const SQL_TEMPLATES = [
  // Names
  {
    category: "Names",
    id: "first-name-exact",
    label: "First name equals",
    description: "Find profiles with exact first name",
    buildSql: (n) => {
      const v = normalizeSqlValue(n);
      return v ? `sql="([Default].[First Name].AsString = '${v}')"` : "";
    },
    inputs: [{ type: "text", label: "First name", placeholder: "John" }],
  },
  {
    category: "Names",
    id: "last-name-birth",
    label: "Last name at birth equals",
    description: "Find profiles with exact last name at birth",
    buildSql: (n) => {
      const v = normalizeSqlValue(n);
      return v ? `sql="([Default].[Last Name at Birth].AsString = '${v.toLowerCase()}')"` : "";
    },
    inputs: [{ type: "text", label: "Last name", placeholder: "berkelmans" }],
  },
  {
    category: "Names",
    id: "current-last-name",
    label: "Current last name equals",
    description: "Find profiles with exact current last name",
    buildSql: (n) => {
      const v = normalizeSqlValue(n);
      return v ? `sql="([Default].[Current Last Name].AsString = '${v.toLowerCase()}')"` : "";
    },
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
    id: "birth-on",
    label: "Born on date",
    description: "Find profiles born on specified date",
    buildSql: (d) => {
      const b = getDateBounds(d);
      if (!b) return "";
      return b.hasWildcard
        ? `sql="([Default].[Birth Date].AsString Like '${b.pattern}')"`
        : `sql="([Default].[Birth Date].AsNumber = ${b.exact})"`;
    },
    inputs: [{ type: "text", label: "Date", placeholder: "dd/mm/yyyy" }],
  },
  {
    category: "Dates: Birth",
    id: "birth-before",
    label: "Born before date",
    description: "Find profiles born before specified date",
    buildSql: (d) => {
      const b = getDateBounds(d);
      return b ? `sql="([Default].[Birth Date].AsNumber < ${b.max})"` : "";
    },
    inputs: [{ type: "text", label: "Date", placeholder: "dd/mm/yyyy" }],
  },
  {
    category: "Dates: Birth",
    id: "birth-after",
    label: "Born after date",
    description: "Find profiles born after specified date",
    buildSql: (d) => {
      const b = getDateBounds(d);
      return b ? `sql="([Default].[Birth Date].AsNumber > ${b.min})"` : "";
    },
    inputs: [{ type: "text", label: "Date", placeholder: "dd/mm/yyyy" }],
  },
  {
    category: "Dates: Birth",
    id: "birth-between",
    label: "Born between dates",
    description: "Find profiles born between two dates",
    buildSql: (s, e) => {
      const sb = getDateBounds(s);
      const eb = getDateBounds(e);
      return sb && eb && sb.min <= eb.max ? `sql="([Default].[Birth Date].AsNumber In ${sb.min}..${eb.max})"` : "";
    },
    inputs: [
      { type: "text", label: "Start", placeholder: "dd/mm/yyyy" },
      { type: "text", label: "End", placeholder: "dd/mm/yyyy" },
    ],
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
    id: "death-on",
    label: "Died on date",
    description: "Find profiles who died on specified date",
    buildSql: (d) => {
      const b = getDateBounds(d);
      if (!b) return "";
      return b.hasWildcard
        ? `sql="([Default].[Death Date].AsString Like '${b.pattern}')"`
        : `sql="([Default].[Death Date].AsNumber = ${b.exact})"`;
    },
    inputs: [{ type: "text", label: "Date", placeholder: "dd/mm/yyyy" }],
  },
  {
    category: "Dates: Death",
    id: "death-before",
    label: "Died before date",
    description: "Find profiles who died before specified date",
    buildSql: (d) => {
      const b = getDateBounds(d);
      return b ? `sql="([Default].[Death Date].AsNumber < ${b.max})"` : "";
    },
    inputs: [{ type: "text", label: "Date", placeholder: "dd/mm/yyyy" }],
  },
  {
    category: "Dates: Death",
    id: "death-after",
    label: "Died after date",
    description: "Find profiles who died after specified date",
    buildSql: (d) => {
      const b = getDateBounds(d);
      return b ? `sql="([Default].[Death Date].AsNumber > ${b.min})"` : "";
    },
    inputs: [{ type: "text", label: "Date", placeholder: "dd/mm/yyyy" }],
  },
  {
    category: "Dates: Death",
    id: "death-between",
    label: "Died between dates",
    description: "Find profiles who died between two dates",
    buildSql: (s, e) => {
      const sb = getDateBounds(s);
      const eb = getDateBounds(e);
      return sb && eb && sb.min <= eb.max ? `sql="([Default].[Death Date].AsNumber In ${sb.min}..${eb.max})"` : "";
    },
    inputs: [
      { type: "text", label: "Start", placeholder: "dd/mm/yyyy" },
      { type: "text", label: "End", placeholder: "dd/mm/yyyy" },
    ],
  },
  {
    category: "Dates: Death",
    id: "death-decade",
    label: "Died in decade",
    description: "Find profiles who died in a specific decade",
    buildSql: (d) => {
      const cleaned = String(d || "").replace(/[^0-9]/g, "");
      const decade = cleaned.slice(0, 4);
      if (!/^[0-9]{4}$/.test(decade) || !decade.endsWith("0")) return "";
      const s = decade + "0000";
      const e = String(parseInt(decade, 10) + 9) + "9999";
      return `sql="([Default].[Death Date].AsNumber In ${s}..${e})"`;
    },
    inputs: [{ type: "text", label: "Decade", placeholder: "1950s" }],
  },
  {
    category: "Dates: Death",
    id: "death-no-day",
    label: "Death without day",
    description: "Find profiles where day of death is not set",
    buildSql: () => "sql=\"([Default].[Death Date].AsString Like '*00')\"",
    inputs: [],
  },
  {
    category: "Dates: Death",
    id: "death-year-only",
    label: "Death year only",
    description: "Find profiles with only death year (no month/day)",
    buildSql: () => "sql=\"([Default].[Death Date].AsString Like '*0000')\"",
    inputs: [],
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
    buildSql: (t) => {
      const v = normalizeSqlValue(t);
      return v ? `sql="([Default].[Birth Location].AsString Like '*${v}*')"` : "";
    },
    inputs: [{ type: "text", label: "Location text", placeholder: "azores" }],
  },
  {
    category: "Locations",
    id: "death-location",
    label: "Death location contains",
    description: "Find profiles with text in death location",
    buildSql: (t) => {
      const v = normalizeSqlValue(t);
      return v ? `sql="([Default].[Death Location].AsString Like '*${v}*')"` : "";
    },
    inputs: [{ type: "text", label: "Location text", placeholder: "azores" }],
  },
  {
    category: "Locations",
    id: "birth-country",
    label: "Birth country equals",
    description: "Find profiles by birth country",
    buildSql: (c) => {
      const v = normalizeSqlValue(c);
      return v ? `sql="([Default].[Birth Location Country].AsString = '${v.toLowerCase()}')"` : "";
    },
    inputs: [{ type: "text", label: "Country", placeholder: "canada" }],
  },
  {
    category: "Locations",
    id: "birth-unrecognized-locations",
    label: "Unrecognized birth locations",
    description: "Find profiles with unrecognized birth locations",
    buildSql: () => "sql=\"(Trim([Default].[Birth Location Country, Region, City].AsString) = '')\"",
    inputs: [],
  },
  {
    category: "Locations",
    id: "death-country",
    label: "Death country equals",
    description: "Find profiles by death country",
    buildSql: (c) => {
      const v = normalizeSqlValue(c);
      return v ? `sql="([Default].[Death Location Country].AsString = '${v.toLowerCase()}')"` : "";
    },
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
    id: "marriage-on",
    label: "Married on date",
    description: "Find marriages on specified date",
    buildSql: (d) => {
      const b = getDateBounds(d);
      if (!b) return "";
      return b.hasWildcard
        ? `sql="([Marriage].[Marriage Date].AsString Like '${b.pattern}')"`
        : `sql="([Marriage].[Marriage Date].AsNumber = ${b.exact})"`;
    },
    inputs: [{ type: "text", label: "Date", placeholder: "dd/mm/yyyy" }],
  },
  {
    category: "Marriage",
    id: "marriage-before",
    label: "Married before date",
    description: "Find marriages before specified date",
    buildSql: (d) => {
      const b = getDateBounds(d);
      return b ? `sql="([Marriage].[Marriage Date].AsNumber < ${b.max})"` : "";
    },
    inputs: [{ type: "text", label: "Date", placeholder: "dd/mm/yyyy" }],
  },
  {
    category: "Marriage",
    id: "marriage-after",
    label: "Married after date",
    description: "Find marriages after specified date",
    buildSql: (d) => {
      const b = getDateBounds(d);
      return b ? `sql="([Marriage].[Marriage Date].AsNumber > ${b.min})"` : "";
    },
    inputs: [{ type: "text", label: "Date", placeholder: "dd/mm/yyyy" }],
  },
  {
    category: "Marriage",
    id: "marriage-date-between",
    label: "Marriage date between",
    description: "Find marriages between two dates",
    buildSql: (from, to) => {
      const fb = getDateBounds(from);
      const tb = getDateBounds(to);
      return fb && tb && fb.min <= tb.max ? `sql="([Marriage].[Marriage Date] in ${fb.min}..${tb.max})"` : "";
    },
    inputs: [
      { type: "text", label: "From", placeholder: "dd/mm/yyyy" },
      { type: "text", label: "To", placeholder: "dd/mm/yyyy" },
    ],
  },
  {
    category: "Marriage",
    id: "marriage-decade",
    label: "Married in decade",
    description: "Find marriages in a specific decade",
    buildSql: (d) => {
      const cleaned = String(d || "").replace(/[^0-9]/g, "");
      const decade = cleaned.slice(0, 4);
      if (!/^[0-9]{4}$/.test(decade) || !decade.endsWith("0")) return "";
      const s = decade + "0000";
      const e = String(parseInt(decade, 10) + 9) + "9999";
      return `sql="([Marriage].[Marriage Date].AsNumber In ${s}..${e})"`;
    },
    inputs: [{ type: "text", label: "Decade", placeholder: "1950s" }],
  },
  {
    category: "Marriage",
    id: "marriage-no-day",
    label: "Marriage without day",
    description: "Find marriages where day is not set",
    buildSql: () => "sql=\"([Marriage].[Marriage Date].AsString Like '*00')\"",
    inputs: [],
  },
  {
    category: "Marriage",
    id: "marriage-year-only",
    label: "Marriage year only",
    description: "Find marriages with only year (no month/day)",
    buildSql: () => "sql=\"([Marriage].[Marriage Date].AsString Like '*0000')\"",
    inputs: [],
  },
  {
    category: "Marriage",
    id: "marriage-location-like",
    label: "Marriage location contains phrase",
    description: "Match exact phrases in marriage location",
    buildSql: (p) => {
      const v = normalizeSqlValue(p);
      return v ? `sql=\"([Marriage].[Marriage Location].AsString like '*${v}*')\"` : "";
    },
    inputs: [{ type: "text", label: "Phrase", placeholder: "West Sussex" }],
  },
  {
    category: "Marriage",
    id: "marriage-unrecognized-locations",
    label: "Unrecognized marriage locations",
    description: "Find marriages with empty location",
    buildSql: () => "sql=\"(Trim([Marriage].[Marriage Location].AsString) = '')\"",
    inputs: [],
  },
  {
    category: "Marriage",
    id: "marriage-country",
    label: "Marriage country equals",
    description: "Find marriages by country text at end of location",
    buildSql: (c) => {
      const v = normalizeSqlValue(c).toLowerCase();
      return v ? `sql="([Marriage].[Marriage Location].AsString Like '*${v}')"` : "";
    },
    inputs: [{ type: "text", label: "Country", placeholder: "canada" }],
  },
  {
    category: "Marriage",
    id: "single-marriage",
    label: "Exactly N marriage(s)",
    description: "Filter profiles with exactly N marriage entries",
    buildSql: (c) => {
      const n = Number.parseInt(c, 10);
      const target = Number.isFinite(n) && n > 0 ? n : 1;
      return `sql="([Marriage].[Marriage Location].LineCount = ${target})"`;
    },
    inputs: [{ type: "number", label: "Exact marriages", placeholder: "1" }],
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
      const b = getDateBounds(d);
      return b ? `sql="([Bio].[Created Date].AsNumber > ${b.min})"` : "";
    },
    inputs: [{ type: "text", label: "Date", placeholder: "dd/mm/yyyy" }],
  },
  {
    category: "Management",
    id: "created-before",
    label: "Created before date",
    description: "Find profiles created before specified date",
    buildSql: (d) => {
      const b = getDateBounds(d);
      return b ? `sql="([Bio].[Created Date].AsNumber < ${b.max})"` : "";
    },
    inputs: [{ type: "text", label: "Date", placeholder: "dd/mm/yyyy" }],
  },
  {
    category: "Management",
    id: "edited-range",
    label: "Edited in date range",
    description: "Find profiles edited between two dates",
    buildSql: (s, e) => {
      const sb = getDateBounds(s);
      const eb = getDateBounds(e);
      return sb && eb && sb.min <= eb.max ? `sql="([Bio].[LastEdit Date].AsNumber In ${sb.min}..${eb.max})"` : "";
    },
    inputs: [
      { type: "text", label: "Start", placeholder: "dd/mm/yyyy" },
      { type: "text", label: "End", placeholder: "dd/mm/yyyy" },
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
    buildSql: (h) => {
      const v = normalizeSqlValue(h);
      return v ? `sql="([Bio].[Headings].AsString Like '*${v}*')"` : "";
    },
    inputs: [{ type: "text", label: "Heading", placeholder: "Acknowledgements" }],
  },
  // Biography / Headings
  {
    category: "Biography",
    id: "bio-missing-sources-after-bio",
    label: "Missing Sources after Biography",
    description: "Find profiles without Biography followed by Sources heading",
    buildSql: () => "sql=\"Not([Bio].[Headings].AsString Like '*B2*S2*')\"",
    inputs: [],
  },
  // Categories
  {
    category: "Categories",
    id: "missing-category",
    label: "Missing specific category",
    description: "Find profiles missing a category (uses All Categories)",
    buildSql: (c) => {
      const v = normalizeSqlValue(c);
      return v ? `sql=\"Not ([Default].[All Categories].AsString Like '*${v}*')\"` : "";
    },
    inputs: [{ type: "text", label: "Category slug", placeholder: "dombrowken,_strasburg,_westpreussen" }],
  },
  // Templates
  {
    category: "Templates",
    id: "template-name-text",
    label: "Template name + text",
    description: "Match template name and a phrase in template text",
    buildSql: (name, text) => {
      const n = normalizeSqlValue(name);
      const t = normalizeSqlValue(text);
      return n && t
        ? `sql=\"([Templates].[Template name].AsString = '${n}') And ([Templates].[Template text].AsString Like '*${t}*')\"`
        : "";
    },
    inputs: [
      { type: "text", label: "Template name", placeholder: "Community Event" },
      { type: "text", label: "Template text", placeholder: "2023" },
    ],
  },
  {
    category: "Templates",
    id: "template-text-contains",
    label: "Template text contains",
    description: "Find templates with specific parameter text",
    buildSql: (t) => {
      const v = normalizeSqlValue(t);
      return v ? `sql=\"([Templates].[Template text].AsString Like '*${v}*')\"` : "";
    },
    inputs: [{ type: "text", label: "Text", placeholder: "=right" }],
  },
  // Managers
  {
    category: "Managers",
    id: "managed-only-by",
    label: "Managed only by",
    description: "Find profiles managed only by one manager",
    buildSql: (m) => {
      const v = normalizeSqlValue(m);
      return v ? `sql=\"([Default].[All Managers].AsString = '${v}')\"` : "";
    },
    inputs: [{ type: "text", label: "Manager ID", placeholder: "guile-361" }],
  },
  // DNA
  {
    category: "DNA",
    id: "mt-haplogroup",
    label: "mtDNA haplogroup contains",
    description: "Find profiles with mtDNA haplogroup match",
    buildSql: (h) => {
      const v = normalizeSqlValue(h);
      return v ? `sql=\"([Bio].[Replicated DNA mtHaplogroup].AsString Like '*${v}*')\"` : "";
    },
    inputs: [{ type: "text", label: "Haplogroup", placeholder: "H1c" }],
  },
  {
    category: "DNA",
    id: "y-haplogroup",
    label: "yDNA haplogroup contains",
    description: "Find profiles with yDNA haplogroup match",
    buildSql: (h) => {
      const v = normalizeSqlValue(h);
      return v ? `sql=\"([Bio].[Replicated DNA yHaplogroup].AsString Like '*${v}*')\"` : "";
    },
    inputs: [{ type: "text", label: "Haplogroup", placeholder: "R1b" }],
  },
  {
    category: "DNA",
    id: "gedmatch-id",
    label: "GedMatch ID contains",
    description: "Find profiles with GedMatch ID",
    buildSql: (g) => {
      const v = normalizeSqlValue(g);
      return v ? `sql=\"([Bio].[Replicated DNA GedMatchID].AsString Like '*${v}*')\"` : "";
    },
    inputs: [{ type: "text", label: "GedMatch ID", placeholder: "T660921" }],
  },
  {
    category: "DNA",
    id: "mitoy-dna-id",
    label: "mitoyDNA ID contains",
    description: "Find profiles with mitoyDNA ID",
    buildSql: (m) => {
      const v = normalizeSqlValue(m);
      return v ? `sql=\"([Bio].[Replicated DNA mitoyDNAID].AsString Like '*${v}*')\"` : "";
    },
    inputs: [{ type: "text", label: "mitoyDNA ID", placeholder: "12345" }],
  },
  {
    category: "DNA",
    id: "au-dna-lnabs",
    label: "auDNA lnabs contains",
    description: "Find profiles with auDNA lnabs match",
    buildSql: (t) => {
      const v = normalizeSqlValue(t);
      return v ? `sql=\"([bio].[replicated audna lnabs].asstring like '*${v}*')\"` : "";
    },
    inputs: [{ type: "text", label: "Text", placeholder: "waldron" }],
  },
];
