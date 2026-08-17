#!/usr/bin/env node
//
// Fails the build if the bundled output contains a regular-expression lookbehind assertion.
//
// Why this exists: Safari only supports lookbehind from 16.4 (iPadOS/iOS 16.4, March 2023), and the
// Xcode projects target IPHONEOS_DEPLOYMENT_TARGET 15.0 / MACOSX_DEPLOYMENT_TARGET 10.14. On an older
// Safari the regex literal fails to compile while the enclosing function is being parsed, throwing
//
//   SyntaxError: Invalid regular expression: invalid group specifier name
//
// Because webpack wraps the whole bundle in one anonymous IIFE, that error kills content.js outright:
// the extension does not load one broken feature, it does not load at all. Node compiles these
// regexes happily, and so does every browser you are likely to be testing in, so nothing else catches
// it. A single lookbehind pulled in by a dependency update would silently break every user on an iPad
// that cannot run 16.4.
//
// The check is a substring scan rather than a parse, deliberately: it needs to cover minified vendor
// code as well as our own. A false positive from a string literal is possible but has not happened;
// if one turns up, add a narrow entry to ALLOWED below rather than loosening the pattern.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const dist = join(repoRoot, "dist");

// Directories of built/copied JavaScript that ships in the extension.
const scanDirs = [join(dist, "js"), join(dist, "features", "text_expander")];

// Exact context snippets known to be safe. Keep this empty if you can.
const ALLOWED = [];

const PATTERNS = [
  { needle: "(?<=", label: "positive lookbehind" },
  { needle: "(?<!", label: "negative lookbehind" },
];

function jsFilesIn(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => join(dir, entry.name));
}

function contextAround(source, index) {
  const start = Math.max(0, index - 60);
  const end = Math.min(source.length, index + 60);
  return (start > 0 ? "…" : "") + source.slice(start, end).replace(/\n/g, "\\n") + (end < source.length ? "…" : "");
}

const files = scanDirs.flatMap(jsFilesIn);

if (files.length === 0) {
  console.error(
    `check-legacy-safari: no built JavaScript found under ${relative(repoRoot, dist)}/. Run a build first.`
  );
  process.exit(1);
}

const findings = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const { needle, label } of PATTERNS) {
    let index = source.indexOf(needle);
    while (index !== -1) {
      const context = contextAround(source, index);
      if (!ALLOWED.includes(context)) {
        findings.push({ file: relative(repoRoot, file), label, index, context });
      }
      index = source.indexOf(needle, index + 1);
    }
  }
}

if (findings.length > 0) {
  console.error(`\ncheck-legacy-safari: found ${findings.length} regex lookbehind assertion(s) in the built output.\n`);
  for (const { file, label, index, context } of findings) {
    console.error(`  ${file} (byte ${index}) — ${label}`);
    console.error(`    ${context}\n`);
  }
  console.error("Safari supports lookbehind only from 16.4, and we still target iOS 15.0. A lookbehind anywhere in");
  console.error("content.js throws a SyntaxError at parse time on those devices and the entire extension fails to");
  console.error("load. Rewrite the regex without lookbehind — see countSingleSpaceDelimiters() in");
  console.error("src/features/wikitable_wizard/wikitable_wizard.js for the pattern. If the hit is in a dependency,");
  console.error("pin or patch that dependency.\n");
  process.exit(1);
}

console.log(`check-legacy-safari: ${files.length} bundled file(s) scanned, no lookbehind assertions found.`);
