const { ipcRenderer } = require('electron');
const { sharedState } = require('./shared');
const { createSharedStore } = require('..');

const store = createSharedStore(sharedState);

store.subscribe((state, changeDescription) => {
  document.querySelector('#count').innerHTML = state.count;
  document.querySelector('#text').innerHTML = `description: ${
    changeDescription || 'none'
  }`;
});

document.querySelector('#inc').addEventListener('click', async () => {
  console.log('increment');
  const title = await ipcRenderer.invoke('getTitle');
  store.setState((state) => {
    state.count = state.count + 1;
  }, `+1 by ${title}`);
});

document.querySelector('#dec').addEventListener('click', () => {
  console.log('decrement');
  ipcRenderer.send('decrement');
});
