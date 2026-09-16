/**
 * Browser test for /chart/formula.
 *
 * Drives the real page over the DevTools protocol. It watches for console
 * errors and uncaught exceptions, then exercises the things a person actually
 * does: writes a formula, makes a typo, uses the completion dropdown, edits a
 * parameter, applies a preset, shares a link — and then the two behaviours that
 * only show up over time: that the settings survive a reload, and that
 * "Restore default" puts everything back and clears what the browser held.
 *
 * Run with a dev server on :4310  —  node scripts/check-page.mjs
 * Overrides: URL, CHROME.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";

const PORT = 9333;
const URL = process.env.URL ?? "http://localhost:4310/chart/formula";
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const STORAGE_KEY = "aifa:formula:v1";
const profile = fs.mkdtempSync("/tmp/chrome-formula-");

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--remote-allow-origins=*",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function firstPage() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((item) => item.type === "page" && !item.url.startsWith("chrome://"));
      if (page) return page;
    } catch {
      // Chrome is not listening yet.
    }
    await sleep(250);
  }
  throw new Error("Chrome did not come up");
}

const page = await firstPage();
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve);
  socket.addEventListener("error", reject);
});

let nextId = 1;
const pending = new Map();
const problems = [];

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
    return;
  }
  if (message.method === "Runtime.exceptionThrown") {
    const details = message.params.exceptionDetails;
    problems.push(`uncaught: ${details.exception?.description ?? details.text}`);
  }
  if (message.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(message.params.type)) {
    const text = message.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" ");
    if (text && !/DevTools|tailwind|scroll-behavior/i.test(text)) problems.push(`${message.params.type}: ${text}`);
  }
});

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

await send("Runtime.enable");
await send("Page.enable");

const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? "evaluate failed");
  return result.result.value;
};

/* ------------------------------------------------------------------ *
 * Driving the page
 * ------------------------------------------------------------------ */

/** The page as text, lower-cased: the shell sets its furniture in caps. */
const pageText = async () => (await evaluate("document.body.innerText")).toLowerCase();

/**
 * Type into a field the way a person does.
 *
 * React owns the textarea, so a value written straight into the DOM is fought
 * over on the next paint: the base text goes in, React is given a moment to
 * commit it, and only then is the caret placed and the rest of the text typed
 * character by character with execCommand — a real edit with a real caret move,
 * which is what the completion list keys off. `base` should end where the caret
 * belongs.
 */
const setFieldBase = (label, base) => `(() => {
  const area = [...document.querySelectorAll('textarea')].find((node) => node.getAttribute('aria-label') === ${JSON.stringify(label)});
  if (!area) throw new Error('no field labelled ' + ${JSON.stringify(label)});
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(area, ${JSON.stringify(base)});
  area.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`;

const typeAfter = (label, typed) => `(() => {
  const area = [...document.querySelectorAll('textarea')].find((node) => node.getAttribute('aria-label') === ${JSON.stringify(label)});
  if (!area) throw new Error('no field labelled ' + ${JSON.stringify(label)});
  area.focus();
  area.setSelectionRange(area.value.length, area.value.length);
  for (const character of ${JSON.stringify(typed)}) document.execCommand('insertText', false, character);
  return area.value;
})()`;

const typeIntoField = async (label, base, typed) => {
  await evaluate(setFieldBase(label, base));
  await sleep(250); // let React commit the base text before the caret is placed
  if (!typed) return fieldValue(label);
  return evaluate(typeAfter(label, typed));
};

const fieldValue = (label) =>
  evaluate(
    `[...document.querySelectorAll('textarea')].find((node) => node.getAttribute('aria-label') === ${JSON.stringify(
      label,
    )})?.value ?? null`,
  );

const pressKey = (label, key) => `(() => {
  const area = [...document.querySelectorAll('textarea')].find((node) => node.getAttribute('aria-label') === ${JSON.stringify(label)});
  if (!area) throw new Error('no field labelled ' + ${JSON.stringify(label)});
  area.focus();
  area.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, bubbles: true }));
  return true;
})()`;

