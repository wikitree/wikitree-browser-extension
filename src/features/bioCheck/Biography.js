/*
Created By: Kay Knight (Sands-1865)
*/

/*
The MIT License (MIT)

Copyright (c) 2025 Kathryn J Knight

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/* **********************************************************************************
 * *****************************    WARNING    **************************************
 *
 * This class is used in the BioCheck app, in the WikiTree Dynamic Tree and in the 
 * WikiTree Browser Extension. Ensure that any changes do not bring in components 
 * that are not supported in each of these environments.
 *
 * **********************************************************************************
 * ******************************************************************************** */

/**
 * Parse and validate a WikiTree biography.
 * Gathers information about style and the parts needed to validate,
 * along with information about the bio. Provides methods to parse and validate.
 * @param theSourceRules {SourceRules} source rules for validating sources
 */
export class Biography {
  #sourceRules = null; // rules for testing sources
  #bioLines = []; // lines in the biography
  #bioHeadingsFound = []; // biography headings found (multi lang)
  #sourcesHeadingsFound = []; // sources headings found (multi lang)
  #invalidSpanTargetList = []; // target of a span that are not valid
  #refStringList = []; // all the <ref> this </ref> lines
  #refNamesDefined = new Set();  // all the <ref> with a defined name 
  #refNamesUsed = new Set();  // all the ref names that are used
  #refNamesMultiple = new Set();  // all the ref names that are defined > once
  #headings = [];    // collection of heading lines
  #wrongLevelHeadings = [];   // collection of wrong level 2 headings
  #researchNoteBoxes = [];   // what research notes boxes are there?
  #unexpectedLines = [];       // unexpected lines before bio heading
  #missingRnb = [];  // missing Research Note Boxes
  #headingBeforeBiography = false;

  #bioInputString = ""; // input string may be modified by processing
  #biographyIndex = -1; // line with the biography heading 
  #acknowledgementsEndIndex = -1; // next heading or end of bio
  #sourcesIndex = -1; // first line of sources
  #referencesIndex = -1; // index into vector for <references tag
  #acknowledgementsIndex = -1; // first line of acknowledgements
  #researchNotesIndex = -1; // first line of researchNotes
  #researchNotesEndIndex = -1; // last line of research notes is next heading
  #advanceDirectiveIndex = -1;  // start of advance directive
  #advanceDirectiveEndIndex = -1;  // end of advance directive

  #isPre1700 = false; // is this a pre1700 profile
  #isPre1500 = false; // is this a pre1500 profile
  #tooOldToRemember = false; // is this profile to old to remember
  #treatAsPre1700 = false; // treat all profiles as pre1700
  #bioSearchString = '';  // string to search for in bio

  #fatherDnaMarked = false;  // is profile marked as father DNA confirmed?
  #motherDnaMarked = false;  // is profile marked as mother DNA confirmed?

