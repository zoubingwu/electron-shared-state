const { ipcRenderer } = require('electron');
const { sharedState } = require('./shared');
const { createSharedStore } = require('../dist/index');

const store = createSharedStore(sharedState);
const container = document.querySelector('#count');
store.subscribe((state, changeDescription) => {
  console.log('sharedState in renderer changed to: ', state, changeDescription);
  container.innerHTML = state.count;
});
document.querySelector('#inc').addEventListener('click', () => {
  store.setState(state => {
    state.count = state.count + 1;
  }, `+1 by renderer from ${require('electron').remote.getCurrentWebContents().id}`);
});
document.querySelector('#dec').addEventListener('click', () => {
  ipcRenderer.send('decrement');
});
