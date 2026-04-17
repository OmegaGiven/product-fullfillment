import { useCallback, useEffect, useState } from "react";

import type { FulfillmentRun, RecordId } from "../domain";
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

  const createRun = useCallback(async (templateId?: RecordId) => {
    const run = await workflowService.createFulfillmentRun(templateId);
    await refresh();
    return run;
  }, [refresh, workflowService]);

  const deleteRun = useCallback(async (fulfillmentId: FulfillmentRun["id"]) => {
    await workflowService.deleteFulfillmentRun(fulfillmentId);
    await refresh();
  }, [refresh, workflowService]);

  return { runs, refresh, createRun, deleteRun };
}
