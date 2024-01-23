import { StorageItem } from "webext-storage";
import "../options/options-storage.js";

const oBSH_details = new StorageItem("oBSH_details", { defaultValue: "none" });
const oBR_details = new StorageItem("oBR_details", { defaultValue: "none" });
const headerDetails = new StorageItem("headerDetails", { defaultValue: "none" });

function isChrome() {
    if (typeof window != "undefined") {
        return window.navigator.userAgent.match("Chrome") ? true : false;
    }
    return true;
}

function ba2str(ba) {
    let result = "";
    for (const b of ba) {
        result += String.fromCharCode(b);
    }
    return result;
}

function getHeaders(obj) {
    let headers_obj = {};

    const x = obj.url.split("/");
    const host = x[2].split(":")[0];
    x.splice(0, 3);
    const resource_url = x.join("/");

    const http_version = " HTTP/1.1";
    let headers = obj.method + " /" + resource_url + http_version + "\r\n";
    // Chrome doesnt add Host header. Firefox does
    if (isChrome()) {
        headers += "Host: " + host + "\r\n";
    }
    for (let h of obj.requestHeaders) {
        // we dont want any "br" encoding
        if (h.name === "Accept-Encoding") {
            // h.value = 'gzip, deflate'
            h.value = "identity;q=1, *;q=0";
        }
        headers += h.name + ": " + h.value + "\r\n";
        headers_obj[h.name] = h.value;
    }
    let content = "";
    if (obj.method === "GET") {
        headers += "\r\n";
    } else if (obj.method === "POST") {
        if (obj.requestBody.raw !== undefined) {
            content = ba2str(new Uint8Array(obj.requestBody.raw[0].bytes));
        } else {
            const keys = Object.keys(obj.requestBody.formData);
            for (var key of keys) {
                content += key + "=" + obj.requestBody.formData[key] + "&";
            }
            // get rid of the last &
            content = content.slice(0, -1);
        }
        // Chrome doesn't expose Content-Length which chokes nginx
        headers += "Content-Length: " + parseInt(content.length) + "\r\n\r\n";
        headers += content;
    }
    let port = 443;
    if (obj.url.split(":").length === 3) {
        // the port is explicitely provided in URL
        port = parseInt(obj.url.split(":")[2].split("/")[0]);
    }
    return {
        headers_str: headers,
        headers: headers_obj,
        server: host,
        port: port,
        data: content,
        method: obj.method,
        path: resource_url,
    };
}

async function recordHeaderDetails() {
    let loBR_details = await oBR_details.get();
    let loBSH_details = await oBSH_details.get();

    if (loBR_details.details.url !== loBSH_details.details.url) return;
    // if (oBR_details.requestId !== oBSH_details.requestId) return;
    if (loBR_details.details.method === "POST") {
        // POST payload is only available from onBeforeRequest
        loBSH_details.details["requestBody"] = loBR_details.details.requestBody;
    }

    const rv = getHeaders(loBSH_details.details);

    headerDetails.set({
        headers: rv.headers,
        server: rv.server,
        port: rv.port,
        data: rv.data,
        method: rv.method,
        path: rv.path,
    });
}

async function extractHeaderDetails() {
    return await headerDetails.get("headerDetails");
}

function retrieveSession(tabId, urlFilters) {
    const oBR_handler = function (details) {
        if (details.method === "OPTIONS") return;
        browser.webRequest.onBeforeRequest.removeListener(oBR_handler);
        oBR_details.set({ details });
    };
    browser.webRequest.onBeforeRequest.addListener(
        oBR_handler,
        {
            urls: urlFilters,
            tabId: tabId,
            types: ["main_frame", "xmlhttprequest"],
            // types: ["main_frame", "sub_frame", "stylesheet", "script",
            // "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"]
        },
        ["requestBody"]
    );

    const oBSH_handler = function (details) {
        if (details.method === "OPTIONS") return;
        browser.webRequest.onBeforeSendHeaders.removeListener(oBSH_handler);
        oBSH_details.set({ details });
    };
    const extraInfoSpec = ["requestHeaders"];
    if (isChrome()) extraInfoSpec.push("extraHeaders");
    browser.webRequest.onBeforeSendHeaders.addListener(
        oBSH_handler,
        {
            urls: urlFilters,
            tabId: tabId,
            types: ["main_frame", "xmlhttprequest"],
        },
        extraInfoSpec
    );

    const sessionDetails = new Promise((resolve) => {
        const oSH_handler = async function (details) {
            if (details.method === "OPTIONS") return;
            browser.webRequest.onSendHeaders.removeListener(oSH_handler);
            await recordHeaderDetails();

            // 3. Extract the session details and return
            // 3.1 trigger the extraction
            const result = await extractHeaderDetails();

            resolve(result);

            // 3.2 update extension UI to show process completed and no longer active
            browser.browserAction.setBadgeText({
                text: "",
            });

            // 3.3 close the tab
            browser.tabs.remove(tabId);
        };
        browser.webRequest.onSendHeaders.addListener(oSH_handler, {
            urls: urlFilters,
            tabId: tabId,
            types: ["main_frame", "xmlhttprequest"],
        });
    });
    return sessionDetails;
}

async function prepareSession(url, urlFilters) {
    const tab = await browser.tabs.create({ url: url });
    // 1.1 update extension UI to show it's active
    browser.browserAction.setBadgeBackgroundColor({
        color: "green",
    });
    browser.browserAction.setBadgeText({
        text: "on",
    });

    // 2. With the returned tab id, create request header listeners over the url prefix, store header to session storage
    const session = retrieveSession(tab.id, urlFilters);

    // 2.2 Update the tab to have the url
    //await browser.tabs.update(tab.id, { url: url })

    return session;
}
async function handleWebpageRequests(request) {
    if (request.type === "prepareSession") {
        return await prepareSession(request.redirectUrl, request.urlFilters);
    }
}
browser.runtime.onMessage.addListener(handleWebpageRequests);
browser.runtime.onMessageExternal.addListener(handleWebpageRequests);

browser.runtime.onInstalled.addListener(() => {
    browser.browserAction.enable();
});

