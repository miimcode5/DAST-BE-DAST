export const EDITABLE_TARGET_SELECTOR =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"], [data-allow-copy="true"]';

export const PROTECTED_MEDIA_SELECTOR =
  'img, picture, svg, [data-protected-media="true"]';

interface ElementLike {
  closest?: (selector: string) => unknown;
  isContentEditable?: boolean;
  ownerDocument?: Document;
  parentElement?: ElementLike | null;
}

function getClosestElement(target: EventTarget | null): ElementLike | null {
  if (!target || typeof target !== 'object') return null;

  if (typeof Element !== 'undefined' && target instanceof Element) {
    return target;
  }
  if (typeof Node !== 'undefined' && target instanceof Node) {
    return target.parentElement;
  }

  // Fallback for lightweight structural / test DOM mocks
  const candidate = target as ElementLike;
  if (typeof candidate.closest === 'function') {
    return candidate;
  }
  if (candidate.parentElement) {
    return candidate.parentElement;
  }
  return null;
}

/**
 * Checks whether an event target belongs to an editable field or an element
 * explicitly marked as copyable (`data-allow-copy="true"`).
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  const el = getClosestElement(target);
  if (!el) return false;
  if (typeof el.closest === 'function' && el.closest(EDITABLE_TARGET_SELECTOR)) {
    return true;
  }
  if (el.isContentEditable === true) {
    return true;
  }
  return false;
}

/**
 * Checks whether the current active element or active DOM selection sits inside
 * an editable input/textarea/contenteditable field.
 */
export function isSelectionInsideEditable(doc: Document | null = typeof document !== 'undefined' ? document : null): boolean {
  if (!doc) return false;
  if (isEditableTarget(doc.activeElement)) {
    return true;
  }

  const selection = doc.getSelection?.();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  return isEditableTarget(selection.anchorNode) || isEditableTarget(selection.focusNode);
}

/**
 * Checks whether a target is a protected image/media element (or its shield).
 */
export function isProtectedMediaTarget(target: EventTarget | null): boolean {
  const el = getClosestElement(target);
  if (!el) return false;
  return Boolean(typeof el.closest === 'function' && el.closest(PROTECTED_MEDIA_SELECTOR));
}

/**
 * Detects Ctrl+C / Cmd+C / Ctrl+X / Cmd+X copy/cut shortcuts across layouts,
 * including Persian keyboard layout on Windows where physical KeyC maps to 'ز'.
 */
export function isCopyOrCutShortcut(
  event: Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey' | 'key' | 'code'>
): boolean {
  if ((!event.ctrlKey && !event.metaKey) || event.altKey) {
    return false;
  }

  if (event.code === 'KeyC' || event.code === 'KeyX') {
    return true;
  }

  const normalizedKey = (event.key || '').toLowerCase();
  return normalizedKey === 'c' || normalizedKey === 'x';
}

export interface ContentProtectionPolicyOptions {
  blockContextMenu?: boolean;
  blockCopy?: boolean;
  blockDrag?: boolean;
  blockSelection?: boolean;
}

export interface ContentProtectionHandlers {
  handleContextMenu: (event: MouseEvent | Event) => void;
  handleDragStart: (event: DragEvent | Event) => void;
  handleSelectStart: (event: Event) => void;
  handleCopyOrCut: (event: ClipboardEvent | Event) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
}

export interface ScopeContainer {
  contains: (other: Node | null) => boolean;
}

/**
 * Builds deterministic event handlers scoped to `getContainer()` (or full document).
 * Never interferes with editable controls, forms, buttons, links, or screen readers.
 */
export function createContentProtectionHandlers(
  getContainer: () => ScopeContainer | null,
  options: ContentProtectionPolicyOptions = {}
): ContentProtectionHandlers {
  const {
    blockContextMenu = true,
    blockCopy = true,
    blockDrag = true,
    blockSelection = true,
  } = options;

  const isInsideScope = (target: EventTarget | null): boolean => {
    const container = getContainer();
    if (!container) return true;
    const el = getClosestElement(target);
    if (!el) return false;
    return container.contains(el as unknown as Node);
  };

  return {
    handleContextMenu(event) {
      if (!blockContextMenu) return;
      if (!isInsideScope(event.target)) return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    },

    handleDragStart(event) {
      if (!blockDrag) return;
      if (!isInsideScope(event.target)) return;
      if (isEditableTarget(event.target)) return;
      if (isProtectedMediaTarget(event.target) || blockSelection) {
        event.preventDefault();
      }
    },

    handleSelectStart(event) {
      if (!blockSelection) return;
      if (!isInsideScope(event.target)) return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
    },

    handleCopyOrCut(event) {
      if (!blockCopy) return;
      if (isEditableTarget(event.target)) return;
      const fallbackDoc = typeof document !== 'undefined' ? document : null;
      const ownerDoc = getClosestElement(event.target)?.ownerDocument ?? fallbackDoc;
      if (isSelectionInsideEditable(ownerDoc)) return;
      if (!isInsideScope(event.target) && !isInsideScope(ownerDoc?.activeElement ?? null)) return;
      event.preventDefault();
    },

    handleKeyDown(event) {
      if (!blockCopy) return;
      if (!isCopyOrCutShortcut(event)) return;
      if (isEditableTarget(event.target)) return;
      const fallbackDoc = typeof document !== 'undefined' ? document : null;
      const ownerDoc = getClosestElement(event.target)?.ownerDocument ?? fallbackDoc;
      if (isSelectionInsideEditable(ownerDoc)) return;
      if (!isInsideScope(event.target) && !isInsideScope(ownerDoc?.activeElement ?? null)) return;
      event.preventDefault();
    },
  };
}
