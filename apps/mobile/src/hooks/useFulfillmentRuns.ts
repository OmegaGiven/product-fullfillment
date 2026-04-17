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

  const createRun = useCallback(async (templateId?: string) => {
    const run = await workflowService.createFulfillmentRun(templateId);
    await refresh();
    return run;
  }, [refresh, workflowService]);

  const deleteRun = useCallback(async (runId: FulfillmentRun["id"]) => {
    await workflowService.deleteFulfillmentRun(runId);
    await refresh();
  }, [refresh, workflowService]);

  return { runs, refresh, createRun, deleteRun };
}
