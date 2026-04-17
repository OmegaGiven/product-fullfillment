import { useCallback, useEffect, useState } from "react";

import type { FulfillmentId, ImportedOrder } from "../domain";
import { useServices } from "../providers/AppProviders";

export type EnrichedOrder = ImportedOrder & {
  linkedFulfillmentId: FulfillmentId | null;
};

export function useOrders() {
  const { storageService, orderSyncService } = useServices();
  const [orders, setOrders] = useState<EnrichedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const [nextOrders, links] = await Promise.all([
      storageService.listOrders(),
      storageService.listOrderFulfillmentLinks()
    ]);
    const linkedFulfillmentIdByOrderId = new Map(
      links.map((link) => [link.orderId, link.fulfillmentId])
    );
    setOrders(
      nextOrders
        .map((order) => ({
          ...order,
          linkedFulfillmentId: linkedFulfillmentIdByOrderId.get(order.id) ?? null
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
