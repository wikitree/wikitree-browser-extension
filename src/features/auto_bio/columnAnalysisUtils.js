import { occupationList } from "./occupation_list";
import { occupationList2 } from "./occupation_list_2";

function convertOneLineCase(lines) {
  const newLines = [];
  lines.forEach((line) => {
    const ageMatch = line.match(/\s\d{1,3}/);
    if (ageMatch) {
      const age = ageMatch[0].trim();
      const parts = line.split(age);
      const name = parts[0].trim();
      let relation = "";
      if (parts[1]) {
        relation = parts[1].trim();
      }
      newLines.push(`${name}\t${age}\t${relation}`);
    }
  });
  return newLines;
}

function standardizeRelation(relation) {
  return relation.replace(/^(?:.*\s+)?([A-Za-z]+)\s*(?:-)?\s*in\s*(?:-)?\s*law\b.*/gi, (match, relationName) => {
    return relationName.charAt(0).toUpperCase() + relationName.slice(1)?.toLowerCase() + "-in-law";
  });
}

export const EnglandCounties = [
  "Bedfordshire",
  "Berkshire",
  "Bristol",
  "Buckinghamshire",
  "Cambridgeshire",
  "Cheshire",
  "Cornwall",
  "Cumbria",
  "Derbyshire",
  "Devon",
  "Dorset",
  "Durham",
  "East Riding of Yorkshire",
  "East Sussex",
  "Essex",
  "Gloucestershire",
  "Greater London",
  "Greater Manchester",
  "Hampshire",
  "Herefordshire",
  "Hertfordshire",
  "Isle of Wight",
  "Kent",
  "Lancashire",
  "Leicestershire",
  "Lincolnshire",
  "Merseyside",
  "Norfolk",
  "North Yorkshire",
  "Northamptonshire",
  "Northumberland",
  "Nottinghamshire",
  "Oxfordshire",
  "Rutland",
  "Shropshire",
  "Somerset",
  "South Yorkshire",
  "Staffordshire",
  "Suffolk",
  "Surrey",
  "Tyne and Wear",
  "Warwickshire",
  "West Midlands",
  "West Sussex",
  "West Yorkshire",
  "Wiltshire",
  "Worcestershire",
];

const EnglandHistoricCounties = [
  "Middlesex",
  "Westmorland",
  "Cumberland",
  "Rutland",
  "Huntingdonshire",
  "Monmouthshire",
  "Sutherland",
  "Breconshire",
  "Montgomeryshire",
  "Radnorshire",
  "West Riding of Yorkshire",
];

EnglandCounties.push(...EnglandHistoricCounties);

export const UKMetropolitanCities = [
  "London",
  "Birmingham",
  "Glasgow",
  "Liverpool",
  "Leeds",
  "Sheffield",
  "Edinburgh",
  "Bristol",
  "Manchester",
  "Leicester",
  "Coventry",
  "Kingston upon Hull",
  "Bradford",
  "Cardiff",
  "Belfast",
  "Stoke-on-Trent",
  "Wolverhampton",
  "Nottingham",
  "Plymouth",
  "Southampton",
  "Reading",
  "Derby",
  "Dudley",
  "Newcastle upon Tyne",
  "Northampton",
  "Portsmouth",
  "Luton",
  "Preston",
  "Aberdeen",
  "Milton Keynes",
  "Sunderland",
  "Norwich",
  "Walsall",
  "Swansea",
  "Bournemouth",
  "Southend-on-Sea",
  "Swindon",
  "Dundee",
  "Huddersfield",
  "Poole",
  "Oxford",
  "Middlesbrough",
  "Blackpool",
  "Bolton",
  "Ipswich",
  "Telford",
  "York",
  "West Bromwich",
  "Peterborough",
  "Stockport",
  "Brighton",
  "Slough",
  "Gloucester",
  "Watford",
  "Rotherham",
  "Newport",
  "Cambridge",
  "Exeter",
  "Eastbourne",
  "Sutton Coldfield",
  "Blackburn",
  "Colchester",
  "Oldham",
  "St Helens",
  "Woking",
  "Crawley",
  "Chelmsford",
  "Basildon",
  "Gillingham",
  "Worthing",
  "Solihull",
  "Rochdale",
  "Birkenhead",
  "Wigan",
  "Wakefield",
  "Cardiff",
  "Preston",
  "Sale",
  "Newcastle-under-Lyme",
];

const citiesCountiesStates = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
  "Australian Capital Territory",
  "New South Wales",
  "Northern Territory",
  "Queensland",
  "South Australia",
  "Tasmania",
  "Victoria",
  "Western Australia",
];

citiesCountiesStates.push(...EnglandCounties);
citiesCountiesStates.push(...UKMetropolitanCities);

const placeNameRegExp =
  /\w+(land|shire|mere|acres|bay|beach|bluffs|center|corner|cove|crest|crossing|falls|farms|fields|flats|fork|gardens|gate|glen|green|grove|harbor|heights|hills|hollow|inlet|key|knolls|landing|light|manor|mesa|mills|mount|mountain|orchard|park|passage|pines|point|ranch|ridge|river|runway|shores|sky|springs|terrace|trace|view|village|vista|woods|basin|cape|canyon|delta|forest|glacier|gulf|island|isthmus|lake|mesa|oasis|plain|plateau|prairie|sea|shore|sound|swamp|trail|valley|waterfall|peak|ridge|summit|pass|range|butte|knob|dome|spit|shoals|rapids|falls|bend|junction|spur|switch|fork|cross|field|estate|parkway|boulevard|circle|court|place|avenue|plaza|path|way|alley|borough|city|county|district|municipality|parish|town|township|village|territory|region|state|province|shire|ton|ham|don|wick|ford|bury|port|stadt|stede|burg|burgh|by|ville|beck|dale|holme|hurts|mead|wold|boro|chester|heath|hill|vale|wyke)\b/gi;

