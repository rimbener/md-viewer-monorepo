/**
 * DOM queries shared by the rendering tests.
 */

/** Every text node outside a button, in document order. */
export function strings(root: Element): string[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const out: string[] = [];
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (node.parentElement?.closest('button') === null) {
      out.push(node.nodeValue ?? '');
    }
  }
  return out;
}

/** The first element whose own last text is exactly `content`. */
export function textFor(root: Element, content: string): HTMLElement {
  const match = Array.from(root.querySelectorAll<HTMLElement>('*')).find(
    element => {
      const last = element.lastChild;
      return last?.nodeType === Node.TEXT_NODE && last.nodeValue === content;
    },
  );
  if (match === undefined) {
    throw new Error(`no element rendering ${JSON.stringify(content)}`);
  }
  return match;
}

/** `value` for `property` as the DOM normalises it, e.g. hex to `rgb()`. */
export function css(property: 'color' | 'fontFamily', value: string): string {
  const probe = document.createElement('div');
  probe.style[property] = value;
  return probe.style[property];
}

/** A pixel size from an inline style, as a number. */
export function px(value: string): number {
  return parseFloat(value);
}
