import { useEffect, type RefObject } from 'react';
import {
  createContentProtectionHandlers,
  type ContentProtectionPolicyOptions,
} from '../lib/contentProtection';

export interface UseContentProtectionOptions extends ContentProtectionPolicyOptions {
  enabled?: boolean;
}

/**
 * Lightweight, non-invasive content deterrence hook.
 * Attaches scoped contextmenu, dragstart, selectstart, copy/cut, and copy-shortcut
 * guards while leaving inputs, textareas, forms, links, buttons, and screen readers intact.
 */
export function useContentProtection(
  containerRef: RefObject<HTMLElement | null>,
  options: UseContentProtectionOptions = {}
) {
  const {
    enabled = true,
    blockContextMenu = true,
    blockCopy = true,
    blockDrag = true,
    blockSelection = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const handlers = createContentProtectionHandlers(() => containerRef.current, {
      blockContextMenu,
      blockCopy,
      blockDrag,
      blockSelection,
    });

    const targetEl: HTMLElement | Document = containerRef.current ?? document;

    targetEl.addEventListener('contextmenu', handlers.handleContextMenu);
    targetEl.addEventListener('dragstart', handlers.handleDragStart);
    targetEl.addEventListener('selectstart', handlers.handleSelectStart);
    document.addEventListener('copy', handlers.handleCopyOrCut);
    document.addEventListener('cut', handlers.handleCopyOrCut);
    document.addEventListener('keydown', handlers.handleKeyDown);

    return () => {
      targetEl.removeEventListener('contextmenu', handlers.handleContextMenu);
      targetEl.removeEventListener('dragstart', handlers.handleDragStart);
      targetEl.removeEventListener('selectstart', handlers.handleSelectStart);
      document.removeEventListener('copy', handlers.handleCopyOrCut);
      document.removeEventListener('cut', handlers.handleCopyOrCut);
      document.removeEventListener('keydown', handlers.handleKeyDown);
    };
  }, [containerRef, enabled, blockContextMenu, blockCopy, blockDrag, blockSelection]);
}
