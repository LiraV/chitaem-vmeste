/**
 * The app was written for the Claude Artifacts sandbox, which injects a
 * `window.storage` key/value API. Outside that sandbox it does not exist, so
 * every read threw and the library came back empty on each load.
 *
 * This installs an equivalent shim backed by localStorage. It is only
 * installed when `window.storage` is missing, so the app still works unchanged
 * if it is ever run inside Artifacts again.
 */
export type KeyValueStore = {
  get(key: string): Promise<{ value: string } | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
};

declare global {
  interface Window {
    storage: KeyValueStore;
  }
}

const PREFIX = "chitaem-vmeste:";

// localStorage throws in Safari private mode and when cookies are blocked.
// Fall back to an in-memory map so the app degrades to a single session
// instead of crashing on boot.
function makeStore(): KeyValueStore {
  let backend: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  try {
    const probe = PREFIX + "__probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    backend = window.localStorage;
  } catch {
    const mem = new Map<string, string>();
    backend = {
      getItem: (k) => (mem.has(k) ? (mem.get(k) as string) : null),
      setItem: (k, v) => void mem.set(k, v),
      removeItem: (k) => void mem.delete(k),
    };
  }

  return {
    async get(key) {
      const value = backend.getItem(PREFIX + key);
      return value === null ? null : { value };
    },
    async set(key, value) {
      backend.setItem(PREFIX + key, value);
    },
    async delete(key) {
      backend.removeItem(PREFIX + key);
    },
  };
}

if (typeof window !== "undefined" && !window.storage) {
  window.storage = makeStore();
}
