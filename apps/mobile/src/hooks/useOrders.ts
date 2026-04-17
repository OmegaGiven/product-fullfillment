import { useCallback, useEffect, useState } from "react";

import type { ImportedOrder, RunId } from "../domain";
import { useServices } from "../providers/AppProviders";

export type EnrichedOrder = ImportedOrder & {
  linkedRunId: RunId | null;
};

export function useOrders() {
  const { storageService, orderSyncService } = useServices();
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [nextOrders, links] = await Promise.all([
      storageService.listOrders(),
      storageService.listOrderRunLinks()
    ]);
    const linkedRunIdByOrderId = new Map(links.map((link) => [link.orderId, link.runId]));
    setOrders(
      nextOrders
        .map((order) => ({
          ...order,
          linkedRunId: linkedRunIdByOrderId.get(order.id) ?? null
        }))
        .sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      )
    );
    setIsLoading(false);
  }, [storageService]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const syncAll = useCallback(async () => {
    setIsLoading(true);
    await orderSyncService.syncOrders();
    await refresh();
  }, [orderSyncService, refresh]);

  return { orders, isLoading, refresh, syncAll };
}
