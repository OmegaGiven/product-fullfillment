import { useCallback, useEffect, useState } from "react";

import type { ImportedOrder } from "../domain";
import { useServices } from "../providers/AppProviders";

export function useOrders() {
  const { storageService, orderSyncService } = useServices();
  const [orders, setOrders] = useState<ImportedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const nextOrders = await storageService.listOrders();
    setOrders(
      [...nextOrders].sort(
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
