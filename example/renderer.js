// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
const { sharedState } = require("./shared");
const { createSharedStore } = require("../dist/index");

const store = createSharedStore(sharedState);
const container = document.querySelector("#count");
const btn = document.querySelector("#btn");
store.subscribe((state, changeDescription) => {
  console.log("sharedState in renderer changed to: ", state, changeDescription);
  container.innerHTML = state.count;
});
btn.addEventListener("click", () => {
  store.setState(state => {
    state.count = state.count + 1;
  }, "+1 by renderer");
});
