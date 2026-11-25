import { describe, expect, it } from 'vitest';
import {
  createContentProtectionHandlers,
  EDITABLE_TARGET_SELECTOR,
  isCopyOrCutShortcut,
  isEditableTarget,
  isProtectedMediaTarget,
  PROTECTED_MEDIA_SELECTOR,
} from '../contentProtection';

interface MockEl {
  tag: string;
  isContentEditable?: boolean;
  attrs?: Record<string, string>;
  ownerDocument?: Document;
  closest: (selector: string) => MockEl | null;
}

function makeMockEl(
  tag: string,
  opts: { isContentEditable?: boolean; attrs?: Record<string, string>; activeEl?: MockEl | null } = {}
): MockEl {
  const ownerDoc = {
    activeElement: opts.activeEl ?? null,
    getSelection: () => ({ rangeCount: 0, anchorNode: null, focusNode: null }),
  } as unknown as Document;

  const el: MockEl = {
    tag: tag.toLowerCase(),
    isContentEditable: opts.isContentEditable,
    attrs: opts.attrs,
    ownerDocument: ownerDoc,
    closest(selector: string) {
      const tokens = selector.split(',').map((s) => s.trim());
      for (const token of tokens) {
        if (token === el.tag) return el;
        if (token.startsWith('[') && token.endsWith(']')) {
          const inner = token.slice(1, -1);
          const [key, rawVal] = inner.split('=');
          const val = rawVal?.replace(/^"|"$/g, '');
          if (el.attrs && key in el.attrs) {
            if (val === undefined || el.attrs[key] === val) return el;
          }
        }
      }
      return null;
    },
  };
  return el;
}

function makeMockEvent(target: MockEl, extra: Record<string, unknown> = {}) {
  let defaultPrevented = false;
  return {
    target: target as unknown as EventTarget,
    preventDefault() {
      defaultPrevented = true;
    },
    get defaultPrevented() {
      return defaultPrevented;
    },
    ...extra,
  };
}

