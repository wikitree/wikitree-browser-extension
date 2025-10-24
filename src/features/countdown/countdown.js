/*
Created By: Ian Beacall (Beacall-6)
*/

import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { countdownDefaults } from "./countdown_options";

// Dev logging flag:
// To enable logging on a page, add before the countdown markup:
// <script>window.WBE_COUNTDOWN_DEBUG = true;</script>
// Logs are off by default.
const ENABLE_WBE_COUNTDOWN_LOGS = typeof window !== "undefined" && !!window.WBE_COUNTDOWN_DEBUG;

// Keep track of active intervals for cleanup
const intervalMap = new WeakMap();

function log(...args) {
  if (ENABLE_WBE_COUNTDOWN_LOGS) {
    console.log("[WBE countdown]", ...args);
  }
}

function parseCountdownElement($el) {
  const dataTarget = $el.attr("data-target");
  let label = $el.attr("data-label");
  let completeText = $el.attr("data-complete-text") || countdownDefaults.defaultCompleteText;

  // Check if this span contains countdown data in its HTML content.
  // We prefer innerHTML so authors can include <br> for line breaks. We'll
  // sanitize parameters but preserve <br> in the returned label.
  if (!dataTarget) {
    const rawHtml = ($el.html() || "").trim();
    const rawText = ($el.text() || "").trim();

    if (rawHtml) {
      // Parse countdown data from HTML content
      if (rawHtml.includes("@")) {
        const atIdx = rawHtml.lastIndexOf("@");
        // labelHTML contains possible <br> tags; date text should be stripped of tags
        const labelHTML = label || rawHtml.slice(0, atIdx).trim();
        let dateStr = rawHtml.slice(atIdx + 1).trim();
        // Remove any HTML tags from date portion
        dateStr = dateStr.replace(/<[^>]*>/g, "").trim();

        // Check for style parameters in the label part
        const labelParts = labelHTML.split("|");
        const actualLabel = labelParts[0].trim();
        const styleParams = {};

        if (labelParts.length > 1) {
          labelParts.slice(1).forEach((param) => {
            // Strip any accidental HTML from parameters
            const cleanParam = param.replace(/<[^>]*>/g, "").trim();
            const [key, value] = cleanParam.split("=", 2);
            if (key) {
              // If no value provided, use empty string (treats as truthy for center/centre)
              styleParams[key.trim().toLowerCase()] = value ? value.trim() : "";
            }
          });
        }

        return {
          target: dateStr,
          // Preserve simple HTML (only <br> allowed) in the label
          label: actualLabel,
          completeText,
          theme: styleParams.theme,
          color: styleParams.color,
          bgColor: styleParams.bgcolor || styleParams["bg-color"],
          cssClass: styleParams.class || styleParams.cssclass,
          center: styleParams.center || styleParams.centre,
          endDate: styleParams.enddate || styleParams["end-date"] || styleParams.end,
          hideAfter: styleParams.hideafter || styleParams["hide-after"],
          happening: styleParams.happening,
        };
      } else if (rawHtml.includes("=")) {
        // Parse key=value pairs (allow HTML but strip tags from keys/values)
        const pairs = rawHtml.split(";");
        const data = {};
        pairs.forEach((pair) => {
          const cleanPair = pair.replace(/<[^>]*>/g, "").trim();
          const [key, value] = cleanPair.split("=", 2);
          if (key) {
            // If no value provided, use empty string (treats as truthy for center/centre)
            data[key.trim().toLowerCase()] = value ? value.trim() : "";
          }
        });
        return {
          target: data.target || data.date,
          label: label || data.label,
          completeText:
            completeText !== countdownDefaults.defaultCompleteText
              ? completeText
              : data.complete || countdownDefaults.defaultCompleteText,
          theme: data.theme,
          color: data.color,
          bgColor: data.bgcolor || data["bg-color"],
          cssClass: data.class || data.cssclass,
          center: data.center || data.centre,
          endDate: data.enddate || data["end-date"] || data.end,
          hideAfter: data.hideafter || data["hide-after"],
          happening: data.happening,
        };
      } else {
        return {
          target: null,
          label: rawText,
          completeText,
          error: "Invalid format. Use: Label @ YYYY-MM-DD or key=value format",
        };
      }
    }
  }

  return { target: dataTarget, label, completeText };
}

