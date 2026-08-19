/**
 * The Auto Bio editor UI: the button box, the "old bio" message, error reporting,
 * and the "improve with AI" panel. Pure DOM work — no biography text is built here.
 */
import $ from "jquery";
import * as Diff from "diff";
import { getFeatureOptions } from "../../core/options/options_storage";
import { isIansProfile } from "../../core/pageType";
import { addWorking, getBioText, removeWorking, setBioText } from "./editorUtils.js";
import { initBioCheck } from "../bioCheck/bioCheck.js";
import aiModels from "./ai_models.json";

const AUTO_BIO_AI_MODEL_CONFIG = {
  openai: { optionId: "openAIModel", defaultModel: "gpt-5.6-terra", models: aiModels.openai },
  gemini: { optionId: "geminiModel", defaultModel: "gemini-3.5-flash", models: aiModels.gemini },
  claude: { optionId: "claudeModel", defaultModel: "claude-sonnet-5", models: aiModels.claude },
  perplexity: { optionId: "perplexityModel", defaultModel: "sonar", models: aiModels.perplexity },
  xai: { optionId: "xaiModel", defaultModel: "grok-4.3", models: aiModels.xai },
};

export async function migrateAutoBioAiModelOptions(options) {
  const normalized = { ...(options || {}) };
  let changed = false;

  const provider = normalized.aiProvider;
  if (!AUTO_BIO_AI_MODEL_CONFIG[provider]) {
    normalized.aiProvider = "openai";
    changed = true;
  }

  for (const [providerId, config] of Object.entries(AUTO_BIO_AI_MODEL_CONFIG)) {
    const validModelIds = new Set(config.models.map((model) => model.value));
    const currentModel = normalized[config.optionId];
    if (!currentModel || !validModelIds.has(currentModel)) {
      normalized[config.optionId] = config.defaultModel;
      changed = true;
    }
  }

  if (changed) {
    await chrome.storage.sync.set({ autoBio_options: normalized });
  }

  return normalized;
}

function restoreAutoBioFormState(fieldState) {
  if (!fieldState || typeof fieldState !== "object") {
    return;
  }

  Object.entries(fieldState).forEach(([fieldId, fieldValue]) => {
    const field = $("#" + fieldId);
    if (field.length) {
      field.val(fieldValue);
    }
  });
}

export function removeOldBioMessage() {
  if ($("#wpTextbox1").length == 0) {
    return;
  }
  let remove = false;
  if ($(".CodeMirror").length) {
    if (
      $(".CodeMirror")
        .text()
        .match(/WikiTree Browser Extension Auto Bio/) == null
    ) {
      remove = true;
    }
  } else if (
    $("#wpTextbox1")
      .val()
      .match(/WikiTree Browser Extension Auto Bio/) == null
  ) {
    remove = true;
  }
  if (remove) {
    $("#deleteOldBioMessage").remove();
  }
}

export function addErrorMessage() {
  // Check if there's an error message in the localStorage
  if (localStorage.getItem("error_message")) {
    // If so, click the first private message link
    // Select the node that will be observed for mutations
    let targetNode = document.body; // Replace with a closer parent if possible

    // Options for the observer (which mutations to observe)
    let config = { childList: true, subtree: true };

    // Callback function to execute when mutations are observed
    let callback = function (mutationsList, observer) {
      for (let mutation of mutationsList) {
        // Check the addedNodes property
        for (let node of mutation.addedNodes) {
          // Use the instanceof operator to ensure the added node is an Element
          if (node instanceof Element) {
            // Check if our target element exists within this node
            let targetElement = node.querySelector("#privateMessage-comments");
            if (targetElement) {
              // Get member's first name from the form #privateMessgae-sender_name
              let memberName = $("#privateMessage-sender_name").val().split(" ")[0];
              $("#privateMessage-comments").val(
                localStorage.getItem("error_message") + "\n\nGood Luck!\n\n" + memberName
              );
              $("#privateMessage-subject").val("Auto Bio bug report");
              // Clear the error message from the localStorage
              localStorage.removeItem("error_message");
              observer.disconnect();
            }
          }
        }
      }
    };

    // Create an observer instance linked to the callback function
    let observer = new MutationObserver(callback);

    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);
    $(".privateMessageLink")[0].click();
  }
}

export const AUTO_BIO_MARKER = "WikiTree Browser Extension Auto Bio";

