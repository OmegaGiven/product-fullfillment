import { useCallback, useEffect, useState } from "react";

import type { WorkflowTemplate } from "../domain";
import { useServices } from "../providers/AppProviders";

export function useWorkflowTemplates() {
  const { workflowService } = useServices();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);

  const refresh = useCallback(async () => {
    setTemplates(await workflowService.listWorkflowTemplates());
  }, [workflowService]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveTemplate = useCallback(
    async (template: WorkflowTemplate) => {
      const saved = await workflowService.saveWorkflowTemplate(template);
      await refresh();
      return saved;
    },
    [refresh, workflowService]
  );

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      await workflowService.deleteWorkflowTemplate(templateId);
      await refresh();
    },
    [refresh, workflowService]
  );

  return { templates, refresh, saveTemplate, deleteTemplate };
}
