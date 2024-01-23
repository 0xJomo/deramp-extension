// @ts-check
const { test, expect } = require("@playwright/test");
const { firefox } = require("playwright");
import { withExtension } from "playwright-webextext";
import path from "path";



const pathToExtension = path.join(__dirname, "../dist");
test("check if extension passes back authorization header", async () => {
    const browserTypeWithExtension = withExtension(firefox, pathToExtension);
    const browser = await browserTypeWithExtension.launch({ headless: false });
    const context = await browser.newContext();

    const page = await context.newPage();
    await page.goto("https://deramp.xyz");
    const ret = await page.evaluate(
        "window.derampInject({type: 'string', redirectUrl: 'https://twitter.com', urlFilters: ['<all_urls>']});"
    );
    expect(ret.headers.authorization).toBeDefined();
});

