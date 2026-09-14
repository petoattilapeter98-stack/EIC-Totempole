import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// RTL does not auto-clean when `globals` are enabled via projects config,
// so unmount explicitly. This also means every test exercises the unmount
// path — which is where the timer/listener cleanup assertions live.
afterEach(() => {
  cleanup();
});

/**
 * jsdom (the version pinned in this project) does not implement PointerEvent
 * at all — `new PointerEvent(...)` throws ReferenceError, and
 * `@testing-library/dom`'s `fireEvent.pointerDown`/etc. silently fall back to
 * a plain Event with none of `pointerId`, `pointerType` or `button` set. Any
 * component that branches on those fields (the 004-tic-tac-toe board input
 * rules — see contracts/view-states.md §3 — being the first, but not
 * necessarily the last) would see every fireEvent.pointer* call as a no-op in
 * the `unit` project while working correctly in real Chromium (the `layout`
 * project) and on the device. This is the standard, widely-used polyfill
 * (the same approach Radix UI and MUI use in their own jsdom test setups):
 * a thin PointerEvent-shaped subclass of MouseEvent, registered globally so
 * every unit test — not just this feature's — gets working pointer events.
 */
if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    public readonly pointerId: number;
    public readonly pointerType: string;
    public readonly isPrimary: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
      this.pointerType = params.pointerType ?? '';
      this.isPrimary = params.isPrimary ?? false;
    }
  }

  // @ts-expect-error -- assigning the polyfill onto the global PointerEvent slot
  globalThis.PointerEvent = PointerEventPolyfill;
}

// jsdom also has no pointer-capture implementation at all (setPointerCapture/
// releasePointerCapture/hasPointerCapture are simply absent from
// HTMLElement.prototype). Stubbed globally as no-ops so calling code does not
// throw; the capture semantics themselves are exercised in the layout
// project (real Chromium) and validated by hand on the device (quickstart
// §2.3), not by these stubs.
HTMLElement.prototype.setPointerCapture ??= function setPointerCapture() {};
HTMLElement.prototype.releasePointerCapture ??= function releasePointerCapture() {};
HTMLElement.prototype.hasPointerCapture ??= function hasPointerCapture() {
  return false;
};