export function addAutoBioUI() {
  removeAutoBioUI(); // Clean up first

  // Status message
  if ($("#deleteOldBioMessage").length === 0) {
    $("#draftStatus").before(
      `<div id="deleteOldBioMessage" class="status">
        <span class="large" style="display:block; font-weight:bold; margin-bottom:0.3em;">Auto Bio</span>
        Don't forget to <b>delete the old bio</b> and the Auto Bio message above it.
      </div>`
    );
  }

  if ($("#autoBioButtonBox").length === 0) {
    // Basic AutoBio UI (Delete Old Bio, etc)
    // Removed specific styling to match native look as requested
    const buttonBox = $(
      "<div id='autoBioButtonBox' style='display: inline-flex; gap: 2px; align-items: center; margin-left: 2px; position: relative;'></div>"
    );

    const hasAIKey = [
      window.autoBioOptions?.openAIKey,
      window.autoBioOptions?.geminiKey,
      window.autoBioOptions?.claudeKey,
      window.autoBioOptions?.perplexityKey,
      window.autoBioOptions?.xaiKey,
    ].some((key) => typeof key === "string" && key.trim() !== "");

    if (hasAIKey) {
      // AI BUTTON
      const aiButton = $("<button id='improveAI' class='small editToolbarButton'>Improve with AI</button>");
      aiButton.on("click", improveBioWithAI);
      buttonBox.append(aiButton);

      // CUSTOM INSTRUCTIONS UI
      const customInstructionsBtn = $(
        "<button id='autoBioCustomInstructionsBtn' class='small editToolbarButton' title='Custom AI Instructions' style='padding: 0 4px;'>⚙️</button>"
      );
      buttonBox.append(customInstructionsBtn);

      const customInstructionsPanel = $(
        `<div id='autoBioCustomInstructions' style='display: none; position: absolute; background: white; border: 1px solid #ccc; padding: 10px; z-index: 1000; box-shadow: 0 2px 5px rgba(0,0,0,0.2); width: 300px; top: 35px; right: 0; cursor: default;'>
          <div id='autoBioCustomInstructionsHeader' style='display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; cursor: move;'>
            <span style='font-weight: bold;'>Custom AI Instructions</span>
            <button id='autoBioCustomInstructionsClose' class='small' style='background: none; border: none; cursor: pointer; font-size: 16px; padding: 0 4px;'>&times;</button>
          </div>
          <textarea id='autoBioCustomInstructionsText' style='width: 100%; height: 80px; font-size: 12px; margin-bottom: 5px;' placeholder='e.g., Use "passed away" instead of "died"...'></textarea>
          <label><input type='checkbox' id='autoBioUseCustomInstructions'> Use these instructions</label>
        </div>`
      );
      buttonBox.append(customInstructionsPanel);

      customInstructionsBtn.on("click", function (e) {
        e.preventDefault();
        customInstructionsPanel.toggle();
      });

      customInstructionsPanel.find("#autoBioCustomInstructionsClose").on("click", function (e) {
        e.preventDefault();
        customInstructionsPanel.hide();
      });

      // Make it draggable if jQuery UI is loaded
      if (typeof $.fn.draggable === "function") {
        customInstructionsPanel.draggable({ handle: "#autoBioCustomInstructionsHeader" });
      }

      // Load from localStorage
      const savedInstructions = localStorage.getItem("autoBioCustomInstructions") || "";
      const savedUse = localStorage.getItem("autoBioUseCustomInstructions") === "true";

      customInstructionsPanel.find("#autoBioCustomInstructionsText").val(savedInstructions);
      customInstructionsPanel.find("#autoBioUseCustomInstructions").prop("checked", savedUse);

      // Save on change
      customInstructionsPanel
        .find("#autoBioCustomInstructionsText, #autoBioUseCustomInstructions")
        .on("change input", function () {
          localStorage.setItem("autoBioCustomInstructions", $("#autoBioCustomInstructionsText").val());
          localStorage.setItem("autoBioUseCustomInstructions", $("#autoBioUseCustomInstructions").prop("checked"));
        });
    }

    const removeButton = $("<button id='removeAutoBio' class='small editToolbarButton'>Undo Auto Bio</button>");
    removeButton.on("click", function (e) {
      e.preventDefault();
      if (window.autoBio_originalBio) {
        setBioText(window.autoBio_originalBio, "replace");
      } else {
        // Fallback: Try to extract text AFTER the marker (which is where we put the Old Bio now)
        let bioNow = getBioText();
        let oldBio = bioNow.replace(/^.*?--- WikiTree Browser Extension Auto Bio ---[\s\S]+?-->\s*/s, "");
        // Ensure oldBio (Base) doesn't have the Auto Bio marker/comments causing diff noise on the left side
        // This handles cases where we fell back to 'lastGenerated' which includes comments
        // We use a generic comment remover to be absolutely sure no instructions leak into the Diff view.
        oldBio = oldBio.replace(/<!--[\s\S]*?-->/g, "").trim();
        setBioText(oldBio, "replace");
      }
      restoreAutoBioFormState(window.autoBio_originalFields);
      removeAutoBioUI();
      // Clear cached variables to reset state
      window.autoBio_cleanDraft = null;
      window.autoBio_commentBlock = null;
      window.autoBio_originalFields = null;
      // window.autoBio_originalBio = null; // Don't clear this immediately? No, we should clear it to allow fresh start.
      window.autoBio_originalBio = null;
    });
    buttonBox.append(removeButton);

    // Check if we have an "Old Bio" to delete
    if (getBioText().includes("<!-- Old Bio -->") || getBioText().includes("<!--")) {
      const deleteButton = $("<button id='deleteOldBio' class='small editToolbarButton'>Delete Old Bio</button>");
      deleteButton.on("click", function (e) {
        e.preventDefault();
        let text = getBioText();

        // Find the start of the Auto Bio message
        // The message is a comment containing "WikiTree Browser Extension Auto Bio"
        const marker = "WikiTree Browser Extension Auto Bio";
        const commentStart = "<!--";

        let headerIndex = -1;

        // We need to find the specific comment block
        // A simple indexOf matching might be risky if they have the text elsewhere,
        // but it's unlikely another comment has this exact string unless it IS the auto bio marker.
        // We iterate specifically to find the COMMENT containing the marker.

        const regex = /<!--[\s\S]*?WikiTree Browser Extension Auto Bio[\s\S]*?-->/g;
        const match = regex.exec(text);

        if (match) {
          headerIndex = match.index;
        }

        if (headerIndex !== -1) {
          // Delete everything from the start of the message to the end
          text = text.substring(0, headerIndex).trim();
        } else {
          // Fallback: If we can't find the specific marker but we know we have an "Old Bio",
          // try to remove just the old bio text if we have it cached.
          if (window.autoBio_originalBio) {
            text = text.replace(window.autoBio_originalBio, "").trim();
          }
        }

        setBioText(text, "replace");
        $(this).remove();
        $("#deleteOldBioMessage").remove();
      });
      buttonBox.append(deleteButton);
    }

    if ($("#editToolbarExt").length) {
      $("#editToolbarExt").append(buttonBox);
    } else {
      $("#toolbar").after(buttonBox);
    }
  }
}