function parseTargetDate(input) {
  if (!input) return null;

  // Handle simple date format (YYYY-MM-DD) - treat as local midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [year, month, day] = input.split("-").map(Number);
    return new Date(year, month - 1, day, 0, 0, 0);
  }

  // Handle date with time but no timezone (YYYY-MM-DD HH:MM or YYYY-MM-DDTHH:MM)
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}$/.test(input)) {
    // Treat as local time
    const date = new Date(input.replace(" ", "T"));
    return isNaN(date.getTime()) ? null : date;
  }

  // Handle timezone abbreviations
  const timezoneMap = {
    // North America
    EST: "-05:00",
    EDT: "-04:00", // Eastern Time
    CST: "-06:00",
    CDT: "-05:00", // Central Time
    MST: "-07:00",
    MDT: "-06:00", // Mountain Time
    PST: "-08:00",
    PDT: "-07:00", // Pacific Time
    AKST: "-09:00",
    AKDT: "-08:00", // Alaska Time
    HST: "-10:00",
    HDT: "-09:00", // Hawaii Time
    AST: "-04:00",
    ADT: "-03:00", // Atlantic Time
    NST: "-03:30",
    NDT: "-02:30", // Newfoundland Time

    // Europe
    GMT: "+00:00",
    UTC: "+00:00", // Universal Time
    WET: "+00:00",
    WEST: "+01:00", // Western European Time
    CET: "+01:00",
    CEST: "+02:00", // Central European Time
    EET: "+02:00",
    EEST: "+03:00", // Eastern European Time
    BST: "+01:00", // British Summer Time
    IST: "+01:00", // Irish Standard Time
    MSK: "+03:00", // Moscow Time

    // Asia-Pacific
    JST: "+09:00", // Japan Standard Time
    KST: "+09:00", // Korea Standard Time
    CST: "+08:00", // China Standard Time (note: conflicts with US Central)
    SGT: "+08:00", // Singapore Time
    HKT: "+08:00", // Hong Kong Time
    TST: "+08:00", // Taiwan Standard Time
    IST: "+05:30", // India Standard Time (note: conflicts with Irish)
    PKT: "+05:00", // Pakistan Standard Time
    GST: "+04:00", // Gulf Standard Time
    AST: "+03:00", // Arabia Standard Time (note: conflicts with Atlantic)
    AEST: "+10:00",
    AEDT: "+11:00", // Australian Eastern Time
    ACST: "+09:30",
    ACDT: "+10:30", // Australian Central Time
    AWST: "+08:00", // Australian Western Time
    NZST: "+12:00",
    NZDT: "+13:00", // New Zealand Time

    // Africa & Middle East
    CAT: "+02:00", // Central Africa Time
    EAT: "+03:00", // East Africa Time
    WAT: "+01:00", // West Africa Time
    SAST: "+02:00", // South Africa Standard Time

    // South America
    BRT: "-03:00",
    BRST: "-02:00", // Brazil Time
    ART: "-03:00", // Argentina Time
    CLT: "-04:00",
    CLST: "-03:00", // Chile Time
    COT: "-05:00", // Colombia Time
    PET: "-05:00", // Peru Time
    VET: "-04:00", // Venezuela Time

    // Others
    IRST: "+03:30",
    IRDT: "+04:30", // Iran Time
    AFT: "+04:30", // Afghanistan Time
    NPT: "+05:45", // Nepal Time
    BTT: "+06:00", // Bhutan Time
    MMT: "+06:30", // Myanmar Time
    ICT: "+07:00", // Indochina Time
    WIB: "+07:00", // Western Indonesian Time
    WITA: "+08:00", // Central Indonesian Time
    WIT: "+09:00", // Eastern Indonesian Time
    PWT: "+09:00", // Palau Time
    ChST: "+10:00", // Chamorro Standard Time
    PGT: "+10:00", // Papua New Guinea Time
    SBT: "+11:00", // Solomon Islands Time
    VUT: "+11:00", // Vanuatu Time
    FJT: "+12:00", // Fiji Time
    TVT: "+12:00", // Tuvalu Time
    GILT: "+12:00", // Gilbert Island Time
    TOT: "+13:00", // Tonga Time
    LINT: "+14:00", // Line Islands Time
  };

  for (const [tz, offset] of Object.entries(timezoneMap)) {
    if (input.includes(` ${tz}`)) {
      const baseInput = input.replace(new RegExp(` ${tz}`, "g"), "");
      const isoInput = baseInput.includes("T") ? baseInput + offset : baseInput + "T00:00:00" + offset;
      const date = new Date(isoInput);
      return isNaN(date.getTime()) ? null : date;
    }
  }

  // Handle ISO 8601 and other formats
  const date = new Date(input);
  return isNaN(date.getTime()) ? null : date;
}