const clickButton = (label) => `(() => {
  const wanted = ${JSON.stringify(label.toLowerCase())};
  const button = [...document.querySelectorAll('button')].find((node) => node.textContent.trim().toLowerCase() === wanted);
  if (!button) throw new Error('no button labelled ' + wanted);
  button.click();
  return true;
})()`;

/** The completion list as the reader sees it: "P.taxShare — Taxes and fees…". */
const completionItems = `[...document.querySelectorAll('[role=listbox] [role=option]')].map((node) => node.innerText.split('\\n')[0])`;

const listHeading = `document.querySelector('[role=listbox]') ? document.querySelector('[role=listbox]').innerText.split('\\n')[0] : null`;

const storedSettings = () =>
  evaluate(`window.localStorage.getItem(${JSON.stringify(STORAGE_KEY)})`).then((raw) => (raw ? JSON.parse(raw) : null));

/* ------------------------------------------------------------------ *
 * Checks
 * ------------------------------------------------------------------ */

let failures = 0;
const check = async (name, fn) => {
  try {
    const value = await fn();
    console.log(`✓ ${name}${value ? ` — ${value}` : ""}`);
  } catch (error) {
    failures += 1;
    console.log(`✗ ${name} — ${error.message}`);
    problems.push(`${name}: ${error.message}`);
  }
};

const has = (needle, name) =>
  check(name, async () => {
    const body = await pageText();
    if (!body.includes(needle.toLowerCase())) throw new Error(`“${needle}” is not in the page`);
    return needle;
  });

/* ---- start from a known state ------------------------------------ */
// A dev browser may already hold a saved formula; this test needs the shipped
// one to begin with, so open the site, clear the saved settings, then load the
// workbench.
await send("Page.navigate", { url: URL.replace(/\/chart\/formula.*$/, "/") });
await sleep(1500);
const wiped = await send("Runtime.evaluate", {
  expression: `window.localStorage.removeItem(${JSON.stringify(STORAGE_KEY)}), 'cleared'`,
  returnByValue: true,
});
if (wiped.result?.value !== "cleared") throw new Error("could not clear the saved settings before testing");
await send("Page.navigate", { url: URL });
await sleep(4000);

/* ---- 1. it renders ------------------------------------------------ */
await has("The formula workbench", "the page renders");
await has("matches the shipped model exactly", "the shipped formulas load unchanged");
await has("Every year, every step", "the year table is drawn");
await has("$929M", "the system-wide case is computed for the selected year");
await has("Restore default", "the restore button is present");

/* ---- 2. the editor names a mistake ------------------------------- */
await check("a typo is named, not swallowed", async () => {
  await typeIntoField("Taxes and fees", "ticket - feeToday - aeroToday", " - taxs");
  await sleep(400);
  if (!(await pageText()).includes("unknown name “taxs”")) throw new Error("the typo was not reported");
  return "reported as Unknown name “taxs”";
});

await check("fixing it clears the message", async () => {
  await typeIntoField("Taxes and fees", "ticket - feeToday - aeroToday - taxes", "");
  await sleep(500);
  if ((await pageText()).includes("unknown name")) throw new Error("the message is still shown");
  return "clean parse again";
});

/* ---- 3. autocomplete -------------------------------------------- */
await check("typing a dot lists everything under that name", async () => {
  await typeIntoField("Taxes and fees", "ticket * P", ".");
  await sleep(500);
  const items = await evaluate(completionItems);
  if (!items.length) throw new Error("no completion list appeared");
  if (!items.some((item) => item.includes("taxShare"))) throw new Error("taxShare is not offered");
  return `${items.length} names, ${await evaluate(listHeading)}`;
});

await check("typing after the dot filters the list", async () => {
  await typeIntoField("Taxes and fees", "ticket * P", ".taxS");
  await sleep(400);
  const items = await evaluate(completionItems);
  if (items.length !== 1 || !items[0].includes("taxShare")) {
    throw new Error(`expected only taxShare, got ${JSON.stringify(items)}`);
  }
  return items[0];
});

