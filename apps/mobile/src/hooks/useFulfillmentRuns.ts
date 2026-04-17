import { useCallback, useEffect, useState } from "react";

import type { FulfillmentRun } from "../domain";
import { useServices } from "../providers/AppProviders";

export function useFulfillmentRuns() {
  const { storageService, workflowService } = useServices();
  const [runs, setRuns] = useState<FulfillmentRun[]>([]);

  const refresh = useCallback(async () => {
    setRuns(await storageService.listRuns());
  }, [storageService]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createRun = useCallback(async () => {
    const run = await workflowService.createFulfillmentRun();
    await refresh();
    return run;
  }, [refresh, workflowService]);

  return { runs, refresh, createRun };
}
