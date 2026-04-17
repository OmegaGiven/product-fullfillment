import { useCallback, useEffect, useState } from "react";

import type { WorkflowRunState, WorkflowTemplate } from "../domain";
import { useServices } from "../providers/AppProviders";
import { DEFAULT_WORKFLOW_TEMPLATE } from "../workflow/defaultWorkflow";

export function useFulfillmentRun(runId?: string) {
  const { workflowService, storageService } = useServices();
  const [state, setState] = useState<WorkflowRunState | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!runId) {
      return;
    }

    const nextState = await workflowService.getRunState(runId);
    const nextWorkflow =
      nextState &&
      (await storageService.getWorkflowTemplate(nextState.run.workflowTemplateId));

    setState(nextState);
    setWorkflow(nextWorkflow ?? DEFAULT_WORKFLOW_TEMPLATE);
    setIsLoading(false);
  }, [runId, storageService, workflowService]);

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
