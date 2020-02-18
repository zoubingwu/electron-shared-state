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
  senderId?: number;
}

export function createSharedStore<T>(state: T) {
  const innerState$ = new BehaviorSubject<T>(state);
  const change$ = new BehaviorSubject<IChangePack>({
    patches: [],
  });
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

      const nextState = applyPatches(innerState$.getValue(), change.patches);
      change$.next({
        ...change,
        senderId: isMain ? (event as IpcMainInvokeEvent).sender.id : -1, // renderer always receives from main so id is -1
      });

      innerState$.next(nextState);

      isUpdating = false;
    }
  );

  change$.subscribe(change => {
    if (change.patches.length === 0) {
      return;
    }

    if (isRenderer) {
      // if change was from main, we don't send it to main again
      change.senderId !== -1 &&
        (ipcModule as IpcRenderer).send(INTERNAL_CHANNEL, change);
    } else if (isMain) {
      connected.forEach(id => {
        // do not broadcast to sender process
        if (id === change.senderId) {
          return;
        }

        const wc = webContents.fromId(id);
        if (wc) {
          wc.send(INTERNAL_CHANNEL, change);
        }
      });
    }
  });

  function setState(recipe: (draft: T) => void, description?: string) {
    isUpdating = true;
    const nextState = produce(innerState$.getValue(), recipe, patches => {
      change$.next({ patches, description });
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

  if (isRenderer) {
    // send empty change to main, so main process can save the senderId
    (ipcModule as IpcRenderer).send(INTERNAL_CHANNEL, {
      patches: [],
    });
  }

  return { setState, getState, subscribe };
}
