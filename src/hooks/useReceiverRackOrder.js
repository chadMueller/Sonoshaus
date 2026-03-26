import { useCallback, useEffect, useState } from 'react';
import {
  loadRackReorderUiVisible,
  loadValidatedRackOrder,
  saveRackOrder,
  saveRackReorderUiVisible,
} from '../lib/receiverRackOrder.js';

export function useReceiverRackOrder() {
  const [order, setOrder] = useState(loadValidatedRackOrder);
  const [reorderUiVisible, setReorderUiVisible] = useState(loadRackReorderUiVisible);

  useEffect(() => {
    saveRackOrder(order);
  }, [order]);

  useEffect(() => {
    saveRackReorderUiVisible(reorderUiVisible);
  }, [reorderUiVisible]);

  const moveRack = useCallback((id, direction) => {
    setOrder((prev) => {
      const i = prev.indexOf(id);
      if (i === -1) return prev;
      const j = direction === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const toggleReorderUi = useCallback(() => {
    setReorderUiVisible((v) => !v);
  }, []);

  return { order, moveRack, reorderUiVisible, toggleReorderUi };
}
