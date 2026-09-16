/**
 * Browser smoke test.
 *
 * Drives the real page over the Chrome DevTools Protocol so interactivity is
 * verified, not assumed: hydration, citation pinning, sliders, toggles, filters
 * and accessibility basics. Writes a full-page screenshot for visual review.
 *
 * Usage:  node scripts/smoke-test.mjs [baseUrl]
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const log = (message) => process.stdout.write(`${message}\n`);
const BASE = process.argv[2] ?? "http://127.0.0.1:4310";
const DEBUG_PORT = Number(process.env.CDP_PORT ?? 9333);
const VERBOSE = process.env.SMOKE_VERBOSE === "1";

const CANDIDATES = [
  process.env.CHROME_BIN,
  "/Users/vishalgautam/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const passes = [];
const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) passes.push(name);
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  if (VERBOSE) log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let chrome = null;
let socket = null;

try {
  const binary = CANDIDATES.find((candidate) => existsSync(candidate));
  if (!binary) throw new Error("No Chrome binary found; set CHROME_BIN");
  if (VERBOSE) log(`binary: ${binary}`);

  const profile = mkdtempSync(path.join(tmpdir(), "dsh-smoke-"));
  chrome = spawn(
    binary,
    [
      "--headless=new",
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "--window-size=1600,1200",
      BASE,
    ],
    { stdio: "ignore" },
  );
  chrome.on("error", (error) => log(`chrome spawn error: ${error.message}`));

  // Wait for the page target and take its own WebSocket, which avoids the
  // browser-level attach handshake entirely.
  let wsUrl = null;
  for (let attempt = 0; attempt < 60 && !wsUrl; attempt += 1) {
    await sleep(250);
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
        if (page) wsUrl = page.webSocketDebuggerUrl;
      }
    } catch {
      /* retry */
    }
  }
  if (!wsUrl) throw new Error("Chrome page target never came up");
  if (VERBOSE) log(`cdp page target: ${wsUrl}`);

  socket = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error("CDP socket error")), { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  const consoleErrors = [];

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const entry = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
      else entry.resolve(message.result);
      return;
    }
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
      consoleErrors.push(
        message.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" "),
      );
    }
    if (message.method === "Runtime.exceptionThrown") {
      consoleErrors.push(message.params.exceptionDetails?.text ?? "uncaught exception");
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 20_000);
      pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      socket.send(JSON.stringify({ id, method, params }));
    });

  await send("Runtime.enable");
  await send("Page.enable");
  // The window was launched straight at BASE; reload to be sure we observe load.
  await send("Page.navigate", { url: BASE });
  await sleep(4000);

  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(`${result.exceptionDetails.text} :: ${expression.slice(0, 90)}`);
    }
    return result.result.value;
  };

  /* ------------------------- render ------------------------- */
  log(`smoke-testing ${BASE}`);
  const title = await evaluate("document.title");
  check("title is parsed from article.md", /Carney Privatizes Airports/.test(title), title);

  const h1 = await evaluate("document.querySelectorAll('h1').length");
  check("exactly one h1", h1 === 1, `got ${h1}`);

  /* ------------------------- ledger ------------------------- */
  const ledger = await evaluate("document.querySelectorAll('[id^=source-]').length");
  check("ledger renders all 20 listed sources", ledger === 20, `got ${ledger}`);

  const listedOnly = await evaluate(
    "[...document.querySelectorAll('[id^=source-]')].filter(c => c.textContent.includes('listed, not cited')).length",
  );
  check("9 sources flagged as listed-but-not-cited", listedOnly === 9, `got ${listedOnly}`);

  const citedTab = await evaluate(`(() => {
    const btn = [...document.querySelectorAll('#sources button')].find(b => /^Cited \\(/.test(b.textContent));
    if (!btn) return null;
    btn.click();
    return true;
  })()`);
  check("cited-only filter exists", citedTab === true);
  if (citedTab) {
    await sleep(400);
    const citedRows = await evaluate("document.querySelectorAll('[id^=source-]').length");
    check("cited-only filter narrows to 11 sources", citedRows === 11, `got ${citedRows}`);
    await evaluate(`(() => {
      const btn = [...document.querySelectorAll('#sources button')].find(b => /^All \\(/.test(b.textContent));
      if (btn) btn.click();
    })()`);
    await sleep(300);
  }

  /* ------------------------- citation pinning ------------------------- */
  const pin = await evaluate(`(() => {
    const marker = document.querySelector('button[aria-label^="Source 14"]');
    if (!marker) return { ok: false };
    marker.click();
    return {
      ok: true,
      rail: [...document.querySelectorAll('aside button')].some(b =>
        (b.getAttribute('aria-label') || '') === 'Unpin source 14'),
      highlighted: document.getElementById('source-14').className.includes('signal-500/60'),
    };
  })()`);
  check("citation click pins to the reading rail", pin.rail === true, JSON.stringify(pin));
  check("pinned source highlights in the ledger", pin.highlighted === true, JSON.stringify(pin));

  const markPinned = await evaluate(
    `document.querySelector('button[aria-label="Source 14: Canadian Labour Congress"]')?.getAttribute('aria-pressed')`,
  );
  check("citation marker reflects pressed state", markPinned === "true", String(markPinned));

  /* ------------------------- ticket projection ------------------------- */
  const readSection = () => evaluate("document.getElementById('year-5-10').innerText");

  const before = await readSection();
  const moved = await evaluate(`(() => {
    const inputs = [...document.querySelectorAll('#year-5-10 input[type=range]')];
    const year = inputs.find(i => i.min === '0' && i.max === '25');
    if (!year) return { ok: false, count: inputs.length };
    year.value = '20';
    year.dispatchEvent(new Event('input', { bubbles: true }));
    year.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, count: inputs.length };
  })()`);
  check("year scrubber is present in the projection", moved.ok === true, JSON.stringify(moved));
  await sleep(1500);
  const afterMove = await readSection();
  check("scrubbing the year redraws the projection", afterMove !== before);
  check(
    "scrubbed state reports the selected calendar year",
    /2051|2046|2047|2048/.test(afterMove),
    afterMove.replace(/\n/g, " | ").slice(0, 160),
  );

  const extraToggle = await evaluate(`(() => {
    const section = document.getElementById('year-5-10');
    const rows = [...section.querySelectorAll('button[aria-pressed]')]
      .filter(b => /Airport parking|Kiss-and-fly|Airport food|Retail|Ground transport/.test(b.textContent));
    if (!rows.length) return { ok: false };
    const target = rows.find(b => b.getAttribute('aria-pressed') === 'false') || rows[0];
    target.click();
    return { ok: true, total: rows.length, label: target.textContent.slice(0, 40) };
  })()`);
  check("non-ticket charges are switchable", extraToggle.ok === true, JSON.stringify(extraToggle));
  await sleep(1200);
  const afterToggle = await readSection();
  check("switching an extra changes the modelled total", afterToggle !== afterMove);

  /* ------------------------- guardrails ------------------------- */
  const counter = await evaluate(`(() => {
    const section = document.getElementById('counterargument');
    const toggles = [...section.querySelectorAll('button[aria-pressed="true"]')];
    toggles.forEach(t => t.click());
    return { toggles: toggles.length };
  })()`);
  check("counterargument exposes guardrail switches", counter.toggles >= 3, JSON.stringify(counter));
  await sleep(600);
  const verdictText = await evaluate("document.getElementById('counterargument').innerText");
  check("removing all guardrails reports the no-guardrails verdict", /No guardrails at all/.test(verdictText));

  const reEnable = await evaluate(`(() => {
    const section = document.getElementById('counterargument');
    const toggles = [...section.querySelectorAll('button[aria-pressed="false"]')];
    toggles.slice(0, 3).forEach(t => t.click());
    return toggles.length;
  })()`);
  await sleep(600);
  const verdictText2 = await evaluate("document.getElementById('counterargument').innerText");
  check(
    "restoring guardrails changes the verdict again",
    reEnable > 0 && verdictText2 !== verdictText,
  );

  /* ------------------------- commitments ------------------------- */
  const filtered = await evaluate(`(() => {
    const btn = [...document.querySelectorAll('#commitments button')].find(b => /At risk \\(/.test(b.textContent));
    if (!btn) return { ok: false };
    btn.click();
    return { ok: true };
  })()`);
  check("commitment tracker has status filters", filtered.ok === true);
  if (filtered.ok) {
    await sleep(400);
    const rows = await evaluate("document.querySelectorAll('#commitments li').length");
    check("at-risk filter narrows the board to 4 rows", rows === 4, `got ${rows}`);
  }

  /* ------------------------- source integrity in the UI ------------------------- */
  const provenance = await evaluate(`(() => {
    const text = document.body.innerText;
    return {
      hasProvenance: /How this model is built/.test(text),
      hasAssumptionNote: /Modelled from article\\.md/.test(text),
      citations: document.querySelectorAll('sup [aria-label^="Source "]').length,
    };
  })()`);
  check("interactive model documents its assumptions", provenance.hasProvenance === true);
  check("modelled figures are labelled as modelled", provenance.hasAssumptionNote === true);
  check("inline citation markers are rendered", provenance.citations > 100, `got ${provenance.citations}`);

  /* ------------------------- accessibility ------------------------- */
  const a11y = await evaluate(`(() => {
    const nested = [...document.querySelectorAll('button')].filter(b => b.querySelector('button')).length;
    const unlabelled = [...document.querySelectorAll('button')].filter(
      b => !b.textContent.trim() && !b.getAttribute('aria-label')
    ).length;
    const rangesWithoutLabel = [...document.querySelectorAll('input[type=range]')].filter(
      i => !i.getAttribute('aria-label') && !i.id
    ).length;
    const lang = document.documentElement.lang;
    return { nested, unlabelled, rangesWithoutLabel, lang };
  })()`);
  check("no nested buttons after hydration", a11y.nested === 0, JSON.stringify(a11y));
  check("every button has an accessible name", a11y.unlabelled === 0, JSON.stringify(a11y));
  check("every slider is labelled", a11y.rangesWithoutLabel === 0, JSON.stringify(a11y));
  check("document language is set", a11y.lang === "en", String(a11y.lang));

  /* ------------------------- console ------------------------- */
  const realErrors = consoleErrors.filter(
    (message) =>
      message &&
      !/favicon|React DevTools|Fast Refresh|Download the React/i.test(message),
  );
  check(
    "no console errors during load and interaction",
    realErrors.length === 0,
    realErrors.slice(0, 2).join(" || ").slice(0, 400),
  );

  /* ------------------------- screenshot ------------------------- */
  mkdirSync(".tmp-check", { recursive: true });
  const metrics = await evaluate(
    "JSON.stringify({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth })",
  );
  const { h, w } = JSON.parse(metrics);
  const shot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: w, height: Math.min(h, 12000), scale: 1 },
  });
  writeFileSync(".tmp-check/screenshot.png", Buffer.from(shot.data, "base64"));
  log(`page height ${h}px, width ${w}px — screenshot: .tmp-check/screenshot.png`);

  /* ------------------------- layout sanity ------------------------- */
  const overflow = await evaluate(
    "document.documentElement.scrollWidth - document.documentElement.clientWidth",
  );
  check("no horizontal overflow at 1600px", overflow <= 1, `overflow ${overflow}px`);

  log("");
  if (failures.length) {
    log(`${passes.length} passed, ${failures.length} FAILED`);
    for (const failure of failures) log(`  ✗ ${failure}`);
    process.exitCode = 1;
  } else {
    log(`${passes.length} checks passed`);
    for (const pass of passes) log(`  ✓ ${pass}`);
  }
} catch (error) {
  log(`smoke test crashed: ${error?.stack ?? error}`);
  process.exitCode = 1;
} finally {
  try {
    socket?.close();
  } catch {
    /* ignore */
  }
  chrome?.kill("SIGTERM");
}
