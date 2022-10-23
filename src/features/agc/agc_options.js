import { registerFeature, OptionType } from "../../core/options/options_registry"

// The feature data for the AGC feature
const agcFeature = {
  name: "Automatic GEDCOM Cleanup (AGC)",
  id: "agc",
  description:
    "Reformats a biography and updates data fields when the profile was created from a GEDCOM.",
  category: "Editing",
  options: [
    {
      id: "bioMainText",
      type: OptionType.GROUP,
      label: "Biography main text",
      options: [
        {
          id: "spelling",
          type: OptionType.SELECT,
          label: "Spelling",
          values: [
            {
              value: "en_uk",
              text: "UK English",
            },
            {
              value: "en_us",
              text: "US English",
            },
          ],
          defaultValue: "en_uk",   
        },
        {
          id: "include_age",
          type: OptionType.SELECT,
          label: "Add age to narrative events",
          values: [
            {
              value: "none",
              text: "None",
            },
            {
              value: "death_only",
              text: "On death only",
            },
            {
              value: "death_marriage",
              text: "On death and marriages only",
            },
            {
              value: "most",
              text: "On most events",
            },
          ],
          defaultValue: "most",   
          defaultTestValue: "none",   
        },
        {
          id: "narrative_includeCountry",
          type: OptionType.SELECT,
          label: "Include country in locations in narrative events (if known)",
          values: [
            {
              value: "always",
              text: "Always (if present already in input bio)",
            },
            {
              value: "first",
              text: "Only if it is first event with that country or different to previous event",
            },
            {
              value: "never",
              text: "Never include country",
            },
          ],
          defaultValue: "always",   
        },
        {
          id: "narrative_standardizeCountry",
          type: OptionType.CHECKBOX,
          label: 'In narrative text use a standard/abbreviated name for the country (e.g. "England" rather than "England, United Kingdom")',
          defaultValue: false,
        },
        {
          id: "narrative_addAtUnknownLocation",
          type: OptionType.CHECKBOX,
          label: 'In narrative text, if a fact has no location, add the text "at an unknown location"',
          defaultValue: false,
          defaultTestValue: true,
        },
        {
          id: "narrative_useResidenceData",
          type: OptionType.CHECKBOX,
          label: 'If an employment, residence or census fact has a known record type start the narrative event with that',
          defaultValue: true,   
        },
        {
          id: "narrative_useFullCensusDate",
          type: OptionType.CHECKBOX,
          label: 'If a census style narrative event starts with just the date then use the full date if known. E.g. "On 2 April 1911 John was living in ..."',
          defaultValue: true,   
        },
        {
          id: "include_externalMedia",
          type: OptionType.CHECKBOX,
          label: 'Add an External Media section to biography if there are files referenced',
          defaultValue: true,   
        },
        {
          id: "include_mapLinks",
          type: OptionType.CHECKBOX,
          label: 'Add a link to OpenStreetMap if a fact location includes latitude and longitude',
          defaultValue: true,   
        },
        {
          id: "removeGedcomVerbiage",
          type: OptionType.CHECKBOX,
          label: 'Remove the GEDCOM import text that states which gedcom the profile was created from (only do this if the profile will be fully cleaned up and sourced)',
          defaultValue: false,   
          defaultTestValue: true,
        },
      ],
    },
    {
      id: "refsAndSources",
      type: OptionType.GROUP,
      label: "References and sources",
      options: [
        {
          id: "references_named",
          type: OptionType.SELECT,
          label: "When to use named references",
          values: [
            {
              value: "never",
              text: "Never: Each source is only referenced once. Sources will be listed in chronological order",
            },
            {
              value: "minimal",
              text: "Minimal: Only if it would otherwise leave a narrative event with no references. If so no more than one reference will be used",
            },
            {
              value: "selective",
              text: "Selective: References sources more than once only when it likely adds more accurate information to an event",
            },
            {
              value: "multiple_use",
              text: "Multiple Use: Use named references whenever a fact has multiple sources",
            },
            {
              value: "all",
              text: "All: Always named references (not recommended)",
            },
          ],
          defaultValue: "selective",
          defaultTestValue: "never",
        },
        {
          id: "references_accessedDate",
          type: OptionType.SELECT,
          label: "Add an accessed date to citation",
          values: [
            {
              value: "none",
              text: "None: Don't add it",
            },
            {
              value: "unknown",
              text: 'Unknown: Add "(accessed unknown date)"',
            },
            {
              value: "before",
              text: 'Before: Add "(accessed before [date])". For recent GEDCOMs the date is today. For older format ones it is the date it was imported if known',
            },
            {
              value: "exact",
              text: 'Today: Add "(accessed [today\'s date])". The assumption is that you will access each source after running AGC',
            },
          ],
          defaultValue: "before",
          defaultTestValue: "today",   
        },
        {
          id: "references_addNewlineBeforeFirst",
          type: OptionType.CHECKBOX,
          label: 'Add a newline before the first reference on a narrative event',
          defaultValue: false,   
        },
        {
          id: "references_addNewline",
          type: OptionType.CHECKBOX,
          label: 'Add a newline between each reference on a narrative event',
          defaultValue: false,
          defaultTestValue: true,   
        },
        {
          id: "references_addNewlineWithin",
          type: OptionType.CHECKBOX,
          label: 'Add newlines within each reference on a narrative event (after the <ref> and before the </ref>)',
          defaultValue: true,
          defaultTestValue: false,   
        },
        {
          id: "references_meaningfulNames",
          type: OptionType.CHECKBOX,
          label: 'Add a meaningful name at the start of each reference (this shows up in the "Sources" section)',
          defaultValue: true,   
        },
        {
          id: "sources_addFreeLinksForSubscriptionSources",
          type: OptionType.CHECKBOX,
          label: 'For subscription sources, attempt to add links to free sources as well (usually links that do a search)',
          defaultValue: true,   
        },
        {
          id: "sourcesWithNoDate",
          type: OptionType.GROUP,
          label: "Sources with no date or associated fact",
          options: [
            {
              type: OptionType.TEXT_LINE,
              label: 'Some of these are common and can be suppressed from being output if not desired in the bio:',
            },
            {
              id: "sources_supressChildBaptisms",
              type: OptionType.CHECKBOX,
              label: 'Ignore child baptism sources',
              defaultValue: false,   
            },
            {
              id: "sources_supressChildMarriages",
              type: OptionType.CHECKBOX,
              label: 'Ignore child marriage sources',
              defaultValue: false,   
            },
          ],
        },
      ],
    },
    {
      id: "researchNotes",
      type: OptionType.GROUP,
      label: "Research Notes",
      options: [
        {
          id: "researchNotes_alternateNames",
          type: OptionType.CHECKBOX,
          label: 'Add an Alternate Names section to Research Notes if there are multiple names',
          defaultValue: true,   
        },
        {
          id: "issuesToBeChecked",
          type: OptionType.GROUP,
          label: "Issues to be checked",
          options: [
            {
              id: "researchNotes_includeIssuesToBeChecked",
              type: OptionType.CHECKBOX,
              label: 'If issues are found report them in the "Issues to be checked" section under Research Notes',
              defaultValue: true,   
            },
            {
              id: "suppressedIssues",
              type: OptionType.GROUP,
              label: "Suppress some issues",
              options: [
                {
                  type: OptionType.TEXT_LINE,
                  label: 'If issues are being reported the following common and harmless ones can be suppressed by unchecking the box:',
                },
                {
                  id: "researchNotes_issueForClnToLastHusband",
                  type: OptionType.CHECKBOX,
                  label: 'Report if changing <b>Current Last Name</b> to last name of last husband',
                  isHtmlInLabel: true,
                  defaultValue: true,   
                },
                {
                  id: "researchNotes_issueForBirthToBeforeBaptism",
                  type: OptionType.CHECKBOX,
                  label: 'Report if changing <b>Birth Date</b> to <i>before</i> the baptism date',
                  isHtmlInLabel: true,
                  defaultValue: true,   
                },
                {
                  id: "researchNotes_issueForDeathToBeforeBurial",
                  type: OptionType.CHECKBOX,
                  label: 'Report if changing <b>Death Date</b> to <i>before</i> the burial date',
                  isHtmlInLabel: true,
                  defaultValue: true,   
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "otherFields",
      type: OptionType.GROUP,
      label: "Other fields of the profile",
      options: [
        {
          id: "otherFields_useBaptismForBirthDate",
          type: OptionType.CHECKBOX,
          label: 'If there is an exact baptism date in the same year as a year-only birth date then change the <b>Birth Date</b> field of the profile to be <i>before</i> the baptism date',
          isHtmlInLabel: true,
          defaultValue: true,   
        },
        {
          id: "otherFields_useBurialForDeathDate",
          type: OptionType.CHECKBOX,
          label: 'If there is an exact burial date in the same year as a year-only death date then change the <b>Death Date</b> field of the profile to be <i>before</i> the burial date',
          isHtmlInLabel: true,
          defaultValue: true,   
        },
        {
          id: "otherFields_useLastHusbandNameForCurrentLastName",
          type: OptionType.CHECKBOX,
          label: 'For female profiles, if the <b>Current Last Name</b> is the <b>LNAB</b> but there are marriages and the last husband\'s name is known then change the <b>CLN</b> to that',
          isHtmlInLabel: true,
          defaultValue: true,   
        },
        {
          id: "dataFields_moveNamesFromFirstToMiddle",
          type: OptionType.SELECT,
          label: "For old GEDCOM imports move additional names from the Proper First Name field to the Middle Name field",
          values: [
            {
              value: "someCountries",
              text: "Only if the profile is in UK or USA",
            },
            {
              value: "never",
              text: "Never do this",
            },
          ],
          defaultValue: "someCountries",   
        },
      ],
    },
  ],
};

// Just importing this file will register all the features
registerFeature(agcFeature);