function formatTimeRemaining(milliseconds, options) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / (24 * 3600));
  let remaining = totalSeconds - days * 24 * 3600;
  const hours = Math.floor(remaining / 3600);
  remaining -= hours * 3600;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining - minutes * 60;

  const paddedHours = options.padHours ? String(hours).padStart(2, "0") : String(hours);
  const paddedMinutes = String(minutes).padStart(2, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  return {
    days,
    hours: paddedHours,
    minutes: paddedMinutes,
    seconds: paddedSeconds,
  };
}

function createCountdownBox(label, showLabels, isCompact = false, styleData = {}, updateFrequency = "second") {
  let labelHTML = "";
  if (label && showLabels) {
    // Allow simple <br> tags in labels. Escape everything else, but restore <br>.
    const BR_PLACEHOLDER = "WBE_BR_PLACEHOLDER_42";
    const safelyMarked = label.replace(/<br\s*\/?>/gi, BR_PLACEHOLDER);
    const escaped = $("<div>").text(safelyMarked).html();
    const withBr = escaped.replace(new RegExp(BR_PLACEHOLDER, "g"), "<br/>");
    labelHTML = `<div class="wbe-countdown-label">${withBr}</div>`;
  }

  const compactClass = isCompact ? " wbe-countdown-compact" : "";

  // Apply theme classes
  let themeClass = "";
  if (styleData.theme) {
    const validThemes = ["red", "blue", "green", "purple", "gold", "silver", "rainbow", "dark", "minimal"];
    if (validThemes.includes(styleData.theme.toLowerCase())) {
      themeClass = ` wbe-countdown-theme-${styleData.theme.toLowerCase()}`;
    }
  }

  // Apply custom CSS class
  const customClass = styleData.cssClass ? ` ${styleData.cssClass}` : "";

  // Conditionally include seconds based on update frequency
  const showSeconds = updateFrequency === "second";
  const secondsHTML = showSeconds
    ? `
        <div class="wbe-countdown-separator">:</div>
        <div class="wbe-countdown-segment">
          <span class="wbe-countdown-number wbe-countdown-seconds">00</span>
          <span class="wbe-countdown-unit" data-unit="seconds"><span class="wbe-countdown-unit-long">seconds</span><span class="wbe-countdown-unit-short">SECS</span></span>
        </div>`
    : "";

  const $box = $(`
    <div class="wbe-countdown-box${compactClass}${themeClass}${customClass}" role="timer" aria-live="polite">
      ${labelHTML}
      <div class="wbe-countdown-time">
        <div class="wbe-countdown-segment">
          <span class="wbe-countdown-number wbe-countdown-days">0</span>
          <span class="wbe-countdown-unit" data-unit="days"><span class="wbe-countdown-unit-long">days</span><span class="wbe-countdown-unit-short">DAYS</span></span>
        </div>
        <div class="wbe-countdown-separator">:</div>
        <div class="wbe-countdown-segment">
          <span class="wbe-countdown-number wbe-countdown-hours">00</span>
          <span class="wbe-countdown-unit" data-unit="hours"><span class="wbe-countdown-unit-long">hours</span><span class="wbe-countdown-unit-short">HRS</span></span>
        </div>
        <div class="wbe-countdown-separator">:</div>
        <div class="wbe-countdown-segment">
          <span class="wbe-countdown-number wbe-countdown-minutes">00</span>
          <span class="wbe-countdown-unit" data-unit="minutes"><span class="wbe-countdown-unit-long">minutes</span><span class="wbe-countdown-unit-short">MINS</span></span>
        </div>${secondsHTML}
      </div>
    </div>
  `);

  // Apply inline styles if specified (but not centering - that goes on parent)
  const styles = {};

  if (styleData.color) {
    styles.color = styleData.color;
  }
  if (styleData.bgColor) {
    styles.background = styleData.bgColor;
    styles.borderColor = styleData.bgColor;
  }

  if (Object.keys(styles).length > 0) {
    $box.css(styles);
  }

  return $box;
}

