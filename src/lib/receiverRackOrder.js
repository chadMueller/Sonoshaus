export const RACK_ORDER_STORAGE_KEY = 'sonohaus.receiverRackOrder.v1';

/** Stable segment ids — keep in sync with SonosReceiverView content map */
export const RACK_IDS = ['receiver', 'spotify'];

export const DEFAULT_RACK_ORDER = [...RACK_IDS];

/** Screen-reader / button labels per rack id */
export const RACK_ARIA_NAMES = {
  receiver: 'Sonos receiver',
  spotify: 'Library',
};

export function loadValidatedRackOrder() {
  try {
    const raw = localStorage.getItem(RACK_ORDER_STORAGE_KEY);
    if (!raw) return DEFAULT_RACK_ORDER;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== RACK_IDS.length) return DEFAULT_RACK_ORDER;
    if (new Set(parsed).size !== RACK_IDS.length) return DEFAULT_RACK_ORDER;
    for (const id of parsed) {
      if (!RACK_IDS.includes(id)) return DEFAULT_RACK_ORDER;
    }
    return parsed;
  } catch {
    return DEFAULT_RACK_ORDER;
  }
}

export function saveRackOrder(order) {
  try {
    localStorage.setItem(RACK_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {
    /* quota / private mode */
  }
}

/** Show left “Order” rails — default off so the stack stays clean */
export const RACK_REORDER_UI_STORAGE_KEY = 'sonohaus.receiverRackReorderUi.v1';

export function loadRackReorderUiVisible() {
  try {
    const raw = localStorage.getItem(RACK_REORDER_UI_STORAGE_KEY);
    return raw === '1' || raw === 'true';
  } catch {
    return false;
  }
}

export function saveRackReorderUiVisible(visible) {
  try {
    localStorage.setItem(RACK_REORDER_UI_STORAGE_KEY, visible ? '1' : '0');
  } catch {
    /* ignore */
  }
}
