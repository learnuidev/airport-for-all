/**
 * Browser smoke test for /chart/formula.
 *
 * Drives the real page over the DevTools protocol: watches for console errors
 * and uncaught exceptions, then exercises the editor, a parameter, a preset and
 * the share button — and finally the two things that only show up over time:
 * that the settings survive a reload, and that "Restore default" takes them all
 * back to the shipped model and clears what the browser is holding.
 *
 * Run with a dev server on :4310  —  node scripts/check-page.mjs
 * (Overrides: URL, CHROME.)
 */

import { spawn } from "node:child_process";
import fs from "node:fs";

const PORT = 9333;
const URL = process.env.URL ?? "http://localhost:4310/chart/formula";
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
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
  for (let i = 0; i < 40; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((item) => item.type === "page" && !item.url.startsWith("chrome://"));
      if (page) return page;
    } catch {}
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
    if (text && !/DevTools|Download the React DevTools|tailwind/i.test(text)) {
      problems.push(`${message.params.type}: ${text}`);
    }
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
await send("Page.navigate", { url: URL });
await sleep(3500);

const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? "evaluate failed");
  return result.result.value;
};

/** The page as text, lower-cased: the shell sets much of its furniture in caps. */
const text = async () => (await evaluate("document.body.innerText")).toLowerCase();

/** Type into a textarea the way a person does, so React sees the change. */
const typeInto = (find, value) => `(() => {
  const area = [...document.querySelectorAll('textarea')].find((node) => node.value.includes(${JSON.stringify(find)}));
  if (!area) throw new Error('no textarea containing ' + ${JSON.stringify(find)});
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(area, ${JSON.stringify(value)});
  area.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`;

const clickButton = (label) => `(() => {
  const wanted = ${JSON.stringify(label.toLowerCase())};
  const button = [...document.querySelectorAll('button')].find((node) => node.textContent.trim().toLowerCase() === wanted);
  if (!button) throw new Error('no button labelled ' + wanted);
  button.click();
  return true;
})()`;

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
    const body = await text();
    if (!body.includes(needle.toLowerCase())) throw new Error(`“${needle}” not in the page`);
    return needle;
  });

const storedSettings = () =>
  evaluate("window.localStorage.getItem('aifa:formula:v1')").then((raw) => (raw ? JSON.parse(raw) : null));

/* ---- 1. it renders ------------------------------------------------ */
await has("The formula workbench", "the page renders");
await has("matches the shipped model exactly", "the shipped formulas load unchanged");
await has("Every year, every step", "the year table is drawn");
await has("$7,924M", "the system-wide case is computed for the selected year");
await has("Restore default", "the restore button is present");

/* ---- 2. the editor names a mistake ------------------------------- */
await check("a typo is named, not swallowed", async () => {
  await evaluate(typeInto("ticket - feeToday", "ticket - feeToday - aeroToday - taxs"));
  await sleep(400);
  const body = await text();
  if (!body.includes("unknown name “taxs”")) throw new Error("the typo was not reported");
  return "reported as Unknown name “taxs”";
});

await check("fixing it clears the message", async () => {
  await evaluate(typeInto("taxs", "ticket - feeToday - aeroToday - taxes"));
  await sleep(500);
  const body = await text();
  if (body.includes("unknown name")) throw new Error("the message is still shown");
  return "clean parse again";
});

/* ---- 3. a real edit moves the model ------------------------------ */
await check("an edited expression changes the projection", async () => {
  await evaluate(typeInto("P.fareAnnual", "airfareToday * pow(1.08, year)"));
  await sleep(600);
  const body = await text();
  const fare = body.match(/airline fare, later\n+\$([\d,.]+)/);
  const trip = body.match(/whole trip, for the party\n+=\$([\d,.]+)/);
  if (!fare) throw new Error("the edited step's value is not shown");
  if (Number(fare[1].replace(/,/g, "")) <= 300) throw new Error(`the fare did not rise: $${fare[1]}`);
  if (!trip || Number(trip[1].replace(/,/g, "")) <= 900) {
    throw new Error(`the trip total did not follow: ${trip ? `$${trip[1]}` : "not found"}`);
  }
  return `fare $${fare[1]}, whole trip $${trip[1]}`;
});

