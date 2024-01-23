import "webext-base-css";
import "./options.css";
import optionsStorage from "./options-storage.js";

const enabled = document.querySelector(".switch");

function updateEnabled() {
    console.log("update: ", enabled.checked);
    if (enabled.checked === false) enabled.checked = true;
    else enabled.checked = false;
}

enabled.addEventListener("input", updateEnabled);

async function init() {
    await optionsStorage.syncForm("#options-form");
}

init();

