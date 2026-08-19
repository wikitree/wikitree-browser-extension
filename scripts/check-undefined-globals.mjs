#!/usr/bin/env node
//
// Fails the build if a source module references an identifier that is never bound anywhere in
// that file and is not a known global — in practice, a missing import.
//
// Why this exists: webpack resolves modules, not identifiers. A file that calls removeWorking()
// or Diff.diffWords() without importing them compiles perfectly and ships, then throws
// "ReferenceError: X is not defined" the first time a user clicks the button. Both of those were
// real Auto Bio bugs, in the same file, found by users rather than by the build. ESLint's no-undef
// would catch them, but this repo has no eslint.config.js, so no-undef is not running at all.
//
// Scope handling is deliberately flat: a name declared in ANY scope in the file counts as bound
// everywhere in it. That cannot produce a false positive from shadowing or hoisting, only a false
// negative (a name declared in one function and used in another). Missing imports are a
// whole-file property, so the flat model catches every one of them while staying simple enough
// to trust. Identifiers behind a `typeof x !== "undefined"` guard are ignored, since that is the
// idiom for probing something that legitimately may not exist.
//
// If a genuine global turns up that is not listed below, add it to KNOWN_GLOBALS with a reason,
// or to ALLOWED for a single file. Prefer fixing the import.

import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import * as acorn from "acorn";

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const srcDir = join(repoRoot, "src");

// Directories whose contents are vendored or generated, and are not ours to fix.
const SKIP_DIRS = new Set(["node_modules"]);

// Globals the extension legitimately relies on, with the reason each one is not an import.
const KNOWN_GLOBALS = new Map([
  // Standard library.
  ...[
    "Array",
    "ArrayBuffer",
    "BigInt",
    "Boolean",
    "DataView",
    "Date",
    "Error",
    "EvalError",
    "Function",
    "Infinity",
    "Intl",
    "JSON",
    "Map",
    "Math",
    "NaN",
    "Number",
    "Object",
    "Promise",
    "Proxy",
    "RangeError",
    "ReferenceError",
    "Reflect",
    "RegExp",
    "Set",
    "String",
    "Symbol",
    "SyntaxError",
    "TypeError",
    "URIError",
    "Uint8Array",
    "WeakMap",
    "WeakSet",
    "decodeURI",
    "decodeURIComponent",
    "encodeURI",
    "encodeURIComponent",
    "escape",
    "eval",
    "globalThis",
    "isFinite",
    "isNaN",
    "parseFloat",
    "parseInt",
    "undefined",
    "unescape",
    "arguments",
  ].map((name) => [name, "JavaScript built-in"]),
  // Browser environment.
  ...[
    "AbortController",
    "AbortSignal",
    "Blob",
    "CSS",
    "CustomEvent",
    "DOMParser",
    "DocumentFragment",
    "Element",
    "Event",
    "EventSource",
    "File",
    "FileReader",
    "FormData",
    "Headers",
    "HTMLElement",
    "Image",
    "IntersectionObserver",
    "MessageChannel",
    "MutationObserver",
    "Node",
    "NodeFilter",
    "Notification",
    "Range",
    "ReadableStream",
    "Request",
    "ResizeObserver",
    "Response",
    "Storage",
    "TextDecoder",
    "TextEncoder",
    "URL",
    "URLSearchParams",
    "WebSocket",
    "Worker",
    "XMLHttpRequest",
    "XMLSerializer",
    "XPathResult",
    "ClipboardItem",
    "IDBKeyRange",
    "IDBRequest",
    "MouseEvent",
    "KeyboardEvent",
    "HTMLAnchorElement",
    "HTMLButtonElement",
    "HTMLDivElement",
    "HTMLImageElement",
    "HTMLInputElement",
    "HTMLSelectElement",
    "HTMLTableElement",
    "HTMLTextAreaElement",
    "SVGElement",
    "addEventListener",
    "removeEventListener",
    "alert",
    "atob",
    "btoa",
    "cancelAnimationFrame",
    "clearInterval",
    "clearTimeout",
    "confirm",
    "console",
    "crypto",
    "document",
    "fetch",
    "getComputedStyle",
    "history",
    "indexedDB",
    "localStorage",
    "location",
    "matchMedia",
    "navigator",
    "performance",
    "postMessage",
    "prompt",
    "queueMicrotask",
    "requestAnimationFrame",
    "screen",
    "scrollTo",
    "self",
    "sessionStorage",
    "setInterval",
    "setTimeout",
    "structuredClone",
    "top",
    "window",
  ].map((name) => [name, "browser global"]),
  // Test environment. Test files are scanned too — a missing import in a test is still a bug.
  ...["afterAll", "afterEach", "beforeAll", "beforeEach", "describe", "expect", "global", "it", "jest", "test"].map(
    (name) => [name, "Jest global"]
  ),
  // Extension and build environment.
  ["chrome", "extension API, present in Chrome and shimmed for Firefox"],
  ["browser", "extension API under Firefox"],
  ["BUILD_INFO", "injected at build time by webpack's DefinePlugin"],
  ["process", "replaced by webpack; only ever read as process.env"],
  ["$", "injected into every module by webpack's ProvidePlugin — see webpack/webpack.common.js"],
  ["jQuery", "injected into every module by webpack's ProvidePlugin — see webpack/webpack.common.js"],
  ["appsToken", "set on the page by the WikiTree apps server; read behind a typeof guard"],
  ["toastr", "global from the vendored toastr library the AGC feature loads"],
  ["wtViewRegistry", "global published by WikiTree's own apps pages"],
  ["require", "CommonJS interop inside webpack's bundle"],
  ["module", "CommonJS interop inside webpack's bundle"],
  ["exports", "CommonJS interop inside webpack's bundle"],
]);