export function analyzeColumns(lines) {
  const columns = {};

  lines.forEach((lineOrParts) => {
    let parts;
    if (Array.isArray(lineOrParts)) {
      parts = lineOrParts;
    } else {
      lineOrParts = lineOrParts.replace(/\|\|/g, "\t");
      parts = lineOrParts.split(/ {4}|\t/);
    }

    parts.forEach((part, index) => {
      if (typeof part === "string") {
        part = part.trim();
      } else {
        part = "";
      }
      if (!columns[index]) {
        columns[index] = {
          Name: 0,
          Gender: 0,
          originalRelation: 0,
          Age: 0,
          BirthPlace: 0,
          Occupation: 0,
          MaritalStatus: 0,
          Link: 0,
          BurialPlace: 0,
        };
      }
      let matched = false;

      const bigPlacesMatch = new RegExp("\\b" + citiesCountiesStates.join("|") + "\\b", "i");
      const occupationMatch = new RegExp(
        "\\b" + occupationList.join("|") + "|" + occupationList2.join("|") + "\\b",
        "i"
      );

      const nameAndDatePattern = /^[\p{L}\p{M}\s]+ \(\d{4}-\d{4}\)$/u;
      const isValidName = /[\p{L}\p{M}]{2}/u.test(part) && !/^\d+$/.test(part);

      if (index === 0 && part.match(nameAndDatePattern)) {
        columns[index].Name++;
        matched = true;
      }

      if (index === 0 && !matched && isValidName) {
        columns[index].Name++;
        matched = true;
      }

      if (!matched && part.match(/(?:M|F|Male|Female)\b/i)) {
        columns[index].Gender++;
        matched = true;
      }

      if (!matched && part.match(/married|widowed|single/i)) {
        columns[index].MaritalStatus++;
        matched = true;
      }

      if (
        !matched &&
        part.match(
          /\b(Head|Wife|Son|Daughter|Mother|Father|Brother|Sister|Grand(?:mother|father)|Uncle|Aunt|Niece|Nephew|Cousin|(Father|Mother|Brother|Sister|Son|Daughter)-in-law|Step(?:son|daughter|brother|sister|mother|father)|Visitor|Lodger|Boarder)\b/i
        )
      ) {
        columns[index].originalRelation++;
        matched = true;
      }

      const ageMatch = part.match(/^(\d{1,3})( ?y| ?years| ?months| ?mo\.)?$/);
      if (ageMatch && Number(ageMatch[1]) < 130) {
        columns[index].Age++;
        matched = true;
      }

      if (part.match(/,/) || part.match(bigPlacesMatch) || part.match(placeNameRegExp)) {
        columns[index].BirthPlace++;
        matched = true;
      }
      if (part.match(occupationMatch)) {
        columns[index].Occupation++;
        matched = true;
      }

      if (!matched && part.match(/Plot|Buried|Churchyard/i)) {
        columns[index].BurialPlace++;
        matched = true;
      }

      if (!matched && part.match(/https?:\/\/www.wikitree.com/i)) {
        columns[index].Link++;
        matched = true;
      }

      if (!matched && part !== "") {
        columns[index].BirthPlace++;
      }
    });
  });

  const columnPriority = [
    "Name",
    "Gender",
    "originalRelation",
    "Age",
    "BirthPlace",
    "Occupation",
    "MaritalStatus",
    "Link",
    "BurialPlace",
  ];
  const assignedColumnNames = new Set();
  const columnMapping = {};

  for (const columnName of columnPriority) {
    let maxScore = 0;
    let maxScoreIndex = null;

    for (const [index, column] of Object.entries(columns)) {
      if (!Object.values(columnMapping).includes(index) && column) {
        const score = column[columnName];
        if (!assignedColumnNames.has(columnName) && score > maxScore) {
          maxScore = score;
          maxScoreIndex = index;
        }
      }
    }

    const minCount = lines.length <= 2 ? 1 : 2;

    if (maxScoreIndex !== null && maxScore >= minCount) {
      columnMapping[columnName] = maxScoreIndex;
      assignedColumnNames.add(columnName);
    }
  }

  return columnMapping;
}

export function parseFamilyDataLines(familyData, options = { format: "list", year: "" }) {
  const oneLineCase = Array.isArray(familyData);
  let lines = oneLineCase ? familyData : familyData.split("\n");
  if (oneLineCase) {
    lines = convertOneLineCase(lines);
  }
  const columnMapping = analyzeColumns(lines, oneLineCase);
  const result = lines.map((line) => {
    const lineRegex = /\s{4}|\t/;
    const parts = line.split(lineRegex);
    const person = {};

    Object.keys(columnMapping).forEach((key) => {
      const part = parts[columnMapping[key]];

      if (key === "Name") {
        person[key] = part.replace(/^[*#:]+/, "").trim();
      } else if (key === "Gender") {
        person[key] = part === "M" ? "Male" : "Female";
      } else {
        person[key] = part;
      }

      if (options.year && key === "Age") {
        person.BirthYear = parseInt(options.year - person[key]);
      }
    });

    if (person.originalRelation) {
      person.originalRelation = standardizeRelation(person.originalRelation);
    }
    return person;
  });
  return result;
}