await check("deleting the member and typing the dot again lists it", async () => {
  await typeIntoField("Taxes and fees", "ticket * P.taxShare", "");
  await sleep(400);
  if ((await evaluate(completionItems)).length) throw new Error("a list appeared with no dot typed");
  await typeIntoField("Taxes and fees", "ticket * P", ".");
  await sleep(400);
  const items = await evaluate(completionItems);
  if (!items.some((item) => item.includes("taxShare"))) throw new Error("taxShare is not offered again");
  return "the list returns after deleting the member";
});

await check("the ▾ dropdown lists every name, on demand", async () => {
  await evaluate(pressKey("Taxes and fees", "Escape"));
  await sleep(300);
  if ((await evaluate(completionItems)).length) throw new Error("Escape did not close the list");
  await evaluate(`(() => {
    const area = [...document.querySelectorAll('textarea')].find((node) => node.getAttribute('aria-label') === 'Taxes and fees');
    const button = [...area.parentElement.querySelectorAll('button')].find((node) => node.hasAttribute('aria-expanded'));
    if (!button) throw new Error('no dropdown button beside the field');
    button.click();
    return true;
  })()`);
  await sleep(400);
  const items = await evaluate(completionItems);
  if (items.length < 40) throw new Error(`the dropdown offered only ${items.length} names`);
  return `${items.length} names, ${await evaluate(listHeading)}`;
});

await check("Escape holds the list shut until the caret moves", async () => {
  await evaluate(pressKey("Taxes and fees", "Escape"));
  await sleep(350);
  if ((await evaluate(completionItems)).length) throw new Error("the list came straight back");
  await typeIntoField("Taxes and fees", "ticket * P.", "t");
  await sleep(400);
  const items = await evaluate(completionItems);
  if (!items.length) throw new Error("typing did not reopen the list");
  return `${items.length} matches for “P.t”`;
});

await check("clicking a name inserts it", async () => {
  await evaluate(`(() => {
    const option = [...document.querySelectorAll('[role=option] button')].find((node) => node.innerText.includes('taxShare'));
    if (!option) throw new Error('taxShare is not among the options');
    option.click();
    return true;
  })()`);
  await sleep(500);
  const value = await fieldValue("Taxes and fees");
  if (!value.includes("P.taxShare")) throw new Error(`the click did not insert taxShare: “${value}”`);
  if ((await evaluate(completionItems)).length) throw new Error("the list stayed open after choosing");
  return `“ticket * P.t” → “${value}”`;
});

await check("Enter takes the highlighted name", async () => {
  await typeIntoField("Parking, for the party", "days * airport", ".");
  await sleep(400);
  await evaluate(pressKey("Parking, for the party", "ArrowDown"));
  await sleep(200);
  await evaluate(pressKey("Parking, for the party", "Enter"));
  await sleep(500);
  const value = await fieldValue("Parking, for the party");
  if (!value.includes("airport.") || value === "days * airport.") throw new Error(`Enter inserted nothing: “${value}”`);
  return `“days * airport.” → “${value}”`;
});

await check("yearly. lists the step series", async () => {
  await typeIntoField("Taken out since signing", "sum(yearly", ".");
  await sleep(400);
  const items = await evaluate(completionItems);
  if (!items.some((item) => item.includes("extraRevenueNeeded"))) throw new Error("the series are not offered");
  return `${items.length} series`;
});

/* ---- 4. a real edit moves the model ------------------------------ */
await check("an edited expression changes the projection", async () => {
  await typeIntoField("Parking, for the party", "", "days * lerp(airport.parkingPerDay, P.parkingTarget, ramp)");
  await typeIntoField("Taken out since signing", "", "sum(yearly.extraRevenueNeeded)");
  await typeIntoField("Airline fare, later", "", "airfareToday * pow(1.08, year)");
  await sleep(700);
  const body = await pageText();
  const fare = body.match(/airline fare, later[^\n]*\n+\$([\d,.]+)/);
  const trip = body.match(/whole trip, for the party\n+=\$([\d,.]+)/);
  if (!fare) throw new Error("the edited step's value is not shown");
  if (Number(fare[1].replace(/,/g, "")) <= 300) throw new Error(`the fare did not rise: $${fare[1]}`);
  if (!trip || Number(trip[1].replace(/,/g, "")) <= 900) {
    throw new Error(`the trip total did not follow: ${trip ? `$${trip[1]}` : "not found"}`);
  }
  return `fare $${fare[1]}, whole trip $${trip[1]}`;
});