function startCountdown(
  $element,
  targetDate,
  completeText,
  options,
  label = null,
  endDate = null,
  hideAfter = null,
  happening = null
) {
  // Clear any existing interval
  const element = $element[0];
  if (intervalMap.has(element)) {
    clearInterval(intervalMap.get(element));
    intervalMap.delete(element);
  }

  const $box = $element.find(".wbe-countdown-box");
  const $days = $box.find(".wbe-countdown-days");
  const $hours = $box.find(".wbe-countdown-hours");
  const $minutes = $box.find(".wbe-countdown-minutes");
  const $seconds = $box.find(".wbe-countdown-seconds");

  // Parse endDate if provided
  let parsedEndDate = null;
  if (endDate) {
    parsedEndDate = parseTargetDate(endDate);
    if (!parsedEndDate) {
      log("Invalid end date:", endDate);
    } else {
      log("Parsed end date:", parsedEndDate.toISOString());
    }
  }

  function parseHideAfterMs(hideAfterStr) {
    if (!hideAfterStr) return null;

    const hideAfterLower = hideAfterStr.toLowerCase();
    if (hideAfterLower.includes("h")) {
      const hours = parseInt(hideAfterStr);
      return !isNaN(hours) ? hours * 60 * 60 * 1000 : null;
    } else if (hideAfterLower.includes("d")) {
      const days = parseInt(hideAfterStr);
      return !isNaN(days) ? days * 24 * 60 * 60 * 1000 : null;
    } else {
      const hours = parseInt(hideAfterStr);
      return !isNaN(hours) ? hours * 60 * 60 * 1000 : null;
    }
  }

  function tick() {
    const now = Date.now();
    const timeToStart = targetDate.getTime() - now;
    const timeToEnd = parsedEndDate ? parsedEndDate.getTime() - now : null;
    const hideAfterMs = parseHideAfterMs(hideAfter);

    // Debug logging (stringified so console shows numeric values immediately)
    log(
      "Tick debug: " +
        JSON.stringify({
          now: new Date(now).toISOString(),
          startDate: targetDate.toISOString(),
          endDate: parsedEndDate ? parsedEndDate.toISOString() : "none",
          timeToStart,
          timeToEnd,
          hideAfterMs,
          label,
        })
    );

    // Phase 1: Countdown to event start
    if (timeToStart > 0) {
      const formatted = formatTimeRemaining(timeToStart, options);

      // Update countdown display
      const updateWithAnimation = ($el, newValue) => {
        if ($el.text() !== newValue) {
          $el.addClass("wbe-updating");
          $el.text(newValue);
          setTimeout(() => $el.removeClass("wbe-updating"), 200);
        }
      };

      updateWithAnimation($days, formatted.days);
      updateWithAnimation($hours, formatted.hours);
      updateWithAnimation($minutes, formatted.minutes);

      if ($seconds.length > 0) {
        updateWithAnimation($seconds, formatted.seconds);
      }
      return;
    }

    // Phase 2: Event is happening (between start and end)
    if (parsedEndDate && timeToEnd > 0) {
      // Determine happening text. Support a custom 'happening' parameter with optional {event} placeholder.
      let eventHappeningText = completeText;
      if (happening) {
        // Replace {event} placeholder if present
        eventHappeningText = happening.replace(/{event}/gi, label || "");
      } else if (completeText === countdownDefaults.defaultCompleteText && label) {
        eventHappeningText = `${label} is happening now!`;
      }

      $box.removeClass("wbe-countdown-box").addClass("wbe-countdown-happening").attr("aria-live", "assertive").html(`
        <div class="wbe-countdown-celebration">
          <div class="wbe-countdown-complete-message">${$("<div>").text(eventHappeningText).html()}</div>
          <div class="wbe-countdown-fireworks">🎉 ✨ 🎊</div>
        </div>
      `);
      return;
    }

    // Phase 3: Event is over
    if (parsedEndDate && timeToEnd <= 0) {
      // Check if we should hide the countdown entirely
      if (hideAfterMs !== null) {
        const timeSinceEnd = now - parsedEndDate.getTime();
        log(
          "Hide check: now= " +
            new Date(now).toISOString() +
            ", end= " +
            new Date(parsedEndDate.getTime()).toISOString() +
            ", timeSinceEnd=" +
            timeSinceEnd +
            ", hideAfterMs=" +
            hideAfterMs
        );

        if (timeSinceEnd > hideAfterMs) {
          log("Hiding countdown because timeSinceEnd > hideAfterMs: " + timeSinceEnd + " > " + hideAfterMs);

          // Render a final "over" message so users don't see a zeroed timer
          let eventOverTextFallback = completeText;
          if (completeText === countdownDefaults.defaultCompleteText && label) {
            eventOverTextFallback = `${label} is over!`;
          }

          $box
            .removeClass("wbe-countdown-box wbe-countdown-happening")
            .addClass("wbe-countdown-done")
            .attr("aria-live", "assertive").html(`
              <div class="wbe-countdown-celebration">
                <div class="wbe-countdown-complete-message">${$("<div>").text(eventOverTextFallback).html()}</div>
                <div class="wbe-countdown-fireworks">🎊 ✨ 🎊</div>
              </div>
            `);

          // Hide after a short delay to ensure users see the final state
          setTimeout(() => {
            try {
              $element.hide();
            } catch (e) {
              /* ignore */
            }
            if (intervalMap.has(element)) {
              clearInterval(intervalMap.get(element));
              intervalMap.delete(element);
            }
            log("Countdown hidden after end period for:", label || "unlabeled");
          }, 1500);

          return;
        }
      }

      let eventOverText = completeText;
      if (completeText === countdownDefaults.defaultCompleteText && label) {
        eventOverText = `${label} is over!`;
      }

      $box
        .removeClass("wbe-countdown-box wbe-countdown-happening")
        .addClass("wbe-countdown-done")
        .attr("aria-live", "assertive").html(`
        <div class="wbe-countdown-celebration">
          <div class="wbe-countdown-complete-message">${$("<div>").text(eventOverText).html()}</div>
          <div class="wbe-countdown-fireworks">🎊 ✨ 🎊</div>
        </div>
      `);

      // Clean up interval if no hideAfter specified
      if (hideAfterMs === null) {
        clearInterval(intervalMap.get(element));
        intervalMap.delete(element);
      }

      log("Event completed for:", eventOverText);
      return;
    }

    // Phase 4: No end date specified - original behavior (event has arrived)
    if (!parsedEndDate) {
      // Check if we should hide the countdown entirely
      if (hideAfterMs !== null) {
        const timeSinceStart = now - targetDate.getTime();
        if (timeSinceStart > hideAfterMs) {
          $element.hide();
          clearInterval(intervalMap.get(element));
          intervalMap.delete(element);
          log("Countdown hidden after start period for:", label || "unlabeled");
          return;
        }
      }

      let finalCompleteText = completeText;
      if (completeText === countdownDefaults.defaultCompleteText && label) {
        finalCompleteText = `${label} has arrived!`;
      }

      $box.removeClass("wbe-countdown-box").addClass("wbe-countdown-done").attr("aria-live", "assertive").html(`
        <div class="wbe-countdown-celebration">
          <div class="wbe-countdown-complete-message">${$("<div>").text(finalCompleteText).html()}</div>
          <div class="wbe-countdown-fireworks">🎉 ✨ 🎊</div>
        </div>
      `);

      // Clean up interval if no hideAfter specified
      if (hideAfterMs === null) {
        clearInterval(intervalMap.get(element));
        intervalMap.delete(element);
      }

      log("Countdown completed for:", finalCompleteText);
      return;
    }
  }

  // Run immediately, then start interval
  tick();
  const tickInterval = options.updateFrequency === "minute" ? 60000 : 1000;
  const intervalId = setInterval(tick, tickInterval);
  intervalMap.set(element, intervalId);
}

