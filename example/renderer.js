const { ipcRenderer } = require('electron');
const { sharedState } = require('./shared');
const { createSharedStore } = require('..');

const id = require('electron').remote.getCurrentWebContents().id;
const store = createSharedStore(sharedState);

store.subscribe((state, changeDescription) => {
  document.querySelector('#count').innerHTML = state.count;
  document.querySelector('#text').innerHTML = `description: ${
    changeDescription || 'none'
  }`;
});

document.querySelector('#inc').addEventListener('click', () => {
  store.setState((state) => {
    state.count = state.count + 1;
  }, `+1 by window ${id}`);
});

document.querySelector('#dec').addEventListener('click', () => {
  ipcRenderer.send('decrement');
});

document.title = `window ${id}`;