describe('content protection utilities & handlers', () => {
  it('recognizes copy/cut shortcuts on English and Persian keyboard layouts without blocking paste/nav', () => {
    expect(isCopyOrCutShortcut({ ctrlKey: true, metaKey: false, altKey: false, key: 'c', code: 'KeyC' })).toBe(true);
    expect(isCopyOrCutShortcut({ ctrlKey: false, metaKey: true, altKey: false, key: 'C', code: 'KeyC' })).toBe(true);
    expect(isCopyOrCutShortcut({ ctrlKey: true, metaKey: false, altKey: false, key: 'ز', code: 'KeyC' })).toBe(true);
    expect(isCopyOrCutShortcut({ ctrlKey: true, metaKey: false, altKey: false, key: 'x', code: 'KeyX' })).toBe(true);

    expect(isCopyOrCutShortcut({ ctrlKey: true, metaKey: false, altKey: false, key: 'v', code: 'KeyV' })).toBe(false);
    expect(isCopyOrCutShortcut({ ctrlKey: true, metaKey: false, altKey: false, key: 'a', code: 'KeyA' })).toBe(false);
    expect(isCopyOrCutShortcut({ ctrlKey: false, metaKey: false, altKey: false, key: 'F12', code: 'F12' })).toBe(false);
    expect(isCopyOrCutShortcut({ ctrlKey: true, metaKey: false, altKey: true, key: 'c', code: 'KeyC' })).toBe(false);
  });

  it('detects editable controls vs protected media/content targets accurately', () => {
    const input = makeMockEl('input');
    const textarea = makeMockEl('textarea');
    const editableDiv = makeMockEl('div', { isContentEditable: true });
    const allowCopySpan = makeMockEl('span', { attrs: { 'data-allow-copy': 'true' } });
    const img = makeMockEl('img');
    const shield = makeMockEl('span', { attrs: { 'data-protected-media': 'true' } });
    const paragraph = makeMockEl('p');

    expect(isEditableTarget(input as unknown as EventTarget)).toBe(true);
    expect(isEditableTarget(textarea as unknown as EventTarget)).toBe(true);
    expect(isEditableTarget(editableDiv as unknown as EventTarget)).toBe(true);
    expect(isEditableTarget(allowCopySpan as unknown as EventTarget)).toBe(true);
    expect(isEditableTarget(img as unknown as EventTarget)).toBe(false);
    expect(isEditableTarget(paragraph as unknown as EventTarget)).toBe(false);

    expect(isProtectedMediaTarget(img as unknown as EventTarget)).toBe(true);
    expect(isProtectedMediaTarget(shield as unknown as EventTarget)).toBe(true);
    expect(isProtectedMediaTarget(paragraph as unknown as EventTarget)).toBe(false);
    expect(EDITABLE_TARGET_SELECTOR).toContain('textarea');
    expect(PROTECTED_MEDIA_SELECTOR).toContain('img');
  });

  it('blocks right-click, dragstart, selectstart, copy, and Ctrl+C on protected images and text', () => {
    const img = makeMockEl('img');
    const shield = makeMockEl('span', { attrs: { 'data-protected-media': 'true' } });
    const text = makeMockEl('p');
    const scopeElements = new Set<unknown>([img, shield, text]);

    const handlers = createContentProtectionHandlers(() => ({
      contains: (el) => scopeElements.has(el),
    }));

    const ctxImg = makeMockEvent(img);
    handlers.handleContextMenu(ctxImg as unknown as Event);
    expect(ctxImg.defaultPrevented).toBe(true);

    const ctxShield = makeMockEvent(shield);
    handlers.handleContextMenu(ctxShield as unknown as Event);
    expect(ctxShield.defaultPrevented).toBe(true);

    const dragImg = makeMockEvent(img);
    handlers.handleDragStart(dragImg as unknown as Event);
    expect(dragImg.defaultPrevented).toBe(true);

    const selText = makeMockEvent(text);
    handlers.handleSelectStart(selText as unknown as Event);
    expect(selText.defaultPrevented).toBe(true);

    const copyText = makeMockEvent(text);
    handlers.handleCopyOrCut(copyText as unknown as Event);
    expect(copyText.defaultPrevented).toBe(true);

    const keyCopyText = makeMockEvent(text, {
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      key: 'c',
      code: 'KeyC',
    });
    handlers.handleKeyDown(keyCopyText as unknown as KeyboardEvent);
    expect(keyCopyText.defaultPrevented).toBe(true);
  });

  it('never blocks contextmenu, selection, copy, or Ctrl+C inside form inputs and chat textareas', () => {
    const emailInput = makeMockEl('input');
    const chatTextarea = makeMockEl('textarea');
    const scopeElements = new Set<unknown>([emailInput, chatTextarea]);

    const handlers = createContentProtectionHandlers(() => ({
      contains: (el) => scopeElements.has(el),
    }));

    for (const target of [emailInput, chatTextarea]) {
      const ctx = makeMockEvent(target);
      handlers.handleContextMenu(ctx as unknown as Event);
      expect(ctx.defaultPrevented).toBe(false);

      const sel = makeMockEvent(target);
      handlers.handleSelectStart(sel as unknown as Event);
      expect(sel.defaultPrevented).toBe(false);

      const copy = makeMockEvent(target);
      handlers.handleCopyOrCut(copy as unknown as Event);
      expect(copy.defaultPrevented).toBe(false);

      const keyCopy = makeMockEvent(target, {
        ctrlKey: true,
        metaKey: false,
        altKey: false,
        key: 'c',
        code: 'KeyC',
      });
      handlers.handleKeyDown(keyCopy as unknown as KeyboardEvent);
      expect(keyCopy.defaultPrevented).toBe(false);
    }
  });
});
