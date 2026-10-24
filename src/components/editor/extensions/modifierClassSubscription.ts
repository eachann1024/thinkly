import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";

type ModifierState = Pick<KeyboardEvent, "metaKey" | "ctrlKey">;
type ModifierListener = (state: ModifierState) => void;

type ModifierSubscription = {
  subscribe: (listener: ModifierListener) => () => void;
};

const subscriptions = new WeakMap<Document, ModifierSubscription>();
const NO_MODIFIERS: ModifierState = { metaKey: false, ctrlKey: false };

function createModifierSubscription(doc: Document): ModifierSubscription | null {
  const eventWindow = doc.defaultView;
  if (!eventWindow) return null;

  const listeners = new Set<ModifierListener>();
  let state = NO_MODIFIERS;
  const sync = (event: ModifierState) => {
    if (state.metaKey === event.metaKey && state.ctrlKey === event.ctrlKey) return;
    state = { metaKey: event.metaKey, ctrlKey: event.ctrlKey };
    for (const listener of listeners) listener(state);
  };
  const disarm = () => sync(NO_MODIFIERS);
  const onVisibility = () => {
    if (doc.hidden) disarm();
  };

  eventWindow.addEventListener("keydown", sync);
  eventWindow.addEventListener("keyup", sync);
  eventWindow.addEventListener("mousemove", sync);
  eventWindow.addEventListener("blur", disarm);
  doc.addEventListener("visibilitychange", onVisibility);

  return {
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
        if (listeners.size > 0) return;
        eventWindow.removeEventListener("keydown", sync);
        eventWindow.removeEventListener("keyup", sync);
        eventWindow.removeEventListener("mousemove", sync);
        eventWindow.removeEventListener("blur", disarm);
        doc.removeEventListener("visibilitychange", onVisibility);
        subscriptions.delete(doc);
      };
    },
  };
}

const hasOpenModifier = (state: ModifierState) => isPlatformPrimaryModifierEvent(state);

export function subscribeModifierClass(
  dom: HTMLElement,
  className: string,
  isArmed: (state: ModifierState) => boolean = hasOpenModifier,
): () => void {
  const doc = dom.ownerDocument;
  let subscription = subscriptions.get(doc);
  if (!subscription) {
    subscription = createModifierSubscription(doc) ?? undefined;
    if (subscription) subscriptions.set(doc, subscription);
  }

  let armed = dom.classList.contains(className);
  const unsubscribe = subscription?.subscribe((state) => {
    const nextArmed = isArmed(state);
    if (nextArmed === armed) return;
    armed = nextArmed;
    dom.classList.toggle(className, armed);
  });

  return () => {
    unsubscribe?.();
    dom.classList.remove(className);
  };
}