async function improveBioWithAI(e) {
  e.preventDefault();
  const btn = $(this);
  const originalText = btn.text();
  btn.text("Thinking...").prop("disabled", true);
  removeWorking();
  addWorking();

  try {
    // 1. REFRESH OPTIONS
    window.autoBioOptions = await migrateAutoBioAiModelOptions(await getFeatureOptions("autoBio"));

    // 2. STRICT VARIABLE USAGE (Per User Request)
    const oldBio = window.autoBio_originalBio;
    // Prefer cleanDraft (captured before UI add-ons), fallback to lastGenerated if needed
    let newBio = window.autoBio_cleanDraft || window.autoBio_lastGenerated;

    console.log("AutoBio Logic: Using stored bio variables.");
    console.log("Old Bio (Original):", oldBio ? oldBio.substring(0, 50) + "..." : "MISSING");
    console.log("New Bio (Draft):", newBio ? newBio.substring(0, 50) + "..." : "MISSING");

    if (!oldBio || !newBio) {
      alert("Missing Auto Bio data! Please click 'Auto Bio' again to generate a fresh draft before using AI.");
      return;
    }

    const provider = window.autoBioOptions?.aiProvider || "openai";
    let selectedKey = "";
    let selectedModel = window.autoBioOptions?.aiModel || "";

    if (provider === "openai") {
      selectedKey = window.autoBioOptions?.openAIKey;
      if (!selectedModel) selectedModel = window.autoBioOptions?.openAIModel || "gpt-5.6-terra";
    } else if (provider === "gemini") {
      selectedKey = window.autoBioOptions?.geminiKey;
      if (!selectedModel) selectedModel = window.autoBioOptions?.geminiModel || "gemini-3.5-flash";
    } else if (provider === "claude") {
      selectedKey = window.autoBioOptions?.claudeKey;
      if (!selectedModel) selectedModel = window.autoBioOptions?.claudeModel || "claude-sonnet-5";
    } else if (provider === "perplexity") {
      selectedKey = window.autoBioOptions?.perplexityKey;
      if (!selectedModel) selectedModel = window.autoBioOptions?.perplexityModel || "sonar";
    } else if (provider === "xai") {
      selectedKey = window.autoBioOptions?.xaiKey;
      if (!selectedModel) selectedModel = window.autoBioOptions?.xaiModel || "grok-4.3";
    }

    const requestPayload = {
      action: "improveBioWithAI", // FIXED: Matches background.js listener
      oldBio: oldBio,
      newBio: newBio,
      provider: provider,
      key: selectedKey,
      model: selectedModel,
      diedWord: window.autoBioOptions?.diedWord || "died",
      inlineCitations:
        typeof window.autoBioOptions?.inlineCitations !== "undefined" ? window.autoBioOptions.inlineCitations : true,
      dateFormat: window.autoBioOptions?.dateFormat || "MDY",
      dateStatusFormat: window.autoBioOptions?.dateStatusFormat || "abbreviations",
      yearsDateStatusFormat: window.autoBioOptions?.yearsDateStatusFormat || "symbols",
      deathPosition: window.autoBioOptions?.deathPosition || false,
      customInstructions:
        localStorage.getItem("autoBioUseCustomInstructions") === "true"
          ? localStorage.getItem("autoBioCustomInstructions")
          : "",
    };

    console.log("Sending to AI:", requestPayload);

    if (!requestPayload.key) {
      alert("API Key is missing! Please ensure you have entered your API Key in the Auto Bio Options.");
      return;
    }

    // Now send to AI
    const response = await chrome.runtime.sendMessage(requestPayload);

    if (response && response.success) {
      let aiBio = response.bio
        .replace(/```markdown/g, "")
        .replace(/```/g, "")
        .trim();

      // Ensure newBio (Base) doesn't have the Auto Bio marker/comments causing diff noise on the left side
      // We use a generic comment remover to be absolutely sure no instructions leak into the Diff view.
      newBio = newBio.replace(/<!--[\s\S]*?-->/g, "").trim();

      showAIResult(aiBio, newBio, oldBio);
    } else {
      console.error("AI Response Error:", response);
      alert(
        "AI Error: " +
          (response
            ? response.error
            : "No response from AI service. Check that your API Key is correct and has credits.")
      );
    }
  } catch (error) {
    console.error(error);
    alert("Error: " + error.message);
  } finally {
    removeWorking();
    btn.text(originalText).prop("disabled", false);
  }
}

