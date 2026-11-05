#!/usr/bin/env node
// Diagnostic harness: show step-by-step how legacy HTML is parsed
// and how a relationship is derived for the profile/viewer.

function normalizeForMatch(s) {
  return (s || "")
    .replace(/\[private\]/gi, "")
    .replace(/[’'`]/g, "")
    .replace(/[^\p{L}\p{N} ]+/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function nameVariants(fullName) {
  if (!fullName) return [];
  const parts = fullName.split(/\s+/).filter(Boolean);
  const variants = new Set();
  variants.add(fullName);
  variants.add(parts.join(" "));
  if (parts.length > 1) {
    variants.add(parts[0]);
    variants.add(parts.slice(-1)[0]);
  }
  return Array.from(variants).map(normalizeForMatch);
}

function synthesizeFromLegacyHtml(html) {
  // Look for sentences like "This makes Martyn the father of Tanya."
  const re = /This makes\s+(.+?)\s+the\s+([a-z\-]+)\s+of\s+(.+?)\./i;
  const m = html.match(re);
  if (!m) return null;
  const subject = m[1].trim();
  const rel = m[2].trim();
  const object = m[3].trim();
  return { subject, rel, object };
}

function deriveRelationshipFromSentence(parsed, profile, viewer) {
  const log = [];
  log.push("Parsed sentence: " + JSON.stringify(parsed));

  const subjNorm = normalizeForMatch(parsed.subject);
  const objNorm = normalizeForMatch(parsed.object);
  log.push("Normalized subject: " + subjNorm);
  log.push("Normalized object: " + objNorm);

  const profileNames = nameVariants(profile.name);
  const viewerNames = nameVariants(viewer.name);
  log.push("Profile name variants: " + JSON.stringify(profileNames));
  log.push("Viewer name variants: " + JSON.stringify(viewerNames));

  const subjIsProfile = profileNames.includes(subjNorm);
  const objIsProfile = profileNames.includes(objNorm);
  const subjIsViewer = viewerNames.includes(subjNorm);
  const objIsViewer = viewerNames.includes(objNorm);

  log.push(
    `Matches: subjIsProfile=${subjIsProfile}, objIsProfile=${objIsProfile}, subjIsViewer=${subjIsViewer}, objIsViewer=${objIsViewer}`
  );

  // Decide orientation. If object matches profile, then subject -> profile
  let orientation = null;
  if (objIsProfile && !subjIsProfile) orientation = "subject-is-ancestor-of-profile";
  else if (subjIsProfile && !objIsProfile) orientation = "profile-is-ancestor-of-subject";
  else orientation = "ambiguous";
  log.push("Orientation: " + orientation);

  // Map relation word to friendly label for profile's perspective
  const relWord = parsed.rel.toLowerCase();
  let derived = null;
  if (orientation === "subject-is-ancestor-of-profile") {
    // subject is the ancestor (e.g., Martyn is father of Tanya (profile))
    if (relWord === "father" || relWord === "mother") {
      derived = "Your " + relWord;
    } else if (relWord.includes("aunt") || relWord.includes("uncle")) {
      derived = "Your " + relWord;
    } else {
      derived = relWord + " of you";
    }
  } else if (orientation === "profile-is-ancestor-of-subject") {
    // profile is ancestor of subject (e.g., Tanya is daughter of Martyn)
    if (relWord === "father" || relWord === "mother") {
      derived = "Their " + relWord;
    } else {
      derived = relWord + " of them";
    }
  } else {
    derived = `Could not determine orientation; raw: ${parsed.subject} ${parsed.rel} ${parsed.object}`;
  }

  log.push("Derived relationship text: " + derived);
  return log.join("\n");
}

// Sample data for the Martyn/Tanya case
const legacyHtml = `\n  <p>Daughter</p>\n  <p>This makes Martyn the father of Tanya.</p>\n`;
const legacyCa = []; // legacy commonAncestors array might be empty

const profile = { id: "P-Tanya", name: "Tanya" };
const viewer = { id: "me", name: "You" };

console.log("=== Legacy HTML ===\n" + legacyHtml + "\n");
const parsed = synthesizeFromLegacyHtml(legacyHtml);
if (!parsed) {
  console.log('No "This makes ... the <rel> of ..." sentence found in legacy HTML.');
  process.exit(1);
}

console.log(deriveRelationshipFromSentence(parsed, profile, viewer));

// Also show the reversed case if we swapped profile to Martyn (to demonstrate orientation logic)
const profileMartyn = { id: "P-Martyn", name: "Martyn" };
console.log('\n=== If profile is Martyn (to show why inversion would give "Your father") ===');
console.log(deriveRelationshipFromSentence(parsed, profileMartyn, viewer));

// End