// Per-file exceptions: file path (repo-relative, forward slashes) -> { name: reason }.
const ALLOWED = {};

function jsFilesIn(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...jsFilesIn(join(dir, entry.name)));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

/** Collect every name a binding form introduces, including destructuring and defaults. */
function bindPattern(node, bound) {
  if (!node) return;
  switch (node.type) {
    case "Identifier":
      bound.add(node.name);
      break;
    case "ObjectPattern":
      for (const prop of node.properties) {
        bindPattern(prop.type === "RestElement" ? prop.argument : prop.value, bound);
      }
      break;
    case "ArrayPattern":
      for (const element of node.elements) bindPattern(element, bound);
      break;
    case "AssignmentPattern":
      bindPattern(node.left, bound);
      break;
    case "RestElement":
      bindPattern(node.argument, bound);
      break;
  }
}

/**
 * True for an Identifier that is not a variable reference: a property name, an object key, a
 * label, an import/export specifier, or the argument of `typeof`.
 */
function isNonReference(node, parent) {
  if (!parent) return false;
  switch (parent.type) {
    case "MemberExpression":
      return parent.property === node && !parent.computed;
    case "Property":
    case "MethodDefinition":
    case "PropertyDefinition":
      return parent.key === node && !parent.computed;
    case "BreakStatement":
    case "ContinueStatement":
    case "LabeledStatement":
      return parent.label === node;
    case "ImportSpecifier":
    case "ImportDefaultSpecifier":
    case "ImportNamespaceSpecifier":
    case "ExportSpecifier":
      // Re-exports (`export { x } from "y"`) bind nothing locally and need no import.
      return true;
    case "UnaryExpression":
      // `typeof x` is the idiom for probing something that may legitimately not exist.
      return parent.operator === "typeof" && parent.argument === node;
    default:
      return false;
  }
}

/**
 * Lines where a developer has already declared a name undefined on purpose, using the ESLint
 * comment they would have written if no-undef were running. Honouring it keeps the escape hatch
 * where the code is rather than in this script.
 */
