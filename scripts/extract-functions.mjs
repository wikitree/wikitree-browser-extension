#!/usr/bin/env node
/**
 * Move whole top-level declarations out of a prettier-formatted module into a new one.
 *
 * Relies on the repo's prettier formatting: a top-level `function`/`const`/`let` starts at
 * column 0 and, for functions, its closing `}` is the next line that is exactly "}".
 * Verify the result with `npm test` and a webpack build - this does not parse JavaScript.
 *
 * Usage: node scripts/extract-functions.mjs <source> <target> <name>[,<name>...]
 */
import fs from "node:fs";

const [source, target, nameList] = process.argv.slice(2);
if (!source || !target || !nameList) {
  console.error("usage: extract-functions.mjs <source> <target> <name>[,<name>...]");
  process.exit(1);
}
const names = nameList
  .split(",")
  .map((n) => n.trim())
  .filter(Boolean);

const lines = fs.readFileSync(source, "utf8").split("\n");

function findDeclaration(name) {
  const functionStart = new RegExp(`^(export\\s+)?(async\\s+)?function\\s+${name}\\s*\\(`);
  const bindingStart = new RegExp(`^(export\\s+)?(const|let|var)\\s+${name}\\b`);
  for (let i = 0; i < lines.length; i++) {
    if (functionStart.test(lines[i])) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j] === "}") return { start: i, end: j, name };
      }
      throw new Error(`no top-level close found for function ${name}`);
    }
    if (bindingStart.test(lines[i])) {
      if (/;\s*$/.test(lines[i])) return { start: i, end: i, name };
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j] === "};" || lines[j] === "}") return { start: i, end: j, name };
      }
      throw new Error(`no top-level close found for binding ${name}`);
    }
  }
  throw new Error(`declaration not found: ${name}`);
}

/* Take any leading comment immediately above the declaration with it. A block comment must
be taken whole: its interior lines need not start with "*", so walking up line by line would
split the comment, leaving an unterminated "/*" behind and a stray "*!/" in the new file. */
function withLeadingComment(block) {
  let start = block.start;
  while (start > 0) {
    const above = lines[start - 1];
    if (/^\s*\/\//.test(above)) {
      start--;
    } else if (/\*\/\s*$/.test(above)) {
      let open = start - 1;
      while (open >= 0 && !/^\s*\/\*/.test(lines[open])) open--;
      if (open < 0) break; // no opening found: leave the comment alone
      start = open;
    } else if (/^\s*\/\*.*\*\/\s*$/.test(above)) {
      start--;
    } else {
      break;
    }
  }
  return { ...block, start };
}

const blocks = names.map((n) => withLeadingComment(findDeclaration(n))).sort((a, b) => a.start - b.start);
for (let i = 1; i < blocks.length; i++) {
  if (blocks[i].start <= blocks[i - 1].end)
    throw new Error(`overlapping blocks: ${blocks[i - 1].name} / ${blocks[i].name}`);
}

const moved = blocks.map((b) => lines.slice(b.start, b.end + 1).join("\n"));
const keep = [];
let cursor = 0;
for (const b of blocks) {
  keep.push(...lines.slice(cursor, b.start));
  cursor = b.end + 1;
}
keep.push(...lines.slice(cursor));

fs.writeFileSync(source, keep.join("\n"));
fs.appendFileSync(target, "\n" + moved.join("\n\n") + "\n");

console.log(`moved ${blocks.length} declarations, ${moved.join("\n").split("\n").length} lines`);
for (const b of blocks) console.log(`  ${b.name}  (was lines ${b.start + 1}-${b.end + 1})`);