/* ---- 5. the settings survive a reload ---------------------------- */
await check("the edited formula is saved and survives a reload", async () => {
  await sleep(700);
  const stored = await storedSettings();
  if (!stored || !JSON.stringify(stored.model).includes("1.08")) {
    throw new Error("the edited formula is not in local storage");
  }
  await send("Page.reload", {});
  await sleep(4000);
  const value = await fieldValue("Airline fare, later");
  if (!value.includes("pow(1.08, year)")) throw new Error(`the reload came back with “${value}”`);
  return "the edited formula came back after a reload";
});

await check("a parameter is saved and restored too", async () => {
  await evaluate(clickButton("Parameters"));
  await sleep(300);
  await evaluate(`(() => {
    const range = [...document.querySelectorAll('input[type=range]')].find((node) => node.getAttribute('aria-label') === 'Projection horizon');
    if (!range) throw new Error('no horizon slider');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(range, '30');
    range.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  await sleep(700);
  const stored = await storedSettings();
  if (stored?.model?.params?.horizon !== 30) throw new Error("the parameter was not saved");
  await send("Page.reload", {});
  await sleep(4000);
  const horizon = await evaluate(`(() => {
    const range = [...document.querySelectorAll('input[type=range]')].find((node) => node.getAttribute('aria-label') === 'Projection horizon');
    return range ? range.value : null;
  })()`);
  if (horizon !== "30") throw new Error(`the horizon came back as ${horizon}`);
  return "horizon 30 kept across a reload";
});

/* ---- 6. restore default ------------------------------------------ */
await check("Restore default clears the edits and the storage", async () => {
  await evaluate(clickButton("Restore default"));
  await sleep(900);
  const body = await pageText();
  if (body.includes("pow(1.08, year)")) throw new Error("the edited formula is still in an editor");
  if (!body.includes("matches the shipped model exactly")) throw new Error("the model did not return to the shipped one");
  if ((await storedSettings()) !== null) throw new Error("local storage still holds a formula");
  if ((await evaluate("location.search")).includes("f=")) throw new Error("the shared formula is still in the URL");
  return "back to the shipped model, storage clear";
});

await check("the defaults survive a reload after restoring", async () => {
  await send("Page.reload", {});
  await sleep(4000);
  if (!(await pageText()).includes("matches the shipped model exactly")) {
    throw new Error("the defaults did not survive the reload");
  }
  return "still the shipped model";
});

/* ---- 7. the rest of the furniture -------------------------------- */
await check("a preset rebuilds the model", async () => {
  await evaluate(clickButton("Formulas"));
  await sleep(300);
  await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')]
      .filter((node) => node.textContent.trim().toLowerCase() === 'apply')
      .find((node) => node.closest('li')?.textContent.includes('Aggressive operator'));
    if (!button) throw new Error('no aggressive-operator preset button');
    button.click();
    return true;
  })()`);
  await sleep(700);
  if ((await pageText()).includes("matches the shipped model exactly")) throw new Error("the preset changed nothing");
  return "the projection moved";
});

await check("share writes the formula into the address bar", async () => {
  await evaluate(clickButton("Copy link"));
  await sleep(400);
  const url = await evaluate("location.href");
  if (!url.includes("?f=")) throw new Error("no ?f= in the URL");
  return `${url.slice(0, 72)}…`;
});

/* ---- 8. nothing above should have thrown ------------------------- */
await check("no console errors and no uncaught exceptions", () => {
  if (problems.length) throw new Error(problems.join(" | "));
  return "clean";
});

socket.close();
chrome.kill();
console.log(failures ? `\n${failures} check(s) failed` : "\n✓ the workbench runs clean");
process.exit(failures ? 1 : 0);