function eslintDisabledLines(source) {
  const disabled = new Set();
  source.split("\n").forEach((text, index) => {
    const lineNumber = index + 1;
    if (
      /\/[/*]\s*eslint-disable-next-line(?:\s|$)/.test(text) &&
      /(?:eslint-disable-next-line\s*$|no-undef)/.test(text)
    ) {
      disabled.add(lineNumber + 1);
    }
    if (/\/[/*]\s*eslint-disable-line(?:\s|$)/.test(text) && /(?:eslint-disable-line\s*$|no-undef)/.test(text)) {
      disabled.add(lineNumber);
    }
  });
  return disabled;
}

function analyse(source) {
  const ast = acorn.parse(source, { ecmaVersion: "latest", sourceType: "module", locations: true });
  const bound = new Set();
  const typeofProbed = new Set();
  const referenced = new Map();

  (function walk(node, parent) {
    if (!node || typeof node.type !== "string") return;

    switch (node.type) {
      case "ImportDeclaration":
        for (const specifier of node.specifiers) bound.add(specifier.local.name);
        return; // Nothing inside an import is a reference.
      case "VariableDeclarator":
        bindPattern(node.id, bound);
        break;
      case "FunctionDeclaration":
      case "FunctionExpression":
      case "ArrowFunctionExpression":
        if (node.id) bound.add(node.id.name);
        for (const param of node.params) bindPattern(param, bound);
        break;
      case "ClassDeclaration":
      case "ClassExpression":
        if (node.id) bound.add(node.id.name);
        break;
      case "CatchClause":
        bindPattern(node.param, bound);
        break;
      case "LabeledStatement":
        bound.add(node.label.name);
        break;
      case "UnaryExpression":
        if (node.operator === "typeof" && node.argument.type === "Identifier") {
          typeofProbed.add(node.argument.name);
        }
        break;
      case "Identifier":
        if (!isNonReference(node, parent)) {
          if (!referenced.has(node.name)) referenced.set(node.name, []);
          referenced.get(node.name).push(node.loc.start.line);
        }
        break;
    }

    for (const key of Object.keys(node)) {
      if (key === "loc" || key === "start" || key === "end") continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) walk(item, node);
      } else if (child && typeof child.type === "string") {
        walk(child, node);
      }
    }
  })(ast, null);

  return { bound, typeofProbed, referenced };
}

const files = jsFilesIn(srcDir);
const findings = [];
const parseFailures = [];

for (const file of files) {
  const relativePath = relative(repoRoot, file).split(sep).join("/");
  let analysis;
  try {
    analysis = analyse(readFileSync(file, "utf8"));
  } catch (error) {
    parseFailures.push({ file: relativePath, message: error.message });
    continue;
  }
  const allowedHere = ALLOWED[relativePath] || {};
  const disabled = eslintDisabledLines(readFileSync(file, "utf8"));
  for (const [name, lines] of analysis.referenced) {
    if (analysis.bound.has(name) || KNOWN_GLOBALS.has(name) || name in allowedHere) continue;
    // A name probed with `typeof` anywhere in the file is deliberately optional, including at
    // its other uses — `typeof x !== "undefined" && x` is one guard, not a guard and a bug.
    if (analysis.typeofProbed.has(name)) continue;
    const line = lines.find((candidate) => !disabled.has(candidate));
    if (line === undefined) continue;
    findings.push({ file: relativePath, name, line });
  }
}

if (parseFailures.length > 0) {
  console.error(`\ncheck-undefined-globals: could not parse ${parseFailures.length} file(s).\n`);
  for (const { file, message } of parseFailures) console.error(`  ${file} — ${message}`);
  console.error("");
  process.exit(1);
}

if (findings.length > 0) {
  console.error(`\ncheck-undefined-globals: found ${findings.length} undefined identifier reference(s).\n`);
  for (const { file, name, line } of findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)) {
    console.error(`  ${file}:${line} — ${name} is not defined or imported`);
  }
  console.error("\nThis throws a ReferenceError at runtime the moment the code path runs. Usually the fix is an");
  console.error("import that did not follow the code when it moved between files. If the name really is a global,");
  console.error("add it to KNOWN_GLOBALS in scripts/check-undefined-globals.mjs with a reason, or to ALLOWED for a");
  console.error("single file.\n");
  process.exit(1);
}

console.log(`check-undefined-globals: ${files.length} source file(s) scanned, no undefined identifiers found.`);
