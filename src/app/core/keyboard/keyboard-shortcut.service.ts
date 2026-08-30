import { Injectable, ElementRef } from '@angular/core';
import { fromEvent, type Subscription } from 'rxjs';

/**
 * Centralized keyboard-shortcut architecture.
 *
 * There is exactly ONE document-level keydown listener (owned by this singleton
 * service). Every screen registers its shortcuts through `register()` instead of
 * attaching its own `@HostListener`/`addEventListener`. This prevents duplicate
 * handlers and gives us a single place to apply the "typing guard" rules:
 *
 *  - A handler marked `global: true` fires regardless of where focus is
 *    (used for Ctrl+* combos, Esc, function keys, etc.).
 *  - A non-global handler is suppressed while the user is typing inside a
 *    normal editable field (INPUT/TEXTAREA) UNLESS that field lives inside a
 *    keyboard grid (`[data-kb-grid]`) or an autocomplete (`[data-kb-autocomplete]`).
 *    This lets grid/autocomplete shortcuts work inside grid inputs while still
 *    protecting free-text fields (e.g. Remarks) from accidental triggers.
 *
 * The service also collects shortcut metadata so any screen can render a
 * help/cheat-sheet overlay from `getHelp()`.
 */
export interface ShortcutConfig {
  /** Normalized combo, e.g. 'ctrl+n', 'alt+s', 'f6', 'insert', 'arrowup', 'shift+tab', 'ctrl+arrowup'. */
  combo: string;
  handler: (event: KeyboardEvent) => void;
  /** Fire even when focus is in an editable field. Default false. */
  global?: boolean;
  /** Call event.preventDefault() before invoking the handler. */
  preventDefault?: boolean;
  /** Call event.stopPropagation() before invoking the handler. */
  stopPropagation?: boolean;
  /** Human readable text for the help overlay. */
  description?: string;
  /** Group label for the help overlay (e.g. 'Purchase Entry'). */
  group?: string;
  /** Optional predicate; when it returns false the shortcut is ignored. */
  enabled?: () => boolean;
}

interface RegisteredShortcut extends ShortcutConfig {
  id: number;
}

@Injectable({ providedIn: 'root' })
export class KeyboardShortcutService {
  private readonly handlers = new Map<string, RegisteredShortcut[]>();
  private readonly helpItems: RegisteredShortcut[] = [];
  private seq = 0;
  private readonly sub: Subscription;

  constructor() {
    this.sub = fromEvent<KeyboardEvent>(document, 'keydown').subscribe((e) => this.dispatch(e));
  }

  /** Register a shortcut. Returns a deregister function. */
  register(cfg: ShortcutConfig): () => void {
    const key = cfg.combo.toLowerCase();
    const entry: RegisteredShortcut = { ...cfg, id: this.seq++ };
    const list = this.handlers.get(key) ?? [];
    list.push(entry);
    this.handlers.set(key, list);
    if (cfg.description) this.helpItems.push(entry);
    return () => this.unregister(entry.id);
  }

  unregister(id: number): void {
    for (const list of this.handlers.values()) {
      const idx = list.findIndex((h) => h.id === id);
      if (idx >= 0) {
        const [removed] = list.splice(idx, 1);
        const hi = this.helpItems.indexOf(removed);
        if (hi >= 0) this.helpItems.splice(hi, 1);
        break;
      }
    }
  }

  /** Shortcut metadata for building a help/cheat-sheet overlay. */
  getHelp(): { combo: string; description?: string; group?: string }[] {
    const seen = new Set<number>();
    const out: { combo: string; description?: string; group?: string }[] = [];
    for (const h of this.helpItems) {
      if (seen.has(h.id)) continue;
      seen.add(h.id);
      out.push({ combo: h.combo, description: h.description, group: h.group });
    }
    return out;
  }

  // ---- internals ----

  private normalize(e: KeyboardEvent): string {
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl'); // meta = Cmd on macOS
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    let key = e.key.toLowerCase();
    const map: Record<string, string> = {
      arrowup: 'arrowup',
      arrowdown: 'arrowdown',
      arrowleft: 'arrowleft',
      arrowright: 'arrowright',
      ' ': 'space',
      escape: 'escape',
      enter: 'enter',
      delete: 'delete',
      insert: 'insert',
      tab: 'tab',
      home: 'home',
      end: 'end',
    };
    key = map[key] ?? key;
    if (['control', 'alt', 'shift', 'meta'].includes(key)) return ''; // modifier only
    parts.push(key);
    return parts.join('+');
  }

  private isEditable(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) return false;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'INPUT') {
      const type = (el as HTMLInputElement).type?.toLowerCase();
      return !['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'file', 'hidden', 'image'].includes(type);
    }
    return false;
  }

  private within(target: EventTarget | null, attr: string): boolean {
    const el = target as HTMLElement | null;
    return !!el?.closest(`[${attr}]`);
  }

  private dispatch(e: KeyboardEvent): void {
    const combo = this.normalize(e);
    if (!combo) return;
    const list = this.handlers.get(combo);
    if (!list || !list.length) return;

    for (const cfg of list) {
      if (cfg.enabled && !cfg.enabled()) continue;

      const editable = this.isEditable(e.target);
      const inGrid = this.within(e.target, 'data-kb-grid');
      const inAuto = this.within(e.target, 'data-kb-autocomplete');

      // Non-global shortcuts are suppressed while typing in a normal field,
      // unless that field belongs to a keyboard grid or autocomplete.
      if (!cfg.global && editable && !inGrid && !inAuto) continue;

      if (cfg.stopPropagation) e.stopPropagation();
      if (cfg.preventDefault) e.preventDefault();
      cfg.handler(e);
      return; // first matching handler wins
    }
  }
}

/** Helper used by screens to focus an element by a [data-field] attribute. */
export function focusByField(root: ElementRef | HTMLElement, name: string): void {
  const el = root instanceof ElementRef ? root.nativeElement : root;
  const node = (el as HTMLElement).querySelector(`[data-field="${name}"]`) as HTMLElement | null;
  node?.focus();
}
