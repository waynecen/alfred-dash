import '@testing-library/jest-dom/vitest';

// The server tests run in Node (their files say `@vitest-environment node`) and share this file,
// so everything below that needs a browser only runs when there is a window.
if (typeof window !== 'undefined') {
  // jsdom has no matchMedia; App uses it to pick the starting theme.
  window.matchMedia =
    window.matchMedia ||
    ((query) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }));

  // Newer Node versions define their own global localStorage that shadows jsdom's and is
  // undefined without a flag, so install a small in-memory replacement.
  // It extends Storage.prototype so tests can still spy on Storage.prototype.setItem.
  const store = new Map();
  Storage.prototype.getItem = (key) => (store.has(key) ? store.get(key) : null);
  Storage.prototype.setItem = (key, value) => void store.set(key, String(value));
  Storage.prototype.removeItem = (key) => void store.delete(key);
  Storage.prototype.clear = () => store.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    value: Object.create(Storage.prototype),
    configurable: true,
  });

  // Start every test with empty storage so saved tasks/theme never leak between tests.
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  // jsdom has no PointerEvent. This stand-in keeps the pointer position that the drag tests send.
  if (!window.PointerEvent) {
    window.PointerEvent = class PointerEvent extends MouseEvent {
      constructor(type, init = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
      }
    };
  }
}
