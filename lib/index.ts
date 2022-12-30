import produce, { applyPatches, Patch, enablePatches } from 'immer';
import {
  ipcMain,
  webContents,
  ipcRenderer,
  IpcRenderer,
  IpcMainInvokeEvent,
  IpcRendererEvent,
} from 'electron';
import type { Objectish } from 'immer/dist/internal';

enablePatches();

interface IChangePack {
  patches: Patch[];
  description?: string;
  senderId?: number;
}

export function createSharedStore<T extends Objectish>(state: T) {
  let innerState = state;
  let lastChange: IChangePack = { patches: [] };
  let listeners: ((state: T, description?: string) => void)[] = [];

  const connected = new Set<number>(); // this is only for main process
  const isRenderer = process?.type === 'renderer';
  const isMain = process?.type === 'browser';
  const ipcModule = isMain ? ipcMain : ipcRenderer;
  const INTERNAL_CHANNEL = '@@ELECTRON_SHARED_STORE_IPC_CHANNEL';

  let isUpdating = false;

  ipcModule.on(
    INTERNAL_CHANNEL,
    (event: IpcMainInvokeEvent | IpcRendererEvent, change: IChangePack) => {
      if (isMain) {
        const id = (event as IpcMainInvokeEvent).sender.id; // webContent's id
        connected.add(id);
      }

      if (change.patches.length === 0) {
        return;
      }

      isUpdating = true;

      const nextState = applyPatches(innerState, change.patches);
      lastChange = {
        ...change,
        senderId: isMain ? (event as IpcMainInvokeEvent).sender.id : -1, // renderer always receives from main so let's say id is -1
      };

      broadcastChange();

      innerState = nextState;

      isUpdating = false;

      for (let i = 0; i < listeners.length; i++) {
        const listener = listeners[i];
        listener(innerState, change.description);
      }
    }
  );

  function broadcastChange() {
    if (lastChange.patches.length === 0) {
      return;
    }

    if (isRenderer) {
      // if lastChange was from main, we don't send it to main again
      lastChange.senderId !== -1 &&
        (ipcModule as IpcRenderer).send(INTERNAL_CHANNEL, lastChange);
    } else if (isMain) {
      connected.forEach((id) => {
        // do not broadcast to sender process
        if (id === lastChange.senderId) {
          return;
        }

        const wc = webContents.fromId(id);
        if (wc) {
          wc.send(INTERNAL_CHANNEL, lastChange);
        }
      });
    }
  }

  function setState(recipe: (draft: T) => void, description?: string) {
    isUpdating = true;

    const nextState = produce(innerState, recipe, (patches) => {
      lastChange = { patches, description };
    });

    broadcastChange();

    innerState = nextState;
    isUpdating = false;

    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i];
      listener(innerState, lastChange.description);
    }

    return nextState;
  }

  function getState(): T {
    if (isUpdating) {
      throw new Error(
        'You may not call store.getState() inside setState method. ' +
          'It has already received the state as an argument. '
      );
    }

    return innerState;
  }

  function subscribe(listener: (state: T, description?: string) => void) {
    if (typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function.');
    }

    if (isUpdating) {
      throw new Error(
        'You may not call store.subscribe() inside store.setState(). '
      );
    }

    listeners.push(listener);

    // run once for the first time for every one who just subscribed
    listener(innerState, lastChange.description);

    return function unsubscribe() {
      if (isUpdating) {
        throw new Error(
          'You may not unsubscribe from a store listener while the state is updating. '
        );
      }

      const index = listeners.indexOf(listener);
      listeners.splice(index, 1);
    };
  }

  if (isRenderer) {
    // send empty change to main, so main process can save the senderId
    (ipcModule as IpcRenderer).send(INTERNAL_CHANNEL, {
      patches: [],
    });
  }

  return { setState, getState, subscribe };
}