function initializeCountdownElement(element, options) {
  const $el = $(element);

  // Skip if already initialized
  if ($el.data("countdown-initialized") || $el.attr("data-countdown-initialized") === "1") {
    return;
  }

  log("Processing countdown element:", $el.text());

  const parsed = parseCountdownElement($el);

  if (parsed.error) {
    log("Countdown error:", parsed.error);
    $el.html(`<div class="wbe-countdown-box wbe-countdown-error">${parsed.error}</div>`);
    $el.data("countdown-initialized", true);
    return;
  }

  const targetDate = parseTargetDate(parsed.target);

  if (!targetDate) {
    log("Invalid target date:", parsed.target);
    $el.html(`<div class="wbe-countdown-box wbe-countdown-error">Invalid date: ${parsed.target || "missing"}</div>`);
    $el.data("countdown-initialized", true);
    return;
  }

  log("Creating countdown box for:", parsed.label, "target:", targetDate);

  // Create and insert the countdown box
  const styleData = {
    theme: parsed.theme,
    color: parsed.color,
    bgColor: parsed.bgColor,
    cssClass: parsed.cssClass,
    center: parsed.center,
  };
  const $box = createCountdownBox(parsed.label, true, options.compactMode, styleData, options.updateFrequency);
  $el.html($box);
  // Record initialization both in jQuery data and as a DOM attribute so
  // re-scans or DOM replacements don't re-initialize the same logical element.
  $el.data("countdown-initialized", true);
  $el.attr("data-countdown-initialized", "1");

  // Apply centering to parent element if requested (supports both 'center' and 'centre' spellings)
  if (
    styleData.center === "true" ||
    styleData.center === "1" ||
    styleData.center === "" ||
    styleData.centre === "true" ||
    styleData.centre === "1" ||
    styleData.centre === ""
  ) {
    $el.css({
      display: "block",
      textAlign: "center",
    });
    $box.css({
      margin: "0 auto",
    });
  }

  // Start the countdown
  startCountdown(
    $el,
    targetDate,
    parsed.completeText,
    options,
    parsed.label,
    parsed.endDate,
    parsed.hideAfter,
    parsed.happening
  );
  log("Started countdown for:", parsed.label || "unlabeled", "target:", targetDate);
}