  // Hold results of parsing and validating a WikiTree biography
  #stats = {
      bioIsEmpty: false,
      bioHasCategories: false,
      bioIsMarkedUnsourced: false,
      bioIsUndated: false,
      totalBioLines: 0,
      inlineReferencesCount: 0, // number of <ref>
      possibleSourcesLineCount: 0, // number of lines that might contain sources
      bioHasProblems: false,
    };
  #style = {
      bioHasNonCategoryTextBeforeBiographyHeading: false,
      bioHasStyleIssues: false,
      hasEndlessComment: false,
      bioIsMissingBiographyHeading: false,
      bioHeadingWithNoLinesFollowing: false,
      bioHasMultipleBioHeadings: false,
      bioHasRefWithoutEnd: false,
      bioHasSpanWithoutEndingSpan: false,
      bioIsMissingSourcesHeading: false,
      sourcesHeadingHasExtraEqual: false,
      bioHasMultipleSourceHeadings: false,
      misplacedLineCount: 0, // between Sources and <references />
      bioIsMissingReferencesTag: false,
      bioHasMultipleReferencesTags: false,
      bioHasRefAfterReferences: false,
      acknowledgementsHeadingHasExtraEqual: false,
      advanceDirectiveHeadingHasExtraEqual: false,
      advanceDirectiveOnNonMemberProfile: false,
      bioHasAcknowledgementsBeforeSources: false,
      bioHasSectionAfterAdvanceDirective: false,
      bioHasUnknownSectionHeadings: false,
      bioCategoryNotAtStart: false,
      bioMissingResearchNoteBox: false,
      bioMightHaveEmail: false,
      bioHasSearchString: false,
      bioHasBrWithoutEnd: false,
      bioHasPaternalDnaConf: false,
      bioHasMaternalDnaConf: false,
      bioHasIncompleteDNAconfirmation : false,
  };
  #sources = {
      sourcesFound: false,
      invalidSource: [], // Invalid sources that were found 
      validSource: [],
      invalidDnaSourceList: [], // Invalid source list for reporting
  };
  #messages = {
    sectionMessages: [],
    styleMessages: [],
  };

  #dnaReason = ""  // Why is DNA confirmation incomplete
  #dnaSourceList = []; // DNA confirmation source -- collection of source and reason

  static #START_OF_COMMENT = "<!--";
  static #END_OF_COMMENT = "-->";
  static #START_OF_BR = "<br";
  static #REF_START = "<ref>";
  static #REF_END = "</ref>";
  static #END_BRACKET = ">";
  static #START_BRACKET = "<";
  static #HEADING_START = "==";
  static #CATEGORY_SYNTAX = "[[";
  static #CATEGORY_START = "[[category";
  static #REFERENCES_TAG = "<references";
  static #UNSOURCED = "unsourced";
  static #UNSOURCED_TAG = "{{unsourced";
  static #UNSOURCED_TAG2 = "{{ unsourced";
  static #SPAN_TARGET_START = "<span id=";
  static #SPAN_TARGET_END = "</span>";
  static #SPAN_REFERENCE_START = "[[#";
  static #SPAN_REFERENCE_END = "]]";
  static #SOURCE_START = "source:";
  static #SEE_ALSO = "see also";
  static #SEE_ALSO2 = "ver tambiéna";
  static #SEE_ALSO3 = "ver también";
  static #TEMPLATE_START = "{{";
  static #TEMPLATE_END = "}}";
  static #NOTOC = "__notoc__";
  static #TOC = "__toc__";
  static #MIN_SOURCE_LEN = 15; // minimum length for valid source

  /**
   * Constructor
   */
  constructor(theSourceRules) {
    this.#sourceRules = theSourceRules;
  }

  /**
   * Treat all profiles as Pre-1700
   */
  applyPre1700ToAll() {
    this.#treatAsPre1700 = true; 
    this.#tooOldToRemember = true;
  }

  /**
   * Parse contents of the bio.
   * After using this, the contents can be validated. 
   * Information about the biography style can be accessed via get methods.
   * @param {String} inStr the bio string. This contains the bio as returned 
   * by the WikiTree API in Wiki format for the profile. Alternately, it can
   * be contents obtained from the Edit or Add person pages.
   * @param {BioCheckPerson} thePerson person to check
   * @param {String} bioSearchString search string to search for in bio
   */
  parse(inStr, thePerson, bioSearchString) {
    this.#isPre1500 = thePerson.isPre1500();
    this.#isPre1700 = thePerson.isPre1700();
    this.#tooOldToRemember = thePerson.isTooOldToRemember();
    this.#stats.bioIsUndated = thePerson.isUndated();
    this.#bioSearchString = bioSearchString;
    this.#fatherDnaMarked = thePerson.person.fatherDnaConfirmed;
    this.#motherDnaMarked = thePerson.person.motherDnaConfirmed;

    this.#bioInputString = inStr;
    // Check for empty bio
    if (this.#bioInputString.length === 0) {
      this.#stats.bioIsEmpty = true;
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Biography is empty');
      return;
    }
    // check for endless comment
    this.#bioInputString = this.#swallowComments(this.#bioInputString);
    if (this.#style.hasEndlessComment) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Comment with no ending');
      return;
    }
    // assume no style issues
    this.#style.bioHasStyleIssues = false;

    // swallow any <br>
    this.#bioInputString = this.#swallowBr(this.#bioInputString);

    let haveResearchNoteBox = false;
    let haveNavBoxConfused = false;
    let haveNavBoxSuccession = false;
    let haveProjectBox = false;
    let haveBiography = false;
    let haveTextLine = false;

    // build a vector of each line in the bio then iterate
    this.#getLines(this.#bioInputString);
    let lineCount = this.#bioLines.length;
    let currentIndex = 0;
    
    // when you find a template {{ it might encompass multiple lines
    // so you want to combine them until you find the line with the }}
    // and you also want the line after the {{ and up to the first | or the }} to test
    while (currentIndex < lineCount) {
      let mixedCaseLine = this.#bioLines[currentIndex].trim();
      let line = this.#bioLines[currentIndex].toLowerCase().trim();
      let linesToSkip = 0;
      if (line.length > 0) {         // something here?
        if (line.indexOf(Biography.#REFERENCES_TAG) >= 0) {
          this.#referencesIndex = currentIndex;
        }
        if (line.startsWith(Biography.#HEADING_START)) {
          this.#evaluateHeadingLine(line, currentIndex, this.#bioLines[currentIndex]);
          if (this.#biographyIndex >= 0) {
            haveBiography = true;
          }
        } 
        if (this.#checkForEmail(line)) {
          this.#style.bioMightHaveEmail = true;
        }
        this.#checkRecommendedHtml(line, mixedCaseLine);

        if (this.#bioSearchString.length > 0) {
          if (line.includes(this.#bioSearchString.toLowerCase())) {
            this.#style.bioHasSearchString = true;
          }
        }
        // Check for stuff before the biography
        if (line.startsWith(Biography.#CATEGORY_SYNTAX)) {
          line = line.replace("[[ ", "[[");
        }
        if (line.startsWith(Biography.#CATEGORY_START)) {
          // Report category out of order with the last thing reported first so that
          // you only get one reported per category
          // out of order if RNB, Project Box, Nav Box or Biography heading preceeds
          if (haveResearchNoteBox || haveNavBoxConfused || haveNavBoxSuccession || haveProjectBox || haveBiography || haveTextLine) {
            this.#style.bioCategoryNotAtStart = true;
            if (haveBiography) {
              this.#messages.styleMessages.push('Biography heading before ' + this.#bioLines[currentIndex]);
            } else {
              if (haveTextLine) {
                this.#messages.styleMessages.push('Summary Text before ' + this.#bioLines[currentIndex]);
              } else {
                if (haveNavBoxSuccession) {
                    this.#messages.styleMessages.push('Succession Navigation Box before ' + this.#bioLines[currentIndex]);
                } else {
                  if (haveProjectBox) {
                    this.#messages.styleMessages.push('Project Box before ' + this.#bioLines[currentIndex]);
                  } else {
                    if (haveResearchNoteBox) {
                      this.#messages.styleMessages.push('Research Note Box before ' + this.#bioLines[currentIndex]);
                    } else {
                      if (haveNavBoxConfused) {
                        this.#messages.styleMessages.push('Easily Confused Navigation Box before ' + this.#bioLines[currentIndex]);
                      }
                    }
                  }
                }
              }
            }
          }
          this.#stats.bioHasCategories = true;
          if (line.includes(Biography.#UNSOURCED)) {
            this.#stats.bioIsMarkedUnsourced = true;
          }
          // check for a location if profile has any
          if (thePerson.hasLocation()) {
            let str = line.replace('category:', '');
            // don't do this one str = str.replace('us black heritage project, unsourced profiles', '');
            str = str.replace('unsourced_profiles', '');
            str = str.replace('[[', '');
            str = str.replace(']]', '');
            str = str.replace(',_', '');
            str = str.trim();
            if (str.length <=0) {
              this.#style.bioHasStyleIssues = true;
              this.#messages.sectionMessages.push('Unsourced category does not have locations');
            }
          }

        } else { // not a category
          let partialLine = '';
          let partialMixedCaseLine = '';
          if (line.startsWith(Biography.#TEMPLATE_START)) {
            // handle case of template on multiple lines
            let j = line.indexOf(Biography.#TEMPLATE_END);
            let combinedLine = line;
            let combinedLineMixedCase = mixedCaseLine;
            let nextIndex = currentIndex + 1;
            let foundEnd = true;
            if (j < 0) {
              foundEnd = false;
            }
            while (!foundEnd && nextIndex < lineCount) {
              if (nextIndex < lineCount) {
                combinedLine = combinedLine + this.#bioLines[nextIndex].toLowerCase().trim();
                combinedLineMixedCase = combinedLineMixedCase + this.#bioLines[nextIndex];
                nextIndex++;
                linesToSkip++;
              }
              if (combinedLine.indexOf(Biography.#TEMPLATE_END) >= 0) {
                foundEnd = true;
              }
            }
            line = combinedLine;
            if (line.startsWith(Biography.#TEMPLATE_START)) {
              let j = line.indexOf(Biography.#TEMPLATE_END);
              if (j < 3) {
                j = 2;
              }
              let k = line.indexOf('|');
              if (k > 0) {
                j = k;
              }
              partialLine = line.substring(2, j).trim().toLowerCase();
              partialMixedCaseLine = this.#bioLines[currentIndex].substring(2, j).trim();

              this.#checkForDuplicateTemplateParameter(combinedLineMixedCase);
            }

            /* 
             * Navigation box placement rules vary by type
             * Easily Confused:
             *  Placement: The code should be placed directly below any categories. It belongs above all other 
             *             Profile Boxes, including Research Note Boxes and Project Boxes. 
             * Succession:
             *  They should be placed directly above the Biography headline, below any Research Note Boxes 
             *  and Project Boxes. 
             *
             * and since you are confusing the Successsion and Succession box and the later are deprecated, 
             * check for that first
             */
            if (this.#sourceRules.isNavBox(partialLine)) {
              let stat = this.#sourceRules.getNavBoxStatus(partialLine);
              if ((stat.length > 0) && (stat != 'approved')) {
                  let msg = 'Navigation Box: ' + partialMixedCaseLine + ' is ' + stat + ' status';
                  this.#messages.styleMessages.push(msg);
                  this.#style.bioHasStyleIssues = true;
              } else {
                if (partialLine.startsWith('easily confused')) {
                  haveNavBoxConfused = true;
                  if (haveResearchNoteBox || haveProjectBox || haveBiography || haveNavBoxSuccession) {
                    let msg = 'Navigation Box: ' + partialMixedCaseLine + ' should be before ';
                    if (haveResearchNoteBox) {
                      msg += 'Research Note Box';
                    } else {
                      if (haveProjectBox) {
                        msg += 'Project Box';
                      } else {
                        if (haveNavBoxSuccession) {
                            msg += 'Succession Navigation Box';
                        } else {
                          if (haveBiography) {
                            msg += 'Biography heading';
                          }
                        }
                      }
                    }
                    this.#messages.styleMessages.push(msg);
                    this.#style.bioHasStyleIssues = true;
                  }
                }
                if (partialLine.startsWith('succession')) {
                  haveNavBoxSuccession = true;
                  if (haveBiography) {
                    let msg = 'Navigation Box: ' + partialMixedCaseLine + ' should be before Biography heading';
                    this.#messages.styleMessages.push(msg);
                    this.#style.bioHasStyleIssues = true;
                  }
                }
              }
            } else {
              if (this.#sourceRules.isResearchNoteBox(partialLine)) {
                if (haveProjectBox || haveBiography || haveNavBoxSuccession) {
                  let msg = 'Research Note Box: ' + partialMixedCaseLine + ' should be before ';
                  if (haveProjectBox) {
                    msg += 'Project Box';
                  } else {
                    if (haveBiography) {
                      msg += 'Biography heading';
                    } else {
                      if (haveNavBoxSuccession) {
                        msg += 'Succession Navigation Box';
                      }
                    }
                  }
                  this.#messages.styleMessages.push(msg);
                  this.#style.bioHasStyleIssues = true;
                }
                haveResearchNoteBox = true;
                this.#researchNoteBoxes.push(partialLine);

                let stat = this.#sourceRules.getResearchNoteBoxStatus(partialLine);
                if ((stat.length > 0) && (stat != 'approved')) {
                  let msg = 'Research Note Box: ' + partialMixedCaseLine + ' is ' + stat + ' status';
                  this.#messages.styleMessages.push(msg);
                  this.#style.bioHasStyleIssues = true;
                }
              } else {
                if (this.#sourceRules.isProjectBox(partialLine)) {
                  haveProjectBox = true;
                  // TODO dig down into the Project Box to see if it has the project WikiTree-id
                  // then get all the managers and trusted list for the profile and see if that WikiTree-id
                  // is on the list
                  // There might be multiple project boxes Adams-35
                  if (haveNavBoxSuccession) {
                    let msg = 'Project: ' + partialMixedCaseLine + ' should be before Succession Navigation Box';
                    this.#messages.styleMessages.push(msg);
                  } else {
                    if (haveBiography) {
                      let msg = 'Project: ' + partialMixedCaseLine + ' should be before Biography heading';
                      this.#messages.styleMessages.push(msg);
                      this.#style.bioHasStyleIssues = true;
                    }
                  }
                  let stat = this.#sourceRules.getProjectBoxStatus(partialLine);
                  if ((stat.length > 0) && (stat != 'approved')) {
                    let msg = 'Project Box: ' + partialMixedCaseLine + ' is ' + stat + ' status';
                    this.#messages.styleMessages.push(msg);
                    this.#style.bioHasStyleIssues = true;
                  }
                } else {
                  if (this.#sourceRules.isSticker(partialLine)) {
                    if (!haveBiography) {
                      let msg = 'Sticker: ' + partialMixedCaseLine + ' should be after Biography heading';
                      this.#messages.styleMessages.push(msg);
                      this.#style.bioHasStyleIssues = true;
                    }
                    let stat = this.#sourceRules.getStickerStatus(partialLine);
                    if ((stat.length > 0) && (stat != 'approved')) {
                      let msg = 'Sticker: ' + partialMixedCaseLine + ' is ' + stat + ' status';
                      this.#messages.styleMessages.push(msg);
                      this.#style.bioHasStyleIssues = true;
                    }
                  }  // end sticker
                } // end project box 
              } // end research note box
            } // end nav box
          } else {
            // not a template
            // something other than category or template or NOTOC before biography heading ?
            if (!haveBiography) {
              if (!(line.includes(Biography.#NOTOC)) && !(line.includes(Biography.#TOC))) {  // this is okay
                haveTextLine = true;
                let str = this.#bioLines[currentIndex].toLowerCase().trim();
                // test the line before the bio
                this.#checkLineBeforeBio(str);
              }
            }
          }
        }
      }
      // need to skip lines if you combined lines
      currentIndex = currentIndex + 1 + linesToSkip;
    }
    // acknowlegements may go to end of bio
    if (this.#acknowledgementsEndIndex < 0) {
      this.#acknowledgementsEndIndex = lineCount;
    }
    if (this.#wrongLevelHeadings.length > 0) {
      this.#style.bioHasUnknownSectionHeadings = true;
    }

    // Check for any section with RNB text where the RNB is missing
    this.#findMissingRnb();

    // Check for advance directive on non member profiles
    if ((this.#advanceDirectiveIndex > 0) && (!thePerson.isMember())) {
      this.#style.advanceDirectiveOnNonMemberProfile = true;
    }

    let line = this.#bioInputString.toLowerCase();
    if (line.includes(Biography.#UNSOURCED_TAG) || line.includes(Biography.#UNSOURCED_TAG2)) {
      this.#stats.bioIsMarkedUnsourced = true;
      // Check for unsourced without location
      if (thePerson.hasLocation()) {
        let i = line.indexOf('}');
        let str = line.substring(0, i);
        str = str.replace('unsourced', '');
        str = str.replaceAll(/{|/gi, '');
        if (str.length <= 0) {
          this.#style.bioHasStyleIssues = true;
          this.#messages.styleMessages.push('Unsourced research note box does not have locations');
        }
      }
    }

    // Get the string that might contain <ref>xxx</ref> pairs
    let bioLineString = this.#getBioLineString();
    this.#findRef(bioLineString);

    // Lose bio lines not considered to contain sources before testing sources
    this.#removeResearchNotes();
    this.#removeAcknowledgements();
    this.#removeAdvanceDirective();

    return;
  }

  /**
   * Validate contents of bio
   * @returns {Boolean} true if profile looks good, else false.
   * Returns false a profile that appears unsourced (is ?), a profile with an empty bio, a profile with no dates, 
   * or a profile that has an Unsourced Research Notes Box or is in an Unsourced category.
   */
  validate() {
    let isValid = false;
    // Don't bother for empty bio
    if (!this.#stats.bioIsEmpty) {
      // Look for a partial string that makes it valid
      isValid = this.#sourceRules.containsValidPartialSource(this.#bioInputString.toLowerCase());

      /*
       * First validate strings after references. This will build a side effect of
       * a list of invalid span tags.
       * Next validate strings between Sources and <references />. This will update/build
       * a side effect list of invalid span tags.
       * Finally validate the references, looking at invalid span tags if needed.
       *
       * Strings after references and within named and unnamed ref tags are
       * validated to add those to the list of valid/invalid sources
       */
      if (!isValid) {
        isValid = this.#validateReferenceStrings(true);
        if (this.#validateRefStrings(this.#refStringList)) {
          if (!isValid) {
            isValid = true;
          }
        }
        if (!isValid) {
          this.#sources.sourcesFound = false;
          isValid = false;
        }
      }
    }
    if (isValid) {
      this.#sources.sourcesFound = true;
      if (this.#stats.bioIsMarkedUnsourced ||
          this.#stats.bioIsUndated) {
        isValid = false; // may have sources but needs review
      }
    }
    // set the style issues found in validate
    this.#setBioStatisticsAndStyle();

    // set one overall if bio has any problems
    this.#stats.bioHasProblems = !isValid ||
                                 this.#stats.bioIsUndated ||
                                 this.#stats.bioIsMarkedUnsourced ||
                                 this.#style.bioHasStyleIssues;
    return isValid;
  }

  /**
   * Validate using just a string of sources. This is typically
   * used when adding a new person in basic mode.
   * @param {String} sourcesStr string containing sources
   * @param thePerson {BioCheckPerson} person to check
   * @returns {Boolean} true if sources found.
   */
  validateSourcesStr(sourcesStr, thePerson) {
    // build bioLines from the input sources string then validate
    this.#getLines(sourcesStr);
    this.#isPre1500 = thePerson.isPre1500();
    this.#isPre1700 = thePerson.isPre1700();
    this.#tooOldToRemember = thePerson.isTooOldToRemember();
    this.#fatherDnaMarked = thePerson.person.fatherDnaConfirmed;
    this.#motherDnaMarked = thePerson.person.motherDnaConfirmed;
    let isValid = this.#validateReferenceStrings(false);
    if (isValid) {
      this.#sources.sourcesFound = true;
    }
    return isValid;
  }

  /**
   * Does biography have problems.
   * problems include: no valid sources, no sources, empty, 
   * marked unsourced, undated, has style issues
   * @returns {Boolean} true if bio has problems
  */
  hasProblems() {
    return this.#stats.bioHasProblems;
  }

  /* *********************************************************************
   * ******************* getters for results *****************************
   * *********************************************************************
   */
  // getters for stats results
  /**
   * is bio empty
   * @returns {Boolean} true if bio empty
   */
  isEmpty() {
    return this.#stats.bioIsEmpty;
  }
  /**
   * does bio have categories
   * @returns {Boolean} true if bio has categories
   */
  hasCategories() {
    return this.#stats.bioHasCategories;
  }
  /**
   * does bio have Unsourced template or category
   * @returns {Boolean} true if bio has Unsourced template or category
   */
  isMarkedUnsourced() {
    return this.#stats.bioIsMarkedUnsourced;
  }
  /**
   * is bio undated
   * @returns {Boolean} true if bio has neither birth nor death date
   */
  isUndated() {
    return this.#stats.bioIsUndated;
  }
  /**
   * get total number of lines in bio
   * @returns {Number} total number of bio lines
   */
  getTotalBioLines() {
    return this.#stats.totalBioLines;
  }
  /**
   * get number of inline ref
   * @returns {Number} number of inline ref
   */
  getInlineRefCount() {
    return this.#stats.inlineReferencesCount;
  }
  /**
   * get number of lines that might contain sources
   * @returns {Number} number of lines that might contain sources
   */
  getPossibleSourcesLineCount() {
    return this.#stats.possibleSourcesLineCount;
  }
  // getters for style results
  /**
   * does bio have non category text before biography heading
   * @returns {Boolean} true if bio has non category text before bio heading
   */
  hasNonCategoryTextBeforeBiographyHeading() {
    return this.#style.bioHasNonCategoryTextBeforeBiographyHeading;
  }
  /*
   * does bio have section or subsection heading that matches a Research Note Box
   * but lack the corresponding Research Note Box
   * @returns {Boolean} true if bio missing Research Note
   */
  hasMissingResearchNoteBox() {
    return this.#style.bioMissingResearchNoteBox;
  }
  /**
   * does bio have style issues
   * @returns {Boolean} true if bio has style issues
   */
  hasStyleIssues() {
    return this.#style.bioHasStyleIssues;

  }
  /**
   * does bio have endless comment
   * @returns {Boolean} true if bio has endless comment
   */
  hasEndlessComment() {
    return this.#style.hasEndlessComment;
  }
  /**
   * is bio missing biography heading
   * @returns {Boolean} true if bio is missing biography heading
   */
  isMissingBiographyHeading() {
    return this.#style.bioIsMissingBiographyHeading;
  }
  /**
   * does bio have biography heading with no lines following
   * @returns {Boolean} true if bio has biography heading with no lines following
   */
  hasHeadingWithNoLinesFollowing() {
    return this.#style.bioHeadingWithNoLinesFollowing;
  }
  /**
   * does bio have multiple biography headings
   * @returns {Boolean} true if bio has multiple biography headings
   */
  hasMultipleBioHeadings() {
    return this.#style.bioHasMultipleBioHeadings;
  }
  /**
   * does bio have ref with ending ref
   * @returns {Boolean} true if bio haref with ending refs 
   */
  hasRefWithoutEnd() {
    return this.#style.bioHasRefWithoutEnd;
  }
  /**
   * does bio have span without ending span
   * @returns {Boolean} true if bio has span without ending span
   */
  hasSpanWithoutEndingSpan() {
    return this.#style.bioHasSpanWithoutEndingSpan;
  }
  /**
   * is bio missing sources heading
   * @returns {Boolean} true if bio is missing sources heading
   */
  isMissingSourcesHeading() {
    return this.#style.bioIsMissingSourcesHeading;
  }
  /*
   * does bio have sources heading with extra =
   * @returns {Boolean} true if bio has sources heading with extra =
   */
  sourcesHeadingHasExtraEqual() {
    return this.#style.sourcesHeadingHasExtraEqual;
  }
  /**
   * does bio have multiple sources headings
   * @returns {Boolean} true if bio has multiple sources headings
   */
  hasMultipleSourceHeadings() {
    return this.#style.bioHasMultipleSourceHeadings;
  }
  /**
   * how many lines are between Sources and references
   * @returns {Number} number of lines between sources and references
   */
  getMisplacedLineCount() {
    return this.#style.misplacedLineCount;
  }
  /**
   * is bio missing the references tag
   * @returns {Boolean} true if is missing the references tag
   */
  isMissingReferencesTag() {
    return this.#style.bioIsMissingReferencesTag;
  }
  /**
   * does bio have multiple references tags
   * @returns {Boolean} true if bio has multiple references tags
   */
  hasMultipleReferencesTags() {
    return this.#style.bioHasMultipleReferencesTags;
  }
  /**
   * does bio have ref after references
   * @returns {Boolean} true if bio has ref after references
   */
  hasRefAfterReferences() {
    return this.#style.bioHasRefAfterReferences;
  }
  /*
   * does bio have acknowledgements heading with extra =
   * @returns {Boolean} true if bio has acknowledgements heading with extra =
   */
  acknowledgementsHeadingHasExtraEqual() {
    return this.#style.acknowledgementsHeadingHasExtraEqual;
  }
  /*
   * does bio have advance directive heading with extra =
   * @returns {Boolean} true if bio has advance directive heading with extra =
   */
  advanceDirectiveHeadingHasExtraEqual() {
    return this.#style.advanceDirectiveHeadingHasExtraEqual;
  }
  /*
   * does bio have advance directive on a non member profile
   * @returns {Boolean} true if bio has advance directive on a non member profile
   */
  advanceDirectiveOnNonMemberProfile() {
    return this.#style.advanceDirectiveOnNonMemberProfile;
  }
  /**
   * does bio have acknowledgements before sources
   * @returns {Boolean} true if bio has acknowledgements before sources
   */
  hasAcknowledgementsBeforeSources() {
    return this.#style.bioHasAcknowledgementsBeforeSources;
  }
  /**
   * does bio have section after advance directive 
   * @returns {Boolean} true if bio has section heading after advance directive
   */
  hasSectionAfterAdvanceDirective() {
    return this.#style.bioHasSectionAfterAdvanceDirective;
  }
  /** 
   * does bio have unknown section headings
   * @returns {Boolean} true if bio has unknown section headings
   */
  hasUnknownSection() {
    return this.#style.bioHasUnknownSectionHeadings;
  }
  /** 
   * does bio have paternal Dna confirmation
   * @returns {Boolean} true if bio has paternal Dna confirmation
   */
  hasPaternalDnaConf() {
    return this.#style.bioHasPaternalDnaConf;
  }
  /** 
   * does bio have maternal Dna confirmation
   * @returns {Boolean} true if bio has maternal Dna confirmation
   */
  hasMaternalDnaConf() {
    return this.#style.bioHasMaternalDnaConf;
  }
  /** 
  /** 
   * Return messages for reporting
   * @returns {Array} sectionMessages[]
   */
  getSectionMessages() {
    return this.#messages.sectionMessages;
  }
  /** 
   * Return messages for reporting
   * @returns {Array} styleMessages[]
   */
  getStyleMessages() {
    return this.#messages.styleMessages;
  }
  /** 
   * Return DNA Confirmation source list
   *   the list is an array of dnaSource, each consisting of
   *    dnaSourceValid: false,
   *    dnaSourceReason: "",
   *    dnaSourceText: "",
   */
  getDnaSourceList() {
    return this.#dnaSourceList;
  }
  /**
   * Return invalid DNA Source list (for reporting)
   */

  #dnaInvaldSourceCount = 0;
  /**
   * does bio have search string
   * @returns {Boolean} true if bio has the searchString
   * that was supplied to the parse() method
   */
  hasSearchString() {
    return this.#style.bioHasSearchString;
  }

  // getters for sources results
  /**
   * does bio appear to have sources
   * @returns {Boolean} true if bio appears to have sources
   */
  hasSources() {
    return this.#sources.sourcesFound;
  }
  /**
   * get invalid sources found for profile
   * @returns {Array} array of String of invalid source lines
   */
  getInvalidSources() {
    return this.#sources.invalidSource;
  }
  /**
   * get invalid DNA sources found for profile
   * @returns {Array} array of String of invalid source lines
   * for reporting
   */
  getInvalidDnaSources() {
    return this.#sources.invalidDnaSourceList;
  }

  /**
   * get valid sources found for profile
   * @returns {Array} array of String of valid source lines
   */
  getValidSources() {
    return this.#sources.validSource;
  }

  /* *********************************************************************
   * ******************* PRIVATE METHODS *********************************
   * ******************* used by Parser **********************************
   * *********************************************************************
   */

  /*
   * Swallow comments
   * side effect set style if endless comment found
   * @param {String} inStr
   * @returns {String} string with comments removed
   */
  #swallowComments(inStr) {
    let outStr = "";
    /*
     * Find start of comment
     * Put everything before start in output string
     * Find end of comment, skip past the ending and start looking there
     */
    let pos = 0; // starting position of the comment
    let endPos = 0; // end position of the comment
    let len = inStr.length; // length of input string
    pos = inStr.indexOf(Biography.#START_OF_COMMENT);
    if (pos < 0) {
      outStr = inStr; // no comments
    }
    while (pos < len && pos >= 0) {
      // get everything to start of comment unless comment is first line in bio
      if (pos > 0) {
        outStr = outStr + inStr.substring(endPos, pos);
      }
      // Find end of comment
      endPos = inStr.indexOf(Biography.#END_OF_COMMENT, pos);
      if (endPos > 0) {
        pos = endPos + 3; // skip the --> and move starting position there
        endPos = endPos + 3;
        if (pos <= len) {
          pos = inStr.indexOf(Biography.#START_OF_COMMENT, pos); // find next comment
          if (pos < 1) {
            outStr += inStr.substring(endPos);
          }
        }
      } else {
        this.#style.hasEndlessComment = true;
        pos = inStr.length + 1; // its an endless comment, just bail
      }
    }
    return outStr;
  }
  /*
   * Swallow BR
   * could be in the form <br> or <br/> or <br />
   * @param {String} inStr
   * @returns {String} string with br removed
   */
  #swallowBr(inStr) {
    let outStr = inStr.replace(/<br\s*?\/?>/gi, "");

    // Test for <BR without ending bracket
    let str = outStr.toLowerCase();
    let startPos = str.indexOf(Biography.#START_OF_BR);
    if ((startPos >= 0) &&
        ((str.indexOf(Biography.#END_BRACKET) < 0) ||
         (str.indexOf(Biography.#END_BRACKET) < startPos))) {
      this.#style.bioHasBrWithoutEnd = true;
    }
    return outStr;
  }

  /*
   * Build an array of each line in the bio
   * lines are delimited by a newline
   * empty lines or those with only whitespace are eliminated
   * @param {String} inStr bio string stripped of comments
   */
  #getLines(inStr) {
    // if the line has the end and start of a template, such as }}{{ then
    // treat that as two separate lines
    inStr = inStr.replaceAll('\}\}\{\{', '\}\}\n\{\{');
    inStr = inStr.replaceAll('\}\} \{\{', '\}\}\n\{\{');
    let splitString = inStr.split("\n");
    let line = "";
    let tmpString = "";
    let len = splitString.length;
    for (let i = 0; i < len; i++) {
      line = splitString[i];
      // line is nothing but ---- ignore it by replacing with spaces then
      // trimming
      tmpString = line.replace("-", " ");
      tmpString = tmpString.trim();
      // Do NOT ignore empty lines here. Need to check sources
      // Sanity check if the line with <references /> also has text following on same line
      if (tmpString.indexOf(Biography.#REFERENCES_TAG) >= 0) {
        let endOfReferencesTag = tmpString.indexOf(Biography.#END_BRACKET);
        if (endOfReferencesTag + 1 < tmpString.length) {
          // Oopsie. Add a line for references and another for the line
          // and report a style issue?
          let anotherLine = tmpString.substring(0, endOfReferencesTag + 1);
          this.#bioLines.push(anotherLine);
          line = tmpString.substring(endOfReferencesTag + 2);
          if (!line.length === 0) {
            this.#bioLines.push(tmpString);
          }
        } else {
          this.#bioLines.push(tmpString);
        }
      } else {
        this.#bioLines.push(line);
      }
    }
    return;
  }

  /*
   * Process heading line to find Biography, Sources, Acknowledgements
   * set index to each section
   * Methods are used to find sections so that rules can specify
   * alternate languages
   * @param {String} inStr starting with ==
   * @param {Number} currentIndex into master list of strings
   * @param {String} mixedCaseLine input line in mixed case
   */
  #evaluateHeadingLine(inStr, currentIndex, mixedCaseLine) {
    let headingText = "";
    let mixedHeadingText = "";
    let headingStartPos = 0;
    let headingLevel = 0;
    /*
     * the bioLineString should start with the larger of the start of the line
     * after the biography heading or 0
     * it should end with the smallest of the length of the bio string or
     * the first heading found after the biography heading
     */
    let len = inStr.length;
    while (headingStartPos < len && headingLevel < 4) {
      if (inStr.charAt(headingStartPos) === "=") {
        headingStartPos++;
        headingLevel++; // number of =
      } else {
        // lose any leading ' for bold or italics
        let i = headingLevel;
        while (i < len && inStr.charAt(i) === "'") {
          i++;
        }
        headingStartPos = len + 1; // break out of loop

        // then lose anything after the next =
        headingText = inStr.substring(i).trim();
        mixedHeadingText = mixedCaseLine.substring(i).trim();
        let j = headingText.indexOf("=");
        if (j < 0) {
          j = headingText.length;
        }
        headingText = headingText.substring(0, j).trim();
        mixedHeadingText = mixedHeadingText.substring(0, j).trim();
      }
    }
    let headingContent = {  // content of a heading line
        headingLevel: -1,
        headingText: "",
    };
    headingContent.headingLevel = headingLevel;
    headingContent.headingText = mixedHeadingText;
    this.#headings.push(headingContent);       // save for reporting

    // Save index for this heading
    if (this.#isBiographyHeading(headingText)) {
      if (this.#biographyIndex < 0) {
        this.#biographyIndex = currentIndex;
        if (this.#advanceDirectiveIndex > 0) {
          this.#style.bioHasSectionAfterAdvanceDirective = true;
        }
      } else {
        if (this.#researchNotesIndex > 0) {
          this.#researchNotesEndIndex = currentIndex - 1;
        }
      }
    } else {
      if (this.#sourceRules.isResearchNotesHeading(headingText)) {
        this.#researchNotesIndex = currentIndex;
      } else {
        if (this.#isSourcesHeading(headingText)) {
          if (this.#advanceDirectiveIndex > 0) {
            this.#style.bioHasSectionAfterAdvanceDirective = true;
            this.#advanceDirectiveEndIndex = currentIndex -1;
          }
          if (headingLevel > 2) {
            this.#style.sourcesHeadingHasExtraEqual = true;
          }
          if (this.#sourcesIndex < 0) {
            this.#sourcesIndex = currentIndex;
            if (this.#researchNotesIndex > 0) {
              this.#researchNotesEndIndex = currentIndex - 1;
            }
            if (this.#acknowledgementsIndex > 0) {
              this.#acknowledgementsEndIndex = currentIndex - 1;
            }
          }
        } else {
          if (this.#sourceRules.isAckHeading(headingText)) {
            if (this.#advanceDirectiveIndex > 0) {
              this.#style.bioHasSectionAfterAdvanceDirective = true;
              this.#advanceDirectiveEndIndex = currentIndex -1;
            }
            if (headingLevel > 2) {
              this.#style.acknowledgementsHeadingHasExtraEqual = true;
            }
            if (this.#sourcesIndex < 0) {
              this.#style.bioHasAcknowledgementsBeforeSources = true;
            }
            this.#acknowledgementsIndex = currentIndex;
            if (this.#researchNotesIndex > 0 && this.#researchNotesEndIndex < 0) {
              this.#researchNotesEndIndex = currentIndex - 1;
            }
          } else {
            if (this.#sourceRules.isAdvanceDirective(headingText)) {
              this.#advanceDirectiveIndex = currentIndex;
              if (headingLevel > 2) {
                this.#style.advanceDirectiveHeadingHasExtraEqual = true;
              }
            } else {
              if (headingLevel === 2) {
                this.#wrongLevelHeadings.push(headingContent.headingText);       // save for reporting
              }
            }
          } // endif Acknowledgements
        } // endif Sources
      } // endif Research Notes
    } // endif Biography
    return;
  }

  /*
   * Get string from bio to be searched for any inline <ref
   * the bioLineString should start with the beginning of the biography
   * or the line after the Biography heading whichever is last
   * it should end with the smallest of the length of the bio string or
   * the first heading found after the biography heading
   */
  #getBioLineString() {
    let bioLinesString = "";
    let startIndex = 0;
    // Jump to the start of == Biography
    if (this.#biographyIndex > 0) {
      startIndex = this.#biographyIndex;
    }
    // assume it ends at end of bio then pick smallest
    // of Research Notes, Sources, references, acknowledgements
    // which is also after the start of the biography
    let endIndex = this.#bioLines.length;
    if (this.#researchNotesIndex > 0 && this.#researchNotesIndex > startIndex) {
      endIndex = this.#researchNotesIndex;
    }
    if (this.#sourcesIndex > 0 && this.#sourcesIndex < endIndex) {
      endIndex = this.#sourcesIndex;
    }
    if (this.#referencesIndex > 0 && this.#referencesIndex < endIndex) {
      endIndex = this.#referencesIndex;
    }
    if (this.#acknowledgementsIndex > 0 && this.#acknowledgementsIndex < endIndex) {
      endIndex = this.#acknowledgementsIndex;
    }
    startIndex++;
    if (this.#biographyIndex === endIndex) {
      this.#style.bioHeadingWithNoLinesFollowing = true;
    } else {
      if (endIndex >= 0) {
        while (startIndex < endIndex) {
          bioLinesString += this.#bioLines[startIndex];
          startIndex++;
        }
      }
    }
    let str = bioLinesString.trim();
    if (str.length === 0) {
      this.#style.bioHeadingWithNoLinesFollowing = true;
    }
    return bioLinesString;
  }

  /*
   * Find <ref> </ref> pairs 
   * adds contents of ref to refStringList
   * add name for a defined ref string to refNamesDefined 
   * add name used as a reference to refNamesUsed 
   * add name used more than once to refNamesMultiple
   * @param {String} bioLineString string to look in for pairs
   */
  #findRef(bioLineString) {
    /*
     * may be in the form <ref>cite</ref>
     * or in the form <ref name=xxx>cite</ref>
     * or in the form <ref name=xxx />
     *
     * malformed may have no ending </ref> or />
     * and there may be multiple char between ref and name
     * or there may be another <ref> before ending
     *
     * you are not checking for an extra ending </ref>
     * but the enhanced editor will find this
     *
     * replace the ref to be lower case for matching
     * even though the Wiki Markup spec is just lower case. Sigh.
    */
    let line = bioLineString.replaceAll(/ref/gi, 'ref');
    let refArray = line.split('<ref');
    for (let i = 1; i < refArray.length; i++) {
      let refName = this.#extractRefName(refArray[i]);
      let citeStart = refArray[i].indexOf('>') + 1;
      let citeEnd = refArray[i].indexOf('</ref', 1);

      let isJustRefName = false;
      if (refName.length > 0) {
        let refEnd = refArray[i].indexOf('/>');
        if (refEnd > 0) {
          isJustRefName = true;
          this.#refNamesUsed.add(refName);  // named ref reference
        } else {
          if (this.#refNamesDefined.has(refName)) {
            this.#refNamesMultiple.add(refName); // name defined more than once
          } else {
            this.#refNamesDefined.add(refName); // name has citation
          }
        }
      }
      if (!isJustRefName) {
        if (citeEnd < 0) {
          this.#style.hasRefWithoutEnd = true;
        } else {
          let line = refArray[i].substring(citeStart, citeEnd);
          this.#refStringList.push(line);
        }
      }
    }
  }
  /*
   * Extract the name from a named <ref>
   * return extracted name
  */
  #extractRefName(str) {
    let refName = "";
    str = str.replaceAll(/"/g, '');
    str = str.toLowerCase();
    let nameStart = str.indexOf('name');
    if (nameStart >= 0) {
      if (str.indexOf('=')) { // must have name =
        // name end is first of space > or /
        let nameEnd = str.indexOf('>');
        if (nameEnd < 0) {
          nameEnd = str.indexOf('/');
          if (nameEnd < 0) { 
            nameEnd = str.indexOf(' ');
          }
          if (nameEnd < 0) {
            // malformed ref
            this.#style.hasRefWithoutEnd = true;
          }
        }
        if (nameEnd > nameStart) {
          refName = str.substring(nameStart, nameEnd);
        }
        nameEnd = refName.indexOf('/');
        if (nameEnd != -1) {
          refName = refName.substring(0, nameEnd);
        }
        refName = refName.replace('name', '');
        refName = refName.replace('=', '');
        refName = refName.trim();
      }
    }
    return refName;
  }

  /*
   * Gather bio statistics and style issues
   * only examines items not considered in the parsing
   * Basic checks for the headings and content expected in the biography
   * Update results style
   * Build the report content
   */
  #setBioStatisticsAndStyle() {
    this.#stats.totalBioLines = this.#bioLines.length;

    if (this.#stats.bioIsMarkedUnsourced) {
      if (this.#sources.sourcesFound) {
        this.#messages.sectionMessages.push('Profile is marked unsourced but may have sources');
        this.#style.bioHasStyleIssues = true;
      } else {
        this.#messages.sectionMessages.push('Profile is marked unsourced');
      }
    }
    if (this.#stats.bioIsUndated) {
      this.#messages.sectionMessages.push('Profile has no dates');
      this.#style.bioHasStyleIssues = true;
    }
    if (this.#style.bioCategoryNotAtStart) {
      this.#style.bioHasStyleIssues = true;
    }
    if (this.#style.bioHasBrWithoutEnd) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.styleMessages.push('Biography has <BR without ending > ');
    }

    if (this.#biographyIndex < 0) {
      this.#style.bioHasStyleIssues = true;
      this.#style.bioIsMissingBiographyHeading = true;
      this.#messages.sectionMessages.push('Missing Biography heading');
    } else {
      if (this.#unexpectedLines.length > 0) {
        this.#style.bioHasStyleIssues = true;
        this.#style.bioHasNonCategoryTextBeforeBiographyHeading = true; 
        let i = 0;
        while (i < this.#unexpectedLines.length) {
          this.#messages.styleMessages.push('Unexpected line before Biography ' + this.#unexpectedLines[i]);
          i++
          if (i > 5) {
            i = this.#unexpectedLines.length + 1;
            this.#messages.styleMessages.push('Unexpected line ... more lines follow ...');
          }
        }
      }
    }
    if (this.#sourcesIndex < 0) {
      this.#style.bioHasStyleIssues = true;
      this.#style.bioIsMissingSourcesHeading = true;
      this.#messages.sectionMessages.push('Missing Sources heading');
    }
    if (this.#referencesIndex < 0) {
      this.#style.bioHasStyleIssues = true;
      this.#style.bioIsMissingReferencesTag = true;
      this.#messages.sectionMessages.push('Missing <references /> tag');
    }
    if (this.#style.bioHasMultipleReferencesTags) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Multiple <references /> tag');
    }
    if (this.#style.misplacedLineCount < 0) {
      this.#style.misplacedLineCount = 0;
    }
    if (this.#style.misplacedLineCount > 0) {
      this.#style.bioHasStyleIssues = true;
      let msg = this.#style.misplacedLineCount + ' line';
      if (this.#style.misplacedLineCount > 1) {
        msg += 's';
      }
      msg += ' between Sources and <references />';
      this.#messages.sectionMessages.push(msg);
    }
    this.#stats.inlineReferencesCount = this.#refStringList.length;

    this.#stats.possibleSourcesLineCount = this.#acknowledgementsIndex - 1;
    if (this.#stats.possibleSourcesLineCount < 0) {
      this.#stats.possibleSourcesLineCount = this.#bioLines.length;
    }
    this.#stats.possibleSourcesLineCount =
      this.#stats.possibleSourcesLineCount - this.#referencesIndex + 1 +
      this.#style.misplacedLineCount;

    if (this.#style.hasRefWithoutEnd) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Inline <ref> tag with no ending </ref> tag');
    }
    if (this.#style.bioHasRefAfterReferences) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Inline <ref> tag after <references >');
    }
    for (let refName of this.#refNamesMultiple) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Inline <ref> ' + refName + ' defined more than once');
    }
    for (let refName of this.#refNamesUsed) {
      if (!this.#refNamesDefined.has(refName)) {
        this.#style.bioHasStyleIssues = true;
        this.#messages.sectionMessages.push('Inline <ref> ' + refName + ' has no citation');
      }
    }

    if (this.#style.bioHasSpanWithoutEndingSpan) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Span with no ending span');
    }
    if (this.#style.bioHasMultipleBioHeadings) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Multiple Biography headings');
    }
    if (this.#style.bioHeadingWithNoLinesFollowing) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.styleMessages.push('Empty Biography section');
    }
    if (this.#style.bioHasMultipleSourceHeadings) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Multiple Sources headings');
    }
    if (this.#style.sourcesHeadingHasExtraEqual) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Sources subsection instead of section');
    }
    if (this.#style.bioHasUnknownSectionHeadings) {
      this.#style.bioHasStyleIssues = true;
      for (let i=0; i < this.#wrongLevelHeadings.length; i++) {
        let str = this.#wrongLevelHeadings[i];
        if (str.length > 60) {
          str = str.substring(0, 60) + "...";
        }
        this.#messages.styleMessages.push('Wrong level heading == ' + str + ' ==');
      }
    }
    if (this.#style.acknowledgementsHeadingHasExtraEqual) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Acknowledgements subsection instead of section');
    }
    if (this.#style.bioHasAcknowledgementsBeforeSources) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Acknowledgements before Sources');
    }
    if (this.#style.advanceDirectiveHeadingHasExtraEqual) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Advance Directive subsection instead of section');
    }
    if (this.#style.bioHasSectionAfterAdvanceDirective) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.sectionMessages.push('Advance Directive is not at end of profile'); 
    }
    if (this.#style.advanceDirectiveOnNonMemberProfile) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.styleMessages.push('Advance Directive on a non member profile');
    }

    if (this.#style.bioMissingResearchNoteBox) {
      this.#style.bioHasStyleIssues = true;
      for (let i=0; i < this.#missingRnb.length; i++) {
        this.#messages.styleMessages.push('Missing Research Note box for: ' + this.#missingRnb[i]);
      }
    }
    if (this.#style.bioMightHaveEmail) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.styleMessages.push('Biography may contain email address');
    }

    // Report DNA confirmation results.
    if (this.#style.bioHasIncompleteDNAconfirmation) {
      this.#style.bioHasStyleIssues = true;
      if (this.#dnaSourceList.length > 0) {
        for (let i=0; i < this.#dnaSourceList.length; i++) {
          if (!(this.#dnaSourceList[i].dnaSourceValid)) {
            this.#messages.styleMessages.push('DNA confirmation: ' + this.#dnaSourceList[i].dnaSourceReason);
          }
        }
      }
    }
    /*
    Warning 213: Missing fathers DNA confirmation and 313 for mother
    */
    if (this.#fatherDnaMarked && !this.#style.bioHasPaternalDnaConf) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.styleMessages.push("Missing father's DNA confirmation source");
    }
    if (this.#motherDnaMarked && !this.#style.bioHasMaternalDnaConf) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.styleMessages.push("Missing mother's DNA confirmation source");
    }
    if (!this.#fatherDnaMarked && this.#style.bioHasPaternalDnaConf) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.styleMessages.push("Father not marked as Confirmed with DNA");
    }
    if (!this.#motherDnaMarked && this.#style.bioHasMaternalDnaConf) {
      this.#style.bioHasStyleIssues = true;
      this.#messages.styleMessages.push("Mother not marked as Confirmed with DNA");
    }
  }

  /*
   * Determine if Biography heading
   * Uses rules to check for multiple languages
   * Adds bio headings to array of bio headings found
   * @param {String} line to test
   * @returns {Boolean} true if biography heading else false
   */
  #isBiographyHeading(line) {
    let isBioHeading = this.#sourceRules.isBiographyHeading(line);
    if (isBioHeading) {
      if (this.#bioHeadingsFound.includes(line)) {
        this.#style.bioHasMultipleBioHeadings = true;
      } else {
        this.#bioHeadingsFound.push(line);
      }
    }
    return isBioHeading;
  }

  /*
   * Determine if Sources heading
   * Uses rules to check for multiple languages
   * Adds sources headings to array of sources headings found
   * @param {String} line to test
   * @returns {Boolean} true if sources heading else false
   */
  #isSourcesHeading(line) {
    let isSourcesHeading = this.#sourceRules.isSourcesHeading(line);
    if (isSourcesHeading) {
      if (this.#sourcesHeadingsFound.includes(line)) {
        this.#style.bioHasMultipleSourceHeadings = true;
      } else {
        this.#sourcesHeadingsFound.push(line);
      }
    }
    return isSourcesHeading;
  }

  /*
   * Remove Research Notes from bio lines
   * Remove lines between start of Research Notes
   * and end of Research Notes
   * Any content of Research Notes is not considered
   * as a source
   * Research Notes end when a Biography heading is found
   * or at the first Sources or Acknowledgements heading
   */
  #removeResearchNotes() {
    let i = this.#researchNotesIndex;
    let endIndex = this.#researchNotesEndIndex;
    if (endIndex < 0) {
      endIndex = this.#bioLines.length;
    }
    if (i > 0) {
      while (i <= endIndex) {
        this.#bioLines[i] = "";
        i++;
      }
    }
  }

  /*
   * Remove acknowledgements from bio lines
   * Remove lines between start of Acknowledgements
   * and end of Acknowledgements
   * Any content of Acknowledgements is not considered
   * as a source
   * Acknowledgements end when a heading is found
   * or at the end of the biography
   */
  #removeAcknowledgements() {
    let i = this.#acknowledgementsIndex;
    let endIndex = this.#acknowledgementsEndIndex;
    if (endIndex < 0) {
      endIndex = this.#bioLines.length;
    }
    if (i > 0) {
      while (i <= endIndex) {
        this.#bioLines[i] = "";
        i++;
      }
    }
  }

  /*
   * Remove advance directive from bio lines
   * Remove lines between start of Advance Directive and
   * end of Advance Directive
   * Any content of Advance Directive are not considered
   * as a source
   * Advance Directive ends when a heading is found
   * or at the end of the biography
   */
  #removeAdvanceDirective() {
    let i = this.#advanceDirectiveIndex;
    let endIndex = this.#advanceDirectiveEndIndex;
    if (endIndex < 0) {
      endIndex = this.#bioLines.length;
    }
    if (i > 0) {
      while (i <= endIndex) {
        this.#bioLines[i] = "";
        i++;
      }
    }
  }

  /*
   * Find headings that are the name of a research notes box
   * where there is no research notes box with that name
   */
  #findMissingRnb() {
    for (let i=0; i<this.#headings.length; i++) {
      let str = this.#headings[i].headingText.toLowerCase().trim();
      if (this.#sourceRules.isResearchNoteBox(str)) {
        if (!this.#researchNoteBoxes.includes(str)) {
           this.#missingRnb.push(this.#headings[i].headingText);
           this.#style.bioMissingResearchNoteBox = true;;
        }
      }
    }
  }

  /*
   * Check a line to see if it might include an email addr
   */
  #checkForEmail(line) {

    // the line must contain the @ symbol
    // then any of the parts of the line split on a space could be email
    // then if the part matches the normal email regular expression
    // WITH the addition of spaces that people might put in to avoid email checking
    // Thanks to Andrew Millard for the regex

    let looksLikeEmail = false;
    let orig_regex = /^[a-z0-9]+@[a-z]+\.[a-z]{2,3}$/;

    let regex = /[\w\-+\.]+\s*@\s*[\w\-.]+\.[A-Za-z]{2,3}/;
    let sep = line.indexOf('@');
    if (sep >= 0) {
      if (line.match(regex)) {
        looksLikeEmail = true;
      } else {
        let lineParts = line.split(' ');
        for (let i=0; i < lineParts.length; i++) {
          if (lineParts[i].match(regex)) {
            looksLikeEmail = true;
          }
        }
      }
      if (!looksLikeEmail) {
        // have they put in spaces to avoid the checks?
        // build a new string to check
        // start from the last space before the @
        // then remove all spaces
        let firstPart = line.substring(0, sep).trim();
        let newString = firstPart;
        let i = firstPart.lastIndexOf(' ');
        if (i > 0) {
          newString = firstPart.substring(i);
        }
        newString += line.substring(sep);
        let testString = newString.replace(/ /g, "")
        if (testString.match(regex)) {
          looksLikeEmail = true;
        }
      }
    }
    return looksLikeEmail;
  }

  /*
   * Check line before Biography heading
   * no horizontal rule
   * no heading or subheading
   * when we get here it is not a category start, already did that test
   */
  #checkLineBeforeBio(line) {
    if (line.startsWith('----')) {
      this.#messages.styleMessages.push('Horizontal rule before Biography');
      this.#style.bioHasStyleIssues = true;
      this.#headingBeforeBiography = true;
    } else {
      if (line.startsWith(Biography.#HEADING_START)) {
        if (!this.#headingBeforeBiography) {
          this.#style.bioHasStyleIssues = true;
          this.#headingBeforeBiography = true;
          this.#messages.styleMessages.push('Heading or subheading before Biography');
        }
      }  else {
        if ((line.startsWith('[[')) && (line.endsWith(']]'))) {
          this.#unexpectedLines.push(line);
        }
        if ((line.includes('through the import of')) ||
            (line.includes('collaborative work-in-progress'))) {
          this.#unexpectedLines.push(line);
        }
      }
    }
  }

  /*
   * Check for HTML directives that are not recommended
   */
  #checkRecommendedHtml(line, mixedCaseLine) {
    // some ancestry citations have <https
    // you are allowing that plus < followed by a space or digit 
    // per the Source Rules
    if (line.includes(Biography.#START_BRACKET)) {
      if (!this.#sourceRules.isRecommendedTag(line)) {
        let msg = 'Biography contains HTML tag that is not recommended ' + mixedCaseLine;
        if (msg.length > 80) {
          msg = msg.substring(0, 80);
          msg += "...";
        }
        this.#messages.styleMessages.push(msg);
        this.#style.bioHasStyleIssues = true;
      }
    }
    return;
  }

  /*
   * Check for duplicate template parameter
   * remove any external links from the parameters (they may contain |)
   * find the start of a parameter name following the |
   * find the end of the parameter name before the =
   * trim the parameter name * add it to the set of unique names, and complain if its already found 
   */
  #checkForDuplicateTemplateParameter(mixedCaseLine) {
    let line = mixedCaseLine.replace(/\[\[.*?\]\]/g, "");
    let foundEnd = false;
    let paramEnd = 0;
    let paramNameSet = new Set();
    while (!foundEnd) {
      let paramStart = line.indexOf('|', paramEnd);
      if (paramStart < 0) {
        foundEnd = true;
      } else {
        paramStart++;
        paramEnd = line.indexOf('=', paramStart);
        if (paramEnd > 0) {
          let paramName=line.substring(paramStart, paramEnd).trim();
          let paramNameLower = paramName.toLowerCase();
          if (paramNameSet.has(paramNameLower)) {
            // what we want to report is just the template name and param name
            let templateName = mixedCaseLine.substring(2, mixedCaseLine.indexOf('|'));
            let msg = templateName + ' template has duplicate parameter ' + paramName;
            this.#messages.styleMessages.push(msg);
            this.#style.bioHasStyleIssues = true;
          } else {
            paramNameSet.add(paramNameLower);
          }
          paramEnd++;
          if (paramEnd > line.length) {
            foundEnd = true;
          }
        } else {
          foundEnd = true;
        }
      }
    }
    return;
  }

  /* *********************************************************************
   * ******************* PRIVATE METHODS *********************************
   * ******************* used by Validator *******************************
   * *********************************************************************
   */

  /*
   * Examine a single line to see if it is a valid source
   * Adds line to array of valid or invalid sources
   * @param {String} mixedCaseLine line to test (and report)
   * @returns {Boolean} true if valid else false
   */
  #isValidSource(mixedCaseLine) {
    let isValid = false; // assume guilty
    let isRepository = false;
    let isDnaLine = false;
    // just ignore starting *
    if (mixedCaseLine.startsWith("*")) {
      mixedCaseLine = mixedCaseLine.substring(1);
    }
    mixedCaseLine = mixedCaseLine.trim();

    // perform tests on lower case line
    let line = mixedCaseLine.toLowerCase().trim();
    // ignore starting source:
    if (line.length > 0 && line.startsWith(Biography.#SOURCE_START)) {
      line = line.substring(7);
      line = line.trim();
    }
    // ignore trailing .
    if (line.endsWith(".")) {
      line = line.slice(0, -1);
      line = line.trim();
    }
    // It takes a minimum number of characters to be valid
    if (line.length >= Biography.#MIN_SOURCE_LEN) {
      if (!this.#isInvalidStandAloneSource(line)) {
        line = line.trim();
        // FindAGrave citations may have partial strings that
        // would otherwise show up as invalid
        if (this.#isFindAGraveCitation(line)) {
          isValid = true;
        } else {
          // Very important to check for valid part of a string on Pre1700
          // before checking for the invalid ones....
          if (this.#onAnyValidPartialSourceList(line)) {
            isValid = true;
          } else {
            // Does line contain a phrase on the invalid partial source list?
            // lines with ' or & will not match the source rules
            line = line.replace(/\u0027/g, '');  // lines with ' will not match
            line = line.replace(/\u0026/g, 'and');  // and convert & to and
            let str = line.replace('family tree dna', ''); // valid in DNA confirmation
            if (this.#onAnyPartialSourceList(str)) {
              isValid = false;
            } else {
              // Check for line that starts with something on the invalid start partial list
              if (this.#sourceRules.isInvalidStartPartialSource(line)) {
                isValid = false;
              } else {
                // TODO can you refactor so this uses a plugin architecture?

                // Some other things to check
                if (!this.#isJustCensus(line)) {
                  if (!this.#invalidFamilyTree(line)) {
                    isRepository = this.#isJustRepository(line)
                    if (!isRepository) {
                      if (!this.#isJustGedcomCrud(line)) {
                        if (!this.#isJustThePeerage(line)) {
                          isDnaLine = this.#isDnaSourceLine(line);
                          if (isDnaLine) {
                              // if it says confident or suggested instead of confirmed 
                              // it should be neither a DNA nor traditional source
                              this.#isValidDnaConfirmation(line, mixedCaseLine);
                          } else {
                            if (!this.#isJustCombinedLines(line)) {
                              if (!line.includes('{{citation needed}}')) {
                                // TODO is the manager's name a valid source (this is hard)
                                // TODO add logic to check for just the name followed by grave
                                // TODO add logic to strip "information from" from the start
                                isValid = true;
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              } // endif starts with invalid phrase
            } // endif contains a phrase on invalid partial source list
          } // endif on any valid partial list
        } // endif a findagrave citation
      } // endif on the list of invalid sources
    } // endif too short when stripped of whitespace

    // Save line for reporting
    if (isValid) {
      this.#sources.validSource.push(mixedCaseLine);
    } else {
      if ((!isRepository) && (!isDnaLine)) {
        if (!this.#ignoreDnaStart(line)) {
          this.#sources.invalidSource.push(mixedCaseLine);
        }
      }
    }
    return isValid;
  }

  /*
   * Determine if valid standalone source
   * @param {String} line input source string
   * @returns {Boolean} true if on the standalone list of invalid sources
   */
  #isInvalidStandAloneSource(line) {
    let isInvalidStandAlone = this.#sourceRules.isInvalidSource(line);
    if (!isInvalidStandAlone && this.#tooOldToRemember) {
      isInvalidStandAlone = this.#sourceRules.isInvalidSourceTooOld(line);

      if ((this.#isPre1700 || this.#treatAsPre1700) && !isInvalidStandAlone) {
        isInvalidStandAlone = this.#sourceRules.isInvalidSourcePre1700(line);
      }
      if (this.#isPre1500 && !isInvalidStandAlone) {
        // TODO add more pre1500 validation
      }
    }
    return isInvalidStandAlone;
  }

  /*
   * Determine if found on partial source list
   * @param {String} line input source string
   * @returns {Boolean} true if on a list of invalid partial sources else false
   */
  #onAnyPartialSourceList(line) {
    let foundInvalidPartialSource = this.#sourceRules.isInvalidPartialSource(line);
    if (this.#tooOldToRemember && !foundInvalidPartialSource) {
      foundInvalidPartialSource = this.#sourceRules.isInvalidPartialSourceTooOld(line);
    }
    if ((this.#isPre1700 || this.#treatAsPre1700) && !foundInvalidPartialSource) {
      foundInvalidPartialSource = this.#sourceRules.isInvalidPartialSourcePre1700(line);
    }
    // TODO add more pre1500 validation
    return foundInvalidPartialSource;
  }
  /*
   * Determine if found on valid partial source list
   * @param {String} line input source string
   * @returns {Boolean} true if on a list of valid partial sources else false
   */
  #onAnyValidPartialSourceList(line) {
    let foundValidPartialSource = false;
    if (this.#isPre1700 || this.#treatAsPre1700) {
      foundValidPartialSource = this.#sourceRules.isValidPartialSourcePre1700(line);
    }
    return foundValidPartialSource;
  }

  /*
   * Validate content in <ref> tags
   * invalidSpanTargetList is used if line contains a span reference
   * @param {Array} refStrings array of string found within ref tag
   * @returns {Boolean} true if at least one is valid else false
   */
  #validateRefStrings(refStrings) {
    let isValid = false; // guilty until proven innnocent
    let line = "";
    let i = 0;
    while (i < refStrings.length) {
      line = refStrings[i];
      if (line.length > 0) {
        // Check span target if ref contains a span reference
        let startPos = line.indexOf(Biography.#SPAN_REFERENCE_START);
        if (startPos >= 0) {
          startPos = startPos + 3;
          let endPos = line.indexOf("|");
          if (endPos < 0) {
            endPos = line.indexOf(Biography.#SPAN_REFERENCE_END);
          }
          if (endPos > 0 && startPos < endPos) {
            let spanId = line.substring(startPos, endPos);
            if (!this.#invalidSpanTargetList.includes(spanId)) {
              isValid = true;
            }
          }
        } else {
          if (this.#isValidSource(line)) {
            if (!isValid) {
              // first one found?
              isValid = true;
            }
          }
        }
      }
      i++;
    }
    return isValid;
  }

  /*
   * Validate all the strings after the == Sources heading
   * but before Acknowledgements or Advance Directive or the end of the biography
   * @param {Boolean} isFullBio true if checking full bio else just a
   * string of sources
   * @returns {Boolean} true if at lease one valid else false
   */
  #validateReferenceStrings(isFullBio) {
    let isValid = false;
    let index = 0;
    if (isFullBio) {
      // start at the first of Sources or <references /> if neither, nothing to do
      // assume it is so messed up nothing to process
  
      index = this.#sourcesIndex + 1;
      if (index <= 0) {
        index = this.#referencesIndex + 1;
      }
      if (index <= 0) {
        index = this.#bioLines.length;
      }
    }
    let lastIndex = this.#bioLines.length;
    let line = "";
    let nextIndex = index + 1;
    while (index < lastIndex) {
      let mixedCaseLine = this.#bioLines[index];
      line = mixedCaseLine.toLowerCase();
      // if line nothing but --- ignore it
      let tmpString = line.replaceAll("-", " ");
      tmpString = tmpString.trim();
      if (tmpString.length <= 0) {
        line = tmpString;
      }
      nextIndex = index + 1;
      // Skip the <references line and any heading line or empty line
      // or the See Also line
      if (
        !line.startsWith(Biography.#REFERENCES_TAG) &&
        !line.startsWith(Biography.#HEADING_START) &&
        !line.includes(Biography.#SEE_ALSO) &&
        !line.includes(Biography.#SEE_ALSO2) &&
        !line.includes(Biography.#SEE_ALSO3) &&
        line.length > 0
      ) {
        // Now gather all lines from this line until an empty line
        // or a line that starts with * to test as the source
        // TODO consider in the future combining when nextLine 
        // starts with ** (i.e.., don't find end on two *
        // problem with that is you don't see the ** just the *
        let combinedLine = mixedCaseLine;
        let foundEndOfSource = false;
        while (!foundEndOfSource && nextIndex < lastIndex) {
          if (nextIndex < lastIndex) {
            // check next line
            let nextLine = this.#bioLines[nextIndex];
            if (nextLine.length === 0) {
              foundEndOfSource = true;
            } else {
              if (nextLine.startsWith("*") || nextLine.startsWith("--") ||
                   nextLine.startsWith("#") ||
                   nextLine.startsWith(Biography.#REFERENCES_TAG) ||
                   nextLine.startsWith(Biography.#HEADING_START)) {
                foundEndOfSource = true;
              } else {
                combinedLine = combinedLine + " " + nextLine;
                nextIndex++;
              }
            }
          }
        }
        mixedCaseLine = combinedLine;
        // At this point, the line should not contain an inline <ref
        // Unless all the ref are between Sources and references
        if (line.indexOf("<ref") >= 0 && index > this.#referencesIndex) {
          this.#style.bioHasRefAfterReferences = true;
        }
        // Only count misplaced line if there is a references tag
        if (index < this.#referencesIndex && this.#referencesIndex > 0) {
          this.#style.misplacedLineCount++;
        }
        let spanTargetStartPos = mixedCaseLine.indexOf(Biography.#SPAN_TARGET_START);
        if (spanTargetStartPos < 0) {
          if (this.#isValidSource(mixedCaseLine)) {
            if (!isValid) {
              isValid = true; // first one found
            }
          }
        } else {
          if (this.#isValidSpanTarget(mixedCaseLine)) {
            if (!isValid) {
              isValid = true; // first one found
            }
          }
        }
      }
      index = nextIndex;
    }
    return isValid;
  }

  /*
   * Validate string that is a span target
   * Side effect: add to invalidSpanTargetList for invalid target
   * @param {String} line line to be evaluated
   * @param {Number} startPos starting position in line
   * @returns {Boolean} true if valid else false
   */
  #isValidSpanTarget(mixedCaseLine) {
    let isValid = false;
    let spanTargetStartPos = mixedCaseLine.indexOf(Biography.#SPAN_TARGET_START);
    let beforeSpan = mixedCaseLine.substring(0, spanTargetStartPos - 1);

    // extract target id found here <span id='ID'>
    let pos = mixedCaseLine.indexOf("=");
    pos++; // skip the =
    pos++; // skip the '
    let endPos = mixedCaseLine.indexOf("'", pos);
    let spanId = mixedCaseLine.substring(pos, endPos);

    // Process the line starting after the end of the span target
    // but it might have source or repository before the <span>
    pos = mixedCaseLine.indexOf(Biography.#SPAN_TARGET_END);
    if (pos > 0) {
      pos = pos + Biography.#SPAN_TARGET_END.length;
    } else {
      this.#style.bioHasSpanWithoutEndingSpan = true;
      pos = mixedCaseLine.length;
    }
    if (pos < mixedCaseLine.length) {
      // something after ending span
      mixedCaseLine = beforeSpan + " " + mixedCaseLine.substring(pos).trim();
      isValid = this.#isValidSource(mixedCaseLine);
    }
    if (!isValid) {
      this.#invalidSpanTargetList.push(spanId);
    }
    return isValid;
  }

  /*
   * Check for a line that is just
   * The Peerage then some digits
   * @param {String} line to check
   * @returns {Boolean} true if just a peerage line 
   */
  #isJustThePeerage(line) {
    let isPeerage = true;
    line = line.replace(/[0-9]/g, '');
    line = line.replace('the peerage', '');
    line = line.trim();
    if (line.length > 0) {
      isPeerage = false;
    }
    return isPeerage;
  }

  /*
   * Check for a line that is just
   * some collection of numbers and digits then census
   * @param {String} line to check
   * @returns {Boolean} true if just a census line else false
   */
  #isJustCensus(line) {
    let isCensus = false;
    line = line.replace(/[^a-z ]/g, "");
    line = line.trim();
    if (this.#sourceRules.isCensus(line)) {
      isCensus = true;
    } else {
      // get the census string portion of the line
      let theStr = this.#sourceRules.hasCensusString(line);
      if (theStr.length > 0) {
        // lose census, at, on and everything not an alpha char
        line = line.replace(theStr, "");
        line = line.replace(/at/g, "");
        line = line.replace(/on/g, "");
        line = line.replace(/[^a-z]/g, "");
        line = line.trim();
        if (line.length === 0) {
          isCensus = true;
        } else {
          // lose things like ancestry, familysearch by themselves
          if (this.#sourceRules.isInvalidSource(line)) {
            isCensus = true;
          }
        }
      }
    }
    if (isCensus) {
      return true;
    } else {
      return false;
    }
  }
  /*
   * Check for a line that contains both findagrave and created by
   * created by is an invalid partial source string UNLESS part of a findagrave
   * citation
   * @param {String} line to test
   * @returns {Boolean} true if line contains both findagrave and created by
   */
  #isFindAGraveCitation(line) {
    //if (line.indexOf("findagrave") >= 0 && line.indexOf("created by") >= 0) {
    // need to handle the 93000+ managed by Family Tree Maker. Sigh
    if (line.indexOf("findagrave") >= 0) {
      return true;
    } else {
      return false;
    }
  }

  /*
   * Check for Ancestry Family Trees without a tree id
   * or a tree id less than 4 characters, such as 0
   * @param {String} line to test
   * @returns {Boolean} true if Ancestry tree seems to have an id
   */
  #invalidFamilyTree(line) {
    let isInvalidFamilyTree = false;
    let startPos = line.indexOf("ancestry family tree");
    if (startPos < 0) {
      startPos = line.indexOf("public member tree");
      if (startPos < 0) {
        startPos = line.indexOf("ancestry member family tree");
      }
      if (startPos < 0) {
        startPos = line.indexOf("{{ancestry tree");
      }
    }
    if (startPos >= 0) {
      line = line.substring(startPos);
      let hasId = false;
      let matches = line.match(/(\d+)/g);
      if (matches) {
        for (let i = 0; i < matches.length; i++) {
          if (matches[i].length > 4) {
            hasId = true;
          }
        }
      }
      if (!hasId) {
        isInvalidFamilyTree = true;
      }
    }
    return isInvalidFamilyTree;
  }

  /*
   * Check for just a repository
   * @param {String} line to test
   * @returns {Boolean} true if this is just a repository line
   */
  #isJustRepository(line) {
    let isRepository = false;
    if (line.includes("repository")) {
      let repositoryStrings = [
        "ancestry.com.au",
        "ancestry.com",
        "ancestry.co.uk",
        "ancestry.ca",
        "ancestry.de",
        "ancestry.it",
        "ancestry.fr",
        "ancestry.se",
        "ancestry.mx",
        "ancestry",
        "com",
        "name",
        "address",
        "http",
        "www",
        "the church of jesus christ of latter-day saints",
        "note",
        "family history library",
        "n west temple street",
        "salt lake city",
        "utah",
        "usa",
        "360 west 4800 north",
        "provo",
        "ut",
        "city",
        "country",
        "not given",
        "e-mail",
        "phone number",
        "internet",
        "cont",
        "unknown",
        "www.ancestry.com",
        "personal library",
      ];
      for (let i = 0; i < repositoryStrings.length; i++) {
        let str = repositoryStrings[i];
        line = line.replaceAll(str, "");
      }
      line = line.replace(/r-/g, "");
      line = line.replace(/#r/g, "");
      line = line.replace(/[^a-z]/g, "");
      line = line.trim();
      if (line.length > 0) {
        if (line === "repository") {
          isRepository = true;
        }
      }
    }
    return isRepository;
  }

  /*
   * check for GEDCOM crud see Suggestion 853
   * in most cases this is in the Bio not sources,
   * so you don't see it
   * @param {String} line line to test
   * @returns {Boolean} true if line contains GEDCOM crud and nothing else
   */
  #isJustGedcomCrud(line) {
    let isGedcomCrud = false;
    let crudStrings = [
      "user id",
      "data changed",
      "lds endowment",
      "lds baptism",
      "record file number",
      "submitter",
      "object",
      "color",
      "upd",
      "ppexclude",
    ];
    if (line.startsWith(":")) {
      line = line.substring(1);
    }
    line = line.trim();
    let i = 0;
    while (i < crudStrings.length && !isGedcomCrud) {
      if (line.startsWith(crudStrings[i])) {
        isGedcomCrud = true;
      }
      i++;
    }
    return isGedcomCrud;
  }

  /*
   * check to see if the source is a DNA source
   * @param {String} line line to test
   * @returns {Boolean} true if line appears to be a DNA source
   *
   * Is considered to be a DNA source if it has the name of a DNA
   * testing company or other strings that make it appear as a
   * probably DNA sources, such as DNA test or DNA research or DNA testing
   * but there are some DNA Test Companies, such as YSearch that might match
   * non DNA things, such as FamilySearch
   */
  #isDnaSourceLine(line) {
    let isDnaSourceLine = this.#sourceRules.hasCommonDnaTestCompany(line) || this.#sourceRules.isDnaSourceIdentifier(line);
    if (isDnaSourceLine) {
      // ignore line that starts with dna confirmation entered
      // or citation generated by dna confirmation app
      if (this.#ignoreDnaStart(line)) {
        isDnaSourceLine = false;
      } else {
        // ignore a line that is just DNA Confirmation(s) 
        let str = line.replace('dna confirmation', '');
        if (str.length < 3) {
          isDnaSourceLine = false;
        }
      }
    }
    return isDnaSourceLine;
  }
  /*
   * Does line start with a DNA related item that can be ignored?
   */
  #ignoreDnaStart(line) {
    return ((line.startsWith('dna confirmation entered')) ||
          (line.startsWith('citation generated by')) ||
          (line.startsWith('* dna confirmation entered')) ||
          (line.startsWith('* citation generated by')));
  }

  /*
   * Check DNA source line to see if it is a valid DNA confirmation
   * @param {String} line that appears to be a possible DNA source line
   * @returns {Boolean} true if line is a valid DNA confirmation
   *
   * Test DNA Source Confirmation per 
   *   https://www.wikitree.com/wiki/Help:DNA_Confirmation
   *   https://www.wikitree.com/wiki/Help:Y-Chromosome_DNA_Confirmation
   *   https://www.wikitree.com/wiki/Help:Advanced_DNA_Confirmations
   *   https://www.wikitree.com/wiki/Help:Triangulation
   *
   * The overall source requirements are specified in the DNA_Confirmation help.
   * Beyond that there are variants depending on the type of confirmation.
   *
   * So the approach is to first check for what is required in any case, then
   * parse the source statement to determine what type of confirmation and
   * check for other requirements based on that
   *
   * Required in any case
   * - at least one WikiTree-ID
   * - specifies paternal, maternal or both
   *   - includes any of 'paternal 'maternal' 'parental'
   * - name of DNA testing company (or 3rd party comparison website)
   * - either predicted relationship or amount of shared DNA (varies by type)
   *  
   * Required but not sure how to detect is the match - either via WikiTree-ID
   * or initials or something else. Since there might be a WikiTree-ID that is
   * used to specify a relationship, rather than the match. As a result, there
   * might not be testing for the genealogically known relationship with the 
   * match or for the most recent common ancestor. 
   *
   * Type of confirmation is based on keywords found in the source and then
   * may have different source requirements.
   *
   * Generally the most recent common ancestor(s) must only be supplied when
   * both matches are not on WikiTree
   *
   * If you made a change to be able to compress multiple lines with bullets following
   * that would probably break finding sources that are not DNA confirmations
   * see Miller-117607 
 */
  #isValidDnaConfirmation(line, mixedCaseLine) {
    let isValidConf = false;
    this.#dnaReason = '';
    let detectedType = 'simple autosomal'; // for debug

    let hasPaternalConf = false;
    let hasMaternalConf = false;
    if (line.includes('confirm')) {
      hasPaternalConf = this.#isPaternalConf(line);
      hasMaternalConf = this.#isMaternalConf(line);
      if (hasPaternalConf || hasMaternalConf) {
        if (this.#sourceRules.hasDnaTestCompany(line)) {
          // remove AncestryDNA and variants so they don't match other things
          line = line.replace(/ancestry\s(dna)?/, "");
          
          let mrcaStartIndex = this.#getMrcaStartIndex(line);
          let wikiTreeIdCount = this.#lineWikiTreeIdCount(line, mrcaStartIndex);  // guess how many WikiTree IDs are found
          if (wikiTreeIdCount > 0) {
            let cM = this.#getCm(line);
            if (this.#isTriangulation(line)) {
              detectedType = 'triangulation';
              isValidConf = this.#isValidTriangulatedConfirmation(line, cM);
            } else {
              if (this.#isXTest(line)) {
                detectedType = 'X Chromosome';
                isValidConf = this.#isValidXDnaConfirmation(line, cM);
              } else {
                if (this.#isMtDna(line)) {
                  detectedType = 'mtDNA';
                  isValidConf = this.#isValidMtDnaConfirmation(line);
                } else { 
                  if (this.#isYTest(line)) {
                    detectedType = 'Y Chromosome';
                    isValidConf = this.#isValidYDnaConfirmation(line);
                  } else {
                    isValidConf = this.#isValidAutosomalConfirmation(line, cM, wikiTreeIdCount, mrcaStartIndex);
                  }
                }
              }
            }
          } else {
            this.#dnaReason = 'Missing WikiTree-ID';
          }
        } else {
          this.#dnaReason = 'Missing DNA test company';
        }
      } else {
        this.#dnaReason = 'Missing paternal or maternal';
      }
    } else {
        this.#dnaReason = 'Missing confirmation';
    }
    if (isValidConf) {
      // Note if it is for father or mother or both
      if (hasPaternalConf) {
        this.#style.bioHasPaternalDnaConf = true;
      }
      if (hasMaternalConf) {
        this.#style.bioHasMaternalDnaConf = true;
      }
    } else {
//console.log('incomplete confirmation ' + line);
//console.log('detectedType ' + detectedType);
//console.log(this.#dnaReason);
      this.#style.bioHasIncompleteDNAconfirmation = true;
    }
    // Save for reporting
    let dnaSource = {
      dnaSourceValid: false,
      dnaSourceReason: "",
      dnaSourceText: "",
    };
    dnaSource.dnaSourceValid = isValidConf;
    dnaSource.dnaSourceReason = this.#dnaReason;
    dnaSource.dnaSourceText = mixedCaseLine;
    this.#dnaSourceList.push(dnaSource);
    if (!isValidConf) {
      let dnaReportLine = this.#dnaReason + ': ' + mixedCaseLine;
      if (dnaReportLine.length > 120) {
        dnaReportLine = dnaReportLine.substring(0, 120) + '...';
      }
      this.#sources.invalidDnaSourceList.push(dnaReportLine);
    }
    return isValidConf;
  }

  /*
   * Is it a valid X chromosome confirmation
   * Both testers must be male (how to check this?)
   * Confirmation can be either paternal or maternal
   */
  #isValidXDnaConfirmation(line, cM) {
    // both matches must be male, no way to test
    let isValidConf = false;
    if (cM < 1) {
      this.#dnaReason = 'Missing shared DNA (X)';
    } else {
      isValidConf = true;
    }
    return isValidConf;
  }
  /*
   * Is it a valid mtDNA 
   */
  #isValidMtDnaConfirmation(line) {
    let isValidConf = false;
    // Cannot test for "minor mismatches" on Mitochrondrial DNA so just look for either
    // * of 'hvr1' or 'hvr2' or 'exact match'
    if (!(line.includes('hvr1')) && !(line.includes('hvr2')) &&
        !(line.includes('exact match'))) {
      this.#dnaReason = 'Missing shared DNA (mtDNA)';
    } else {
      if (line.includes('paternal')) {
        this.#dnaReason = 'Cannot confirm paternal relationship';
      } else {
        isValidConf = true;
      }
    }
    return isValidConf;
  }
  /*
   * Is it a valid triangulated confirmation
   * Although they must not be third cousins or closer this is virtually impossible to test
   */
  #isValidTriangulatedConfirmation(line, cM) {
    let isValidConf = false;
    if ((!line.includes('chromosome')) && (!line.includes('chr')) &&
        (!line.includes('ch'))) {
      this.#dnaReason = 'Missing shared chromosome';
    } else {
      isValidConf = true;
      cM = this.#findLargestPrecedingNumber(line, 'cm'); 
      if (cM < 7) {
        cM = this.#findLargestPrecedingNumber(line, 'segment'); 
      }
      if (cM < 7) {
        this.#dnaReason = 'Missing shared DNA (Triangulation)';
        isValidConf = false;
      }
    }
    return isValidConf;
  }
  /*
   * Is it a valid Y-DNA confirmation
   * Has STR differences or distances
   * number of markers and genetic distance
   */
  #isValidYDnaConfirmation(line) {
    let isValidConf = false;
    if (line.includes('maternal')) {
      this.#dnaReason = 'Cannot confirm maternal relationship';
    } else {
      let isBigY = this.#isBigY(line);
      let hasDiffOrDist = line.includes('differ') || line.includes('distance');
      let hasMarkerOrStr = line.includes('marker') || line.includes('str');
      let hasStrNum = line.includes('37') || line.includes('67') || line.includes('111') || line.includes('700');
      let markers = this.#findPrecedingNumber(line, 'marker');
      if (markers < 37) {
        markers = this.#findPrecedingNumber(line, 'str');
      }
      if (markers >= 37) {
        isValidConf = true;
      } else {
        if ((hasDiffOrDist || hasMarkerOrStr) && (hasStrNum || isBigY)) {
          isValidConf = true;
        } else {
          this.#dnaReason = 'Missing shared DNA (Y)';
        }
      }
    }
    return isValidConf;
  }
  /*
   * Is it a valid autosomal confirmation
   * - predicted relationship or amount of shared DNA
   * - and when match not on WikiTree must have relationship
   */
  #isValidAutosomalConfirmation(line, cM, wikiTreeIdCount, mrcaStartIndex) {
    let isValidConf = false;

    let sharedDnaPercent = this.#getSharedDnaPercent(line);
    let hasAmount = (cM > 0) || (sharedDnaPercent > 0);
    if (!hasAmount) {
      let regex = /predicted\s+/;
      if (!regex.test(line)) {
        hasAmount = false;
        this.#dnaReason = 'Missing predicted relationship or shared DNA';
      }
    }
    if (hasAmount) {
      // so if we have a valid amount of shared DNA is the match on WikiTree?
      isValidConf = true;
      if (wikiTreeIdCount < 2) {  
        if (!this.#hasRelationship(line, mrcaStartIndex)) {
          this.#dnaReason = 'Missing relationship'; 
          isValidConf = false;
        } else {
          // Does it have most recent common ancestor?
          if (mrcaStartIndex < 0) {
            /* The help does not address the special case when the match is on WikiTree but is not open.
             * This might occur, for example, with a living parent. In that case, it does seem appropriate
             * that the match is not specified by WikiTree-ID.
             *
             * There is the special case that the WikiTree-ID and the match have a parent/child relationship.
             * In this case, it is probably not necessary to specify MCRA but instead that relationship.
             *
             */
            if (!line.includes('parent/child')) {  // special case
              this.#dnaReason = 'Missing most-recent common ancestor'; 
              isValidConf = false;
            }
          }
        }
      }
    }
    if (isValidConf) {
      // Predicted relationships: MyHeritage: 3rd - 4th cousin, FTDNA: 2nd-4th Cousin
      // AncestryDNA: 3rd-4th Cousins
      // if (line.includes('fourth cousin') || line.includes('4th cousin') || 
      if (line.includes('fourth cousin') || 
          line.includes('4C') || line.includes('3C1')) {
        this.#style.bioHasStyleIssues = true;
        this.#messages.styleMessages.push('DNA Match might not be 3rd cousin or closer');
      }
      // Could be as little as 0 so just report for the fourth cousins numbers
      if (((cM > 0) && (cM < 13)) || ((sharedDnaPercent > 0) && (sharedDnaPercent < .19))) {
        this.#style.bioHasStyleIssues = true;
        this.#messages.styleMessages.push('DNA Match might not be 3rd cousin or closer');
      }
    }
    return isValidConf;
  }

  /* 
   * Is this a paternal confirmation
   */
  #isPaternalConf(line) {
    line = line.replaceAll('grandfather', '');
    return ((line.includes('paternal') || line.includes('father') ||
             line.includes('paternity') || line.includes('parental')) ||
             line.includes(' parents confirm') &&
            (line.includes('relation') || line.includes('descent') ||
             line.includes('line')));
  }
  /* 
   * Is this a maternal confirmation
   */
  #isMaternalConf(line) {
    line = line.replaceAll('grandmother', '');
    return ((line.includes('maternal') || line.includes('mother') ||
             line.includes('maternity') || line.includes('parental')) ||
             line.includes(' parents confirm') &&
            (line.includes('relation') || line.includes('descent') ||
             line.includes('line')));
  }

  /*
   * Find start of Most Recent Common Ancestor
   * returns index or -1 if not found
   */
  #getMrcaStartIndex(line) {
    let mrcaStartIndex = line.indexOf('mrca');
    if (mrcaStartIndex < 0) {
      mrcaStartIndex = line.indexOf('most-recent common ancestor')
      if (mrcaStartIndex < 0) {
        mrcaStartIndex = line.indexOf('most recent common ancestor')
        if (mrcaStartIndex < 0) {
          mrcaStartIndex = line.indexOf('mcra')  // maybe wrong?
        }
      } 
    }
    return mrcaStartIndex;
  }

  /*
   * Does line appear to have a WikiTree-ID 
   */
  #lineWikiTreeIdCount(line, mrcaStartIndex) {
    line = line.replace('y-chromosome', 'y chromosome');
    line = line.replace('y-str', 'y str');
    line = line.replace('y-700', 'y 700');

    // typically have wikiTreeId after MRCA, don't want that one
    if (mrcaStartIndex > 0) {
      line = line.substring(0, mrcaStartIndex);
    }
    // Find parts of line that have a - then check that as possible id
    let idCount = 0;
    let bigParts = line.split(/[,;|\[\]]/);
    for (let i = 0; i < bigParts.length; i++) {
      if (bigParts[i].includes('-')) {
        let littleParts = bigParts[i].split('-');
        if (littleParts.length === 2) {
          if (this.#looksLikeWikiTreeId(littleParts[0].trim(), littleParts[1].trim())) {
            idCount++;
          }
        }
      }
    }
    return idCount;
  }
  /*
   * Does this look like two parts of a WikiTree-Id
   * it might have the whole https://www.wikitree.com/wiki/ on the front
   * and a valid _ in the name portion
   * and stuff after the numbers
   */
  #looksLikeWikiTreeId(namePart, numberPart) {

    namePart = namePart.replace('https://www.wikitree.com/wiki/', '');
    let isAlpha = /^[a-zA-Z\u00C0-\u017F_]+$/.test(namePart);

    let numbers = numberPart.split(' ', 1);
    let isNumeric = /\d/.test(numbers[0]);
    return (isAlpha && isNumeric);
  }
  
  /* 
   * Does line have what looks like a relationship
   * before the MRCA
   */
  #hasRelationship(line, mrcaStartIndex) {
    if (mrcaStartIndex > 0) {
      line = line.substring(0, mrcaStartIndex);
    }
    let relationWords = [
      'parents',
      'mother',
      'father',
      'daughter',
      'son',
      'sibling',
      'sister',
      'brother',
      'grandmother',
      'grandfather',
      'grandchild',
      'aunt',
      'uncle',
      'niece',
      'nephew',
      'cousin',
      '1c',
      '2c',
      '3c',
      '4c',
    ];
    return this.#sourceRules.lineContainsListEntry(line, relationWords);
  }

  /*
   * Find number of cM.
   * Note at present this only works for . as a decimal separator, not for ,
   */
  #getCm(line) {
    let cM = this.#findPrecedingNumber(line, ' cm');
    if (cM == 0) {
      cM = this.#findPrecedingNumber(line, 'centimorgan');
    }
    if (cM == 0) {
      cM = this.#findPrecedingNumber(line, 'cm ');
    }
    return cM;
  }

  /*
   * Find number immediately preceding a phrase in a line
   */
  #findPrecedingNumber(line, str) {
    let num = 0;
    let stopIndex = line.indexOf(str);
    if (stopIndex > 0) {
      line = line.replaceAll(',', '.');  // allow use of , for decimal number
      let numberParts = line.slice(0, stopIndex).match(/\d+(\.\d+)?/g);
      if (numberParts) {
        if (numberParts.length > 0) {
          num = numberParts[numberParts.length - 1];
        }
      }
    }
    return num;
  }

  /* 
  * Find largest number immediately preceding a phrase in a line
  * where the phrase may occur multiple times
  */
  #findLargestPrecedingNumber(line, str) {
    let num = this.#findPrecedingNumber(line, str);
    let strLen = str.length;
    let nextIndex = line.indexOf(str) + strLen;
    let nextLine = line;
    while (nextIndex >= strLen) {  // since we add the length of str
      nextLine = nextLine.substring(nextIndex);
      let nextNum = this.#findPrecedingNumber(nextLine, str);
      num = Math.max(nextNum, num);
      nextIndex = nextLine.indexOf(str) + strLen;
    }
    return num;
  }

  /*
   * Find percent shared DNA
   */
  #getSharedDnaPercent(line) {
    let sharedDna = this.#findPrecedingNumber(line, 'shared dna');
    if (sharedDna <= 0) {
      sharedDna = this.#findPrecedingNumber(line, 'dna shared');
    }
    if (sharedDna <= 0) {
      sharedDna = this.#findPrecedingNumber(line, '%');
    }
    return sharedDna; 
  }
  /*
   * Does this look like a Y DNA test?
   */
  #isYTest(line) {
    let isYWords = [
      'y chromosome',
      'y-chromosome',
      'y dna testing',
      'y-dna',
      'y 700',
      'y-700',
      'marker',
    ];
    return (this.#sourceRules.lineContainsListEntry(line, isYWords) || this.#isBigY(line));
  }
  /*
   * Does this look like a Big Y test?
   */
  #isBigY(line) {
    let isBigYWords = [
      'bigy',
      'big y',
      'y-700',
      'y700',
      'ystr',
      'y-str',
      '700 dna',
    ];
    return this.#sourceRules.lineContainsListEntry(line, isBigYWords);
  }
  /* 
   * Does this look like an X DNA test?
   */
  #isXTest(line) {
    return ((line.includes('x chromosome')) || (line.includes('x-dna')) &&
            (!this.#isTriangulation(line)));
  }
  /*
   * Does this look like a triangulation?
   * It has triang or three but doesn't have needed
   */
  #isTriangulation(line) {
    // a valid triangulation can mention three times removed but 
    // others can mention it and not be a triangulation
    line = line.replace('three times', ' ');  // not a triangluation
    line = line.replace('three cousins', ' ');  // not a triangluation
    return ((line.includes('triangul')) || (line.includes('three')) &&
            !(line.includes('required')) && !(line.includes('needed')));
  }
  /*
   * Does this look like a MtDNA test
   */
  #isMtDna(line) {
    return ((line.includes('hvr')) || (line.includes('mtdna')) ||
            (line.includes('mitochrondial')));
  }

  /*
   * Check to see if the line is just a combination of lines by themselves that are not valid
   */
  #isJustCombinedLines(line) {
    let isJustCombined = false;
    /*
     * You cannot split based on punctuation since many valid source citations include punctuation
     * so that means instead taking the line and removing just the invalid standalone sources
     * then seeing if anything is left
     *
     * the invalid source list only has non sources with > 15 characters so...
     * needs special logic to remove those items
     *
     */
     /* 
      * First remove any invalid source line
      * then take out any too old to remember
      * then take out any pre1700
      * anything left?
      */
      let linePart = line.replaceAll(';', ',');
      linePart = this.#sourceRules.removeInvalidSourcePart(linePart);
      if ((linePart.length > 0) && (this.#tooOldToRemember)) {
        linePart = this.#sourceRules.removeInvalidSourcePartTooOld(linePart);
        if ((linePart.length > 0) && (this.#isPre1700 || this.#treatAsPre1700)) {
          linePart = this.#sourceRules.removeInvalidSourcePartPre1700(line);
        }
      }

      // you could go the extra mile and get rid of the punctuation but...
      // each is trimmed when parts removed
      linePart.trim();
      if (linePart.length < 3) {
        isJustCombined = true;
      }
    return isJustCombined;
  }
}
