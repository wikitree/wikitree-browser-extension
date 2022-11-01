// Fetches HTML files used for tests. The HTML files are stored in the pages/ folder.
// Run this script using `npm run update-test-pages`
// Feature unit tests use these HTML files for testing.

const puppeteer = require("puppeteer");
const fs = require("fs");
const prompt = require("prompt");

/** Prompts for login and password. */
async function loginPrompt() {
  const promptSchema = {
    properties: {
      username: {
        description: "WikiTree login",
      },
      password: {
        description: "WikiTree password",
        hidden: true,
      },
    },
  };
  return await prompt.get(promptSchema);
}

/** Logs in to WikiTree using the given credentials. */
async function login(page, login, password) {
  console.log("Logging in");
  await page.goto("https://www.wikitree.com/index.php?title=Special:Userlogin");
  await page.type("#wpEmail", login);
  await page.type("#wpPassword2", password);
  await page.click("#wpLoginattempt");
  await page.waitForNetworkIdle();

  const error = await page.$(".red");
  if (error) {
    const message = await page.evaluate((el) => el.textContent, error);
    console.log(`Login error: ${message}`);
    return false;
  }

  console.log("Logged in");
  return true;
}

/** Saves the given URL to a file. */
async function savePage(page, url, filename) {
  console.log(`Retrieving ${url}`);
  await page.goto(url);
  var content = await page.content();
  fs.writeFileSync(`src/testing/pages/${filename}`, content);
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const { username, password } = await loginPrompt();
  const loggedIn = await login(page, username, password);

  if (loggedIn) {
    await savePage(page, "https://www.wikitree.com/wiki/Tolkien-1", "Tolkien-1.html");
  }

  await browser.close();
})();
