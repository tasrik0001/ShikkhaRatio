import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { statSync } from "node:fs";

const BASE = "http://127.0.0.1:8000/";
const browser = await chromium.launch({ channel: "msedge", headless: true });

try {
  const homePage = await browser.newPage();
  const homeErrors = [];
  homePage.on("pageerror", error => homeErrors.push(error.message));
  homePage.on("response", response => { if (response.status() >= 400) homeErrors.push(`${response.status()} ${response.url()}`); });

  await homePage.goto(BASE);
  console.log("HOME h1:", await homePage.locator("h1").innerText());
  console.log("HOME lead:", (await homePage.locator(".lead").innerText()).slice(0, 100));
  console.log("HOME byline:", await homePage.locator(".byline").innerText());
  const bodyText = await homePage.locator("body").innerText();
  assert.ok(!bodyText.includes("school_summary.csv"), "homepage must not expose dev file names");
  assert.ok(!bodyText.includes("District_Master"), "homepage must not expose dev sheet names");
  assert.equal(await homePage.locator("#district").count(), 0, "homepage must not have district selector");
  assert.equal(await homePage.locator("#map").count(), 0, "homepage must not have the map");
  assert.equal(homeErrors.length, 0, `homepage errors: ${homeErrors.join("; ")}`);
  await homePage.close();

  const expPage = await browser.newPage();
  const expErrors = [];
  expPage.on("pageerror", error => expErrors.push(error.message));
  expPage.on("response", response => { if (response.status() >= 400) expErrors.push(`${response.status()} ${response.url()}`); });

  await expPage.goto(BASE + "explore.html");
  await expPage.waitForFunction(() => !document.getElementById("district").disabled, { timeout: 30000 });
  await expPage.waitForFunction(() => document.getElementById("map-status").textContent.startsWith("64 district boundaries"), { timeout: 60000 });
  assert.equal(await expPage.locator("#map path.leaflet-interactive").count(), 64);

  await expPage.selectOption("#district", "Dhaka");
  assert.equal(await expPage.locator("#panel-title").innerText(), "Dhaka");
  assert.equal(await expPage.locator("#ratio").innerText(), "24.29");

  await expPage.selectOption("#sector", "college");
  assert.equal(await expPage.locator("#ratio").innerText(), "39.73");
  await expPage.selectOption("#district", "all");
  assert.equal(await expPage.locator("#ratio").innerText(), "37.10");

  const dl1 = expPage.waitForEvent("download");
  await expPage.selectOption("#dl-sector", "college");
  await expPage.selectOption("#dl-district", "district:Munshiganj");
  await expPage.click("#download");
  const single = await dl1;
  console.log("Download 1 file:", await single.suggestedFilename());

  const dl2 = expPage.waitForEvent("download");
  await expPage.selectOption("#dl-sector", "school");
  await expPage.selectOption("#dl-district", "all");
  await expPage.click("#download");
  const all = await dl2;
  console.log("Download 2 file:", await all.suggestedFilename(), "| size:", statSync(await all.path()).size, "bytes");
  assert.ok((await all.suggestedFilename()).includes("school-all-districts-2024"));

  await expPage.reload();
  await expPage.waitForFunction(() => !document.getElementById("district").disabled);
  assert.equal(await expPage.locator("#sector").inputValue(), "college");
  await expPage.selectOption("#district", "all");
  await expPage.selectOption("#sector", "school");

  assert.equal(expErrors.length, 0, `explorer errors: ${expErrors.join("; ")}`);
  await expPage.close();

  console.log("PASS: article homepage (no map), explorer (64 shapes, district+sector selection, per-choice downloads, URL persistence), no browser errors.");
} finally {
  await browser.close();
}
