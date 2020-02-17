import produce, { applyPatches, Patch } from 'immer';
import { BehaviorSubject, Subscription } from 'rxjs';
import {
  ipcMain,
  webContents,
  ipcRenderer,
  IpcRenderer,
  IpcMainInvokeEvent,
  IpcRendererEvent,
} from 'electron';

export interface IChangePack {
  patches: Patch[];
  description?: string;
  broadcast: boolean;
}

export function createSharedStore<T>(state: T) {
  const innerState$ = new BehaviorSubject<T>(state);
  const change$ = new BehaviorSubject<IChangePack>({
    patches: [],
    broadcast: false,
  });
  const connected = new Set<number>(); // this is only for main process
  const isRenderer = process && process.type === 'renderer';
  const isMain = process && process.type === 'browser';
  const ipcModule = isMain ? ipcMain : ipcRenderer;
  const INTERNAL_CHANNEL = '@@ELECTRON_SHARD_STORE_IPC_CHANNEL';
  let isUpdating = false;

  ipcModule.on(
    INTERNAL_CHANNEL,
    (event: IpcMainInvokeEvent | IpcRendererEvent, change: IChangePack) => {
      isUpdating = true;
      const nextState = applyPatches(innerState$.getValue(), change.patches);

      // do not broadcast to other process if it was from ipc message
      change$.next({ ...change, broadcast: false });
      innerState$.next(nextState);

      isUpdating = false;

      if (isMain) {
        const id = (event as IpcMainInvokeEvent).sender.id; // webContent's id
        connected.add(id);
      }
    }
  );

  change$.subscribe(change => {
    if (change.patches.length === 0 || change.broadcast === false) return;

    if (isRenderer) {
      (ipcModule as IpcRenderer).send(INTERNAL_CHANNEL, change);
    } else if (isMain) {
      connected.forEach(id => {
        const wc = webContents.fromId(id);
        if (wc) {
          wc.send(INTERNAL_CHANNEL, change);
        }
      });
    }
  });

  function setState(recipe: (draft: T) => void, description?: string) {
    isUpdating = true;
    const baseState = innerState$.getValue();
    const nextState = produce(baseState, recipe, patches => {
      change$.next({ patches, description, broadcast: true });
    });

    innerState$.next(nextState);
    isUpdating = false;
    return nextState;
  }

  function getState(): T {
    if (isUpdating) {
      throw new Error(
        'You may not call store.getState() inside setState method. ' +
          'It has already received the state as an argument. '
      );
    }

    return innerState$.getValue();
  }

  function subscribe(listener: (state: T, description?: string) => void) {
    const unsub: Subscription = innerState$.subscribe(state =>
      listener(state, change$.getValue().description)
    );

    return function unsubscribe() {
      if (isUpdating) {
        throw new Error(
          'You may not unsubscribe from a store listener while the state is updating. '
        );
      }

      unsub.unsubscribe();
    };
  }

  return { setState, getState, subscribe };
}