/* ---- 4. the settings survive a reload ---------------------------- */
await check("the edit is saved and survives a reload", async () => {
  await sleep(700); // let the debounced write land
  const stored = await storedSettings();
  if (!stored || !JSON.stringify(stored.model).includes("1.08")) {
    throw new Error("the edited formula is not in local storage");
  }
  await send("Page.reload", { ignoreCache: false });
  await sleep(3500);
  const stillThere = await evaluate(
    `[...document.querySelectorAll('textarea')].some((node) => node.value.includes('pow(1.08, year)'))`,
  );
  if (!stillThere) throw new Error("the reload came back without the edited formula");
  return "the edited formula came back after a reload";
});

await check("a parameter and a switch are saved too", async () => {
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
  await send("Page.reload", { ignoreCache: false });
  await sleep(3500);
  const horizon = await evaluate(`(() => {
    const range = [...document.querySelectorAll('input[type=range]')].find((node) => node.getAttribute('aria-label') === 'Projection horizon');
    return range ? range.value : null;
  })()`);
  if (horizon !== "30") throw new Error(`horizon came back as ${horizon}`);
  return "horizon 30 kept across a reload";
});

/* ---- 5. restore default ------------------------------------------ */
await check("Restore default clears the edits and the storage", async () => {
  await evaluate(clickButton("Restore default"));
  await sleep(900);
  const body = await text();
  if (body.includes("pow(1.08, year)")) throw new Error("the edited formula is still in an editor");
  if (!body.includes("matches the shipped model exactly")) throw new Error("the model did not return to the shipped one");
  const stored = await storedSettings();
  if (stored !== null) throw new Error("local storage still holds a formula");
  const search = await evaluate("location.search");
  if (search.includes("f=")) throw new Error("the shared formula is still in the URL");
  return "back to the shipped model, storage clear";
});

await check("the defaults survive a reload after restoring", async () => {
  await send("Page.reload", { ignoreCache: false });
  await sleep(3500);
  const body = await text();
  if (!body.includes("matches the shipped model exactly")) throw new Error("the defaults did not survive the reload");
  const horizon = await evaluate(`(() => {
    const range = [...document.querySelectorAll('input[type=range]')].find((node) => node.getAttribute('aria-label') === 'Projection horizon');
    return range ? range.value : 'not on this tab';
  })()`);
  if (horizon === "30") throw new Error("the old parameter came back");
  return "still the shipped model";
});

/* ---- 6. the rest of the furniture -------------------------------- */
await check("a preset rebuilds the model", async () => {
  await evaluate(clickButton("Formulas"));
  await sleep(300);
  await evaluate(`(() => {
    const buttons = [...document.querySelectorAll('button')].filter((node) => node.textContent.trim().toLowerCase() === 'apply');
    const preset = buttons.find((button) => button.closest('li')?.textContent.includes('Aggressive operator'));
    if (!preset) throw new Error('no aggressive-operator preset button');
    preset.click();
    return true;
  })()`);
  await sleep(700);
  const body = await text();
  if (body.includes("matches the shipped model exactly")) throw new Error("the preset changed nothing");
  return "the projection moved";
});

await check("share writes the formula into the address bar", async () => {
  await evaluate(clickButton("Copy link"));
  await sleep(400);
  const url = await evaluate("location.href");
  if (!url.includes("?f=")) throw new Error("no ?f= in the URL");
  return `${url.slice(0, 72)}…`;
});

/* ---- 7. nothing above should have thrown ------------------------- */
await check("no console errors and no uncaught exceptions", () => {
  if (problems.length) throw new Error(problems.join(" | "));
  return "clean";
});

socket.close();
chrome.kill();
console.log(failures ? `\n${failures} check(s) failed` : "\n✓ the workbench runs clean");
process.exit(failures ? 1 : 0);