function showAIResult(aiBio, cleanBaseBio, fullOriginalText) {
  if ($("#aiBioReviewBox").length > 0) {
    $("#aiBioReviewBox").remove();
  }

  // Calculate Diff with strict normalization to avoid false positives on whitespace/newlines and WikiText styling
  const smartNormalize = (str) =>
    (str || "")
      .replace(/\r\n/g, "\n") // Standardize newlines
      .replace(/\r/g, "\n")
      .replace(/\u00A0/g, " ") // Kill NBSPs
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // Kill zero-width chars
      .replace(/[\u2018\u2019]/g, "'") // Smart single quotes -> straight
      .replace(/[\u201C\u201D]/g, '"') // Smart double quotes -> straight
      .replace(/[ \t]+$/gm, "") // Kill trailing spaces
      //.replace(/\n{2,}/g, "\n") // REMOVED: Preserving blank lines for diff visibility
      .replace(/==\s*([^=]+?)\s*==/g, "== $1 ==") // Standardize Header Spacing
      .replace(/\[\[\s*([^|\]]+?)\s*\|\s*([^\]]+?)\s*\]\]/g, "[[$1|$2]]") // Standardize Link Pipe Spacing
      .replace(/\[\[Category:\s*([^\]]+?)\]\]/g, "[[Category: $1]]") // Standardize Category Spacing
      .replace(/<references\s*\/?>/gi, "<references />") // Normalize references
      .replace(/^See also:?$/gim, "See also:") // Normalize See also
      .replace(/^\*\s+/gm, "* ") // Normalize bullet points spacing
      .replace(/ +/g, " ") // Collapse multiple spaces
      .trim();

  const baseNorm = smartNormalize(cleanBaseBio);
  const aiNorm = smartNormalize(aiBio);

  // Switch back to diffWords as diffLines was too aggressive visually
  const diff = Diff.diffWords(baseNorm, aiNorm);

  let leftHtml = "";
  let rightHtml = "";

  diff.forEach(function (part) {
    const escapedValue = part.value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    if (part.added) {
      rightHtml += `<span style="background-color: #dcfce7; text-decoration: none; color: #166534; padding: 2px 0;">${escapedValue}</span>`;
    } else if (part.removed) {
      leftHtml += `<span style="background-color: #fee2e2; text-decoration: line-through; color: #991b1b; padding: 2px 0;">${escapedValue}</span>`;
    } else {
      leftHtml += escapedValue;
      rightHtml += escapedValue;
    }
  });

  const box =
    $(`<div id="aiBioReviewBox" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; justify-content: center; align-items: center; box-sizing: border-box;">
        <div style="background: white; padding: 20px; border-radius: 8px; width: 95%; max-width: 1400px; height: 90vh; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: flex; flex-direction: column; gap: 15px; box-sizing: border-box;">
            <h3 style="margin: 0; color: #1e3a8a; font-size: 1.25rem;">AI Suggested Changes (Side-by-Side)</h3>

            <div style="display: flex; gap: 20px; flex-grow: 1; min-height: 0; width: 100%; box-sizing: border-box;">
                <div style="flex: 1; display: flex; flex-direction: column; min-width: 0;">
                    <h4 style="margin: 0 0 5px 0; color: #666;">Original (Auto Bio Draft)</h4>
                    <div id="aiBioDiffLeft" style="border: 1px solid #ccc; padding: 10px; border-radius: 4px; overflow-y: auto; font-family: monospace; white-space: pre-wrap; line-height: 1.5; flex-grow: 1; background: #f9fafb; width: 100%; box-sizing: border-box;">${leftHtml}</div>
                </div>
                <div style="flex: 1; display: flex; flex-direction: column; min-width: 0;">
                    <h4 style="margin: 0 0 5px 0; color: #2563eb;">AI Result</h4>
                    <div id="aiBioDiffRight" style="border: 1px solid #2563eb; padding: 10px; border-radius: 4px; overflow-y: auto; font-family: monospace; white-space: pre-wrap; line-height: 1.5; flex-grow: 1; background: white; width: 100%; box-sizing: border-box;">${rightHtml}</div>
                </div>
            </div>

            <textarea id="aiBioTextarea" style="display:none;">${aiBio}</textarea>

            <div style="display: flex; gap: 10px; justify-content: flex-end; align-items: center; box-sizing: border-box;">
                <button id="discardAIBio" class="small editToolbarButton" style="background: #ef4444; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Discard</button>
                <button id="acceptAIBio" class="small editToolbarButton" style="background: #2563eb; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Use AI Version</button>
            </div>
        </div>
    </div>`);

  $("body").append(box);

  // Sync Scrolling
  const leftPane = $("#aiBioDiffLeft");
  const rightPane = $("#aiBioDiffRight");

  leftPane.on("scroll", function () {
    if (!leftPane.is(":hover")) return;
    rightPane.scrollTop(leftPane.scrollTop());
  });
  rightPane.on("scroll", function () {
    if (!rightPane.is(":hover")) return;
    leftPane.scrollTop(rightPane.scrollTop());
  });

  $("#acceptAIBio").on("click", function (e) {
    e.preventDefault();

    let finalBio = $("#aiBioTextarea").val().trim();

    // Re-attach the Auto Bio Comment Block (Instructions) AND the Old Bio
    // This restores the user's preferred order: AI Bio first, then the Auto Bio block, then the Old Bio.
    if (window.autoBio_commentBlock) {
      finalBio += "\n\n" + window.autoBio_commentBlock;
      // The extensionNotes (commentBlock) ends with "-->", so we should probably append the old bio AFTER it?
      // Wait, normally AutoBio wraps the old bio IN the comments?
      // The user request said: "[Auto Bio Comment Block with Instructions] ... Please add the old bio after that."
      // So:
      if (window.autoBio_originalBio) {
        finalBio += "\n" + window.autoBio_originalBio;
      }
    }

    setBioText(finalBio, "replace");
    $("#aiBioReviewBox").remove();
  });

  $("#discardAIBio").on("click", function () {
    $("#aiBioReviewBox").remove();
  });
}

export function removeAutoBioUI() {
  // Remove the Auto Bio buttons and message
  $("#autoBioButtonBox").remove();
  // Update event off calls for the new button setup
  $("#deleteOldBio").off("click"); // New delete button uses direct click
  $("#removeAutoBio").off("click"); // New remove button uses direct click
  $("#improveAI").off("click"); // New AI button uses direct click
  $("#wpTextbox1").off("input blur", removeOldBioMessage);
  $("#wpSave").off("mouseover", removeOldBioMessage);
  // Remove the delete old bio message
  if ($("#deleteOldBioMessage").length) {
    $("#deleteOldBioMessage").remove();
  }
}

export function checkForAutoBioMarker() {
  if (getBioText().includes(AUTO_BIO_MARKER)) {
    addAutoBioUI();
    $("#wpTextbox1").on("input blur", removeOldBioMessage);
    $("#wpSave").on("mouseover", removeOldBioMessage);
  } else {
    removeAutoBioUI();
  }
}
