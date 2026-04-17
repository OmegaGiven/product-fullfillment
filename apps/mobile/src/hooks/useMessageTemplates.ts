import { useCallback, useEffect, useState } from "react";

import type { MessageTemplate } from "../domain";
import { useServices } from "../providers/AppProviders";

export function useMessageTemplates() {
  const { storageService } = useServices();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);

  const refresh = useCallback(async () => {
    const rows = await storageService.listMessageTemplates();
    setTemplates(rows.sort((a, b) => a.name.localeCompare(b.name)));
  }, [storageService]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveTemplate = useCallback(
    async (template: MessageTemplate) => {
      await storageService.saveMessageTemplate(template);
      await refresh();
      return template;
    },
    [refresh, storageService]
  );

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      await storageService.deleteMessageTemplate(templateId);
      await refresh();
    },
    [refresh, storageService]
  );

  return { templates, refresh, saveTemplate, deleteTemplate };
}
