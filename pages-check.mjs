import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const BASE = "http://127.0.0.1:8000/";
const PAGES = ["index.html", "explore.html", "shortage.html", "regions.html", "story.html", "goals.html", "sources.html", "limitations.html", "404.html"];
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
const errors = [];

page.on("pageerror", error => errors.push(`${page.url()} ${error.message}`));
page.on("response", response => {
  if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
});

try {
  for (const path of PAGES) {
    await page.goto(BASE + path, { waitUntil: "load" });
    const heading = await page.locator("h1").first().innerText();
    const date = await page.locator("#today").innerText();
    const navLinks = await page.locator("nav a").count();
    const body = await page.locator("body").innerText();
    console.log(`${path} | h1: ${heading} | date: ${date} | nav links: ${navLinks}`);
    assert.ok(heading.length > 0, `${path} has an h1`);
    assert.ok(/\d{1,2} \w+ \d{4}/.test(date), `${path} shows a formatted date`);
    assert.equal(navLinks, 8, `${path} has 8 navigation links`);
    for (const bad of ["lorem ipsum", "[object Object]", "TODO:", "placeholder"]) {
      assert.ok(!body.toLowerCase().includes(bad), `${path} must not contain ${bad}`);
    }
  }

  const hrefs = await page.locator("a[href]").evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
  const checked = new Set();
  for (const href of hrefs) {
    if (/^https?:/i.test(href) && !href.includes("127.0.0.1")) continue;
    const url = new URL(href, BASE);
    if (url.origin !== new URL(BASE).origin) continue;
    const target = url.href.split("#")[0];
    if (checked.has(target)) continue;
    checked.add(target);
    const response = await fetch(target);
    assert.ok(response.ok, `broken link ${target} -> ${response.status}`);
  }
  console.log(`Checked ${checked.size} unique internal link targets from the editorial pages.`);

  const missing = await page.request.get(BASE + "missing-page/");
  console.log("Missing page returns HTTP", missing.status(), "(GitHub Pages will serve 404.html automatically for unknown paths)");
  assert.equal(missing.status(), 404);

  assert.deepEqual(errors, []);
  console.log("PASS: all editorial pages render with dated header and nav, internal links resolve, no page errors.");
} finally {
  if (errors.length) console.log("Collected errors:", errors);
  await browser.close();
}
