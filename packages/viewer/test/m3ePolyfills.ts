// jsdom lacks these browser APIs, and m3e calls them when an element connects.
const sheetText = new WeakMap<CSSStyleSheet, string>();

if (!('replaceSync' in CSSStyleSheet.prototype)) {
  Object.assign(CSSStyleSheet.prototype, {
    replaceSync(this: CSSStyleSheet, text: string) {
      sheetText.set(this, text);
    },
    replace(this: CSSStyleSheet, text: string) {
      sheetText.set(this, text);
      return Promise.resolve(this);
    },
  });
}

const adopted = new WeakMap<object, CSSStyleSheet[]>();
for (const proto of [Document.prototype, ShadowRoot.prototype]) {
  if (!('adoptedStyleSheets' in proto)) {
    Object.defineProperty(proto, 'adoptedStyleSheets', {
      configurable: true,
      get(this: object) {
        return adopted.get(this) ?? [];
      },
      set(this: object, value: CSSStyleSheet[]) {
        adopted.set(this, value);
      },
    });
  }
}

const states = new WeakMap<ElementInternals, Set<string>>();
if (!('states' in ElementInternals.prototype)) {
  Object.defineProperty(ElementInternals.prototype, 'states', {
    configurable: true,
    get(this: ElementInternals) {
      let set = states.get(this);
      if (!set) {
        set = new Set();
        states.set(this, set);
      }
      return set;
    },
  });
}

if (!('setFormValue' in ElementInternals.prototype)) {
  const validity = { valid: true } as ValidityState;
  Object.assign(ElementInternals.prototype, {
    setFormValue() {},
    setValidity() {},
    checkValidity: () => true,
    reportValidity: () => true,
  });
  for (const [key, value] of [
    ['form', null],
    ['willValidate', false],
    ['validity', validity],
    ['validationMessage', ''],
  ] as const) {
    Object.defineProperty(ElementInternals.prototype, key, {
      configurable: true,
      get: () => value,
    });
  }
}

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

if (!('showPopover' in HTMLElement.prototype)) {
  const open = new WeakSet<HTMLElement>();
  Object.assign(HTMLElement.prototype, {
    showPopover(this: HTMLElement) {
      open.add(this);
    },
    hidePopover(this: HTMLElement) {
      open.delete(this);
    },
    togglePopover(this: HTMLElement) {
      if (open.has(this)) open.delete(this);
      else open.add(this);
      return open.has(this);
    },
  });
}

if (!('showModal' in HTMLDialogElement.prototype)) {
  Object.assign(HTMLDialogElement.prototype, {
    showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
    show(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
    close(this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    },
  });
}

if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
  Object.assign(globalThis, {
    CSS: { ...(globalThis.CSS ?? {}), supports: () => false },
  });
}