function unhideCountdownElements($countdowns) {
  // Unhide countdown spans that were hidden with inline styles
  $countdowns.each(function () {
    const $el = $(this);
    const style = $el.attr("style") || "";

    // Check if element is hidden with common hiding methods
    if (
      style.includes("display:none") ||
      style.includes("display: none") ||
      style.includes("visibility:hidden") ||
      style.includes("visibility: hidden") ||
      style.includes("font-size:0") ||
      style.includes("font-size: 0") ||
      style.includes("opacity:0") ||
      style.includes("opacity: 0")
    ) {
      // Parse the content to check if centering is requested
      const raw = ($el.text() || "").trim();
      let needsCentering = false;

      if (raw.includes("center") || raw.includes("centre")) {
        // Check for center/centre parameter in either format
        if (raw.includes("|")) {
          // @ format: check for center/centre in parameters
          const atIdx = raw.lastIndexOf("@");
          if (atIdx > 0) {
            const labelPart = raw.slice(0, atIdx);
            needsCentering = /\|\s*(center|centre)(\s*=|\s*$|\s*\|)/i.test(labelPart);
          }
        } else if (raw.includes("=")) {
          // key=value format: check for center/centre parameter
          needsCentering = /center(=|;|$)|centre(=|;|$)/i.test(raw);
        }
      }

      // Remove the hiding styles and make it visible
      $el.css({
        display: needsCentering ? "block" : "inline-block",
        visibility: "visible",
        "font-size": "",
        opacity: "1",
        "text-align": needsCentering ? "center" : "",
      });

      log("Unhid countdown element" + (needsCentering ? " (centered)" : "") + ":", $el.text().substring(0, 50));
    }
  });
}

