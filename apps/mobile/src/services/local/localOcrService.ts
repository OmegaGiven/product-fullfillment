import type { OcrService } from "../interfaces";

import type { LocalStorageService } from "./localStorageService";

export class LocalOcrService implements OcrService {
  constructor(private storageService: LocalStorageService) {}

  async runOcr(runId: string) {
    const state = await this.storageService.getRunState(runId);
    if (!state) {
      throw new Error("Fulfillment run not found.");
    }

    const labelPhoto = state.photos.find((photo) => photo.label === "label");
    if (!labelPhoto) {
      throw new Error("Add a label photo before running OCR.");
    }

    const extraction = {
      runId,
      text:
        "Avery Stone\n145 Market Street Suite 9\nSavannah, GA 31401\n9125550133",
      recipient: {
        name: "Avery Stone",
        address1: "145 Market Street",
        address2: "Suite 9",
        city: "Savannah",
        state: "GA",
        postalCode: "31401",
        phone: "9125550133"
      },
      confidence: 0.93
    };

    await this.storageService.saveRunState({
      ...state,
      ocrExtraction: extraction
    });

    return extraction;
  }
}
