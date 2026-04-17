import { useCallback, useEffect, useState } from "react";

import type { FulfillmentId, WorkflowRunState, WorkflowTemplate } from "../domain";
import { useServices } from "../providers/AppProviders";
import { DEFAULT_WORKFLOW_TEMPLATE } from "../workflow/defaultWorkflow";

export function useFulfillmentRun(fulfillmentId?: FulfillmentId) {
  const { workflowService, storageService } = useServices();
  const [state, setState] = useState<WorkflowRunState | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!fulfillmentId) {
      return;
    }

    const nextState = await workflowService.getRunState(fulfillmentId);
    const nextWorkflow =
      nextState &&
      (await storageService.getWorkflowTemplate(nextState.run.workflowTemplateId));

    setState(nextState);
    setWorkflow(nextWorkflow ?? DEFAULT_WORKFLOW_TEMPLATE);
    setIsLoading(false);
  }, [fulfillmentId, storageService, workflowService]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    run: state?.run ?? null,
    workflow,
    state,
    isLoading,
    refresh
  };
}
