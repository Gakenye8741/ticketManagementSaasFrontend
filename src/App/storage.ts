import createWebStorage from "redux-persist/lib/storage/createWebStorage";

// Fallback used when localStorage isn't available (SSR, blocked storage)
const noopStorage = {
  getItem: (_key: string) => Promise.resolve(null),
  setItem: (_key: string, value: string) => Promise.resolve(value),
  removeItem: (_key: string) => Promise.resolve(),
};

// Some bundlers wrap this CommonJS module as { default: fn }, so unwrap it.
// This is what caused "r.getItem is not a function" in the production build.
const factory: typeof createWebStorage =
  (createWebStorage as any).default ?? createWebStorage;

const canUseStorage = (): boolean => {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
};

const storage = canUseStorage() ? factory("local") : noopStorage;

export default storage;