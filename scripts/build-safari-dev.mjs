#!/usr/bin/env node
//
// Builds the Safari extension locally, so testing a change in Safari doesn't mean waiting for the
// release workflow to produce a signed build.
//
// The Xcode projects reference dist/ directly (js, features and images are folder references), so
// whatever `npm run build-dev` last produced is what ends up inside the .appex. That makes the
// Xcode step the only slow part, and only the first time: after that it is incremental.
//
// Signing is the reason a plain `xcodebuild` fails here. Both projects are set to manual signing
// with provisioning profiles belonging to the WikiTree team, which nobody outside it has installed:
//
//   error: No profile for team 'G22D2T42PF' matching 'WBE Preview Extension (macOS)' found
//
// Passing the signing settings on the command line drops it to ad-hoc signing, which is enough to
// run locally. Release builds do the same thing by commenting the settings out of project.pbxproj
// (see "Build unsigned version for Safari" in .github/workflows/release.yml); doing it as build
// settings instead leaves the project file alone, so a local test build never shows up in git.
//
// Usage:
//   npm run build-safari-dev              the Preview extension, the one to test with
//   npm run build-safari-dev -- --release the release-named extension
//   npm run build-safari-dev -- --ios     the iOS app, for the Simulator

import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");

if (process.platform !== "darwin") {
  console.error("build-safari-dev: Safari extensions can only be built on macOS.");
  process.exit(1);
}

const args = process.argv.slice(2);
const name = args.includes("--release") ? "WikiTree Browser Extension" : "WikiTree Browser Extension Preview";
const platform = args.includes("--ios") ? "iOS" : "macOS";
const project = join(repoRoot, "xcode", name, `${name}.xcodeproj`);
const buildable = `${name} (${platform})`;

const list = spawnSync("xcodebuild", ["-list", "-json", "-project", project], { cwd: repoRoot, encoding: "utf8" });

if (list.error) {
  console.error(`build-safari-dev: could not run xcodebuild (${list.error.message}).`);
  console.error("This needs Xcode itself, not just the command line tools. Install it from the App Store, then:");
  console.error("  sudo xcode-select -s /Applications/Xcode.app");
  process.exit(1);
}

// Schemes are created by Xcode the first time the project is opened and live in xcuserdata, which is
// not in the repository, so on a fresh clone there are none to build. Targets are in project.pbxproj
// and are always there, and building the app target builds the extension it depends on either way.
let hasScheme = false;
try {
  hasScheme = (JSON.parse(list.stdout ?? "{}").project?.schemes ?? []).includes(buildable);
} catch {
  /* an unparseable -list means we fall back to the target, which works regardless */
}

// A -target build ignores DerivedData and writes to build/ inside the project instead, which leaves
// a second copy of the app in the working tree. It is gitignored, so it is easy to miss - but Safari
// lists every copy of the extension it has ever seen, so that copy turns up as a duplicate entry
// alongside the real one. Sending it to DerivedData as well keeps one build in one place.
const selectBuildable = hasScheme
  ? ["-scheme", buildable, "-destination", platform === "iOS" ? "generic/platform=iOS Simulator" : "platform=macOS"]
  : [
      "-target",
      buildable,
      "-sdk",
      platform === "iOS" ? "iphonesimulator" : "macosx",
      `SYMROOT=${join(homedir(), "Library/Developer/Xcode/DerivedData/wbe-build-safari-dev/Build/Products")}`,
    ];

const result = spawnSync(
  "xcodebuild",
  [
    "-project",
    project,
    ...selectBuildable,
    "-configuration",
    "Debug",
    // Ad-hoc signing, in place of the team's provisioning profiles.
    "CODE_SIGN_IDENTITY=-",
    "CODE_SIGN_STYLE=Manual",
    "DEVELOPMENT_TEAM=",
    "PROVISIONING_PROFILE_SPECIFIER=",
    "CODE_SIGNING_REQUIRED=YES",
    "CODE_SIGNING_ALLOWED=YES",
    "build",
  ],
  { cwd: repoRoot, stdio: ["ignore", "pipe", "inherit"], encoding: "utf8" }
);

if (result.status !== 0) {
  // xcodebuild's own errors went to stderr already; the interesting lines of stdout are the last few.
  const tail = (result.stdout ?? "").trimEnd().split("\n").slice(-15).join("\n");
  if (tail) console.error(tail);
  console.error(`\nbuild-safari-dev: the ${buildable} build failed.`);
  process.exit(result.status ?? 1);
}

// The build settings are the reliable way to find what was just built; parsing paths out of the
// build log is not, and DerivedData paths contain a hash that differs per machine.
const settings = spawnSync(
  "xcodebuild",
  ["-project", project, ...selectBuildable, "-configuration", "Debug", "-showBuildSettings"],
  { cwd: repoRoot, encoding: "utf8" }
);
const built = /\bBUILT_PRODUCTS_DIR = (.+)/.exec(settings.stdout ?? "");
const app = built ? join(built[1].trim(), `${name}.app`) : null;

console.log(`\nbuild-safari-dev: built ${buildable}.`);
if (app) console.log(`  ${app}`);

// Safari cannot see the extension until the container app has been run, which registers it. Doing
// that here saves pasting a DerivedData path: the hash in it comes from the location of the
// .xcodeproj, so it differs between machines and changes if the repo is moved.
if (app && platform === "macOS") {
  const opened = spawnSync("open", [app], { stdio: "inherit" });
  if (opened.status === 0) {
    console.log("\nOpened the app to register the extension with Safari.");
  } else {
    console.log("\nCould not open the app automatically. Open the path above by hand.");
  }
  console.log("\nThen, in Safari:");
  console.log("  1. Settings > Advanced > Show features for web developers, if there is no Develop menu yet");
  console.log("  2. Develop > Allow Unsigned Extensions (this switches itself off every time Safari quits)");
  console.log("  3. Settings > Extensions, tick the extension and allow it on wikitree.com");
  console.log("  4. After a rebuild, quit and reopen Safari to pick up the new code");
  console.log("\nThis has the same bundle ID as an installed copy of the same extension, so remove that copy");
  console.log("while testing if Safari starts listing duplicates.");
}