function scanForCountdowns(root = document, options) {
  // Scan for countdown elements
  const $countdowns = $(root).find(".wbe-countdown");
  log("Found", $countdowns.length, "countdown elements");

  // Unhide any hidden countdown elements first
  unhideCountdownElements($countdowns);

  $countdowns.each(function (index) {
    log("Processing countdown element", index + 1, ":", $(this).text().substring(0, 50));
    initializeCountdownElement(this, options);
  });
}

function setupMutationObserver(options) {
  const targetNode = document.querySelector("#content") || document.body;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const $node = $(node);

          // Check if the added node itself is a countdown element
          if ($node.hasClass("wbe-countdown")) {
            unhideCountdownElements($node);
            initializeCountdownElement(node, options);
          }

          // Check for countdown elements within the added node
          const $countdownsInNode = $node.find(".wbe-countdown");
          if ($countdownsInNode.length > 0) {
            unhideCountdownElements($countdownsInNode);
            $countdownsInNode.each(function () {
              initializeCountdownElement(this, options);
            });
          }
        }
      });
    });
  });

  observer.observe(targetNode, {
    childList: true,
    subtree: true,
  });

  log("Mutation observer set up");
}

async function init() {
  try {
    // Load CSS first
    await import("./countdown.css");

    // Get user options
    const options = await getFeatureOptions("countdown");
    const mergedOptions = { ...countdownDefaults, ...options };

    log("Initializing countdown feature with options:", mergedOptions);

    // Initial scan
    scanForCountdowns(document, mergedOptions);

    // Scan again after a short delay to catch dynamic content
    setTimeout(() => {
      log("Rescanning for countdown elements...");
      scanForCountdowns(document, mergedOptions);
    }, 1000);

    // Watch for new elements
    setupMutationObserver(mergedOptions);

    log("Countdown feature initialized successfully");
  } catch (error) {
    console.error("[WBE countdown] Failed to initialize:", error);
  }
}

shouldInitializeFeature("countdown").then((result) => {
  if (result) {
    // Load CSS immediately
    import("./countdown.css");
    init();
  }
});
