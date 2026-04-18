import { Platform } from "react-native";

import type {
  Address,
  FulfillmentPhoto,
  FulfillmentId,
  OcrExtraction,
} from "../../domain";
import type { OcrService } from "../interfaces";

import type { LocalStorageService } from "./localStorageService";
import {
  estimateConfidence,
  normalizeWhitespace,
  parseRecipient,
  scoreRecognizedPhoto
} from "./ocrParsing";

type RecognizedPhoto = {
  photo: FulfillmentPhoto;
  text: string;
  recipient: Partial<Address>;
  score: number;
};

async function recognizePhoto(photo: FulfillmentPhoto): Promise<RecognizedPhoto | null> {
  const TextRecognition = (await import("@react-native-ml-kit/text-recognition")).default;
  const result = await TextRecognition.recognize(photo.uri);
  const text = normalizeWhitespace(result.text.replace(/\n{2,}/g, "\n"));

  if (!text) {
    return null;
  }

  const recipient = parseRecipient(result.text);
  return {
    photo,
    text: result.text,
    recipient,
    score: scoreRecognizedPhoto(result.text, recipient, photo)
  };
}

export class LocalOcrService implements OcrService {
  constructor(private storageService: LocalStorageService) {}

  async runOcr(fulfillmentId: FulfillmentId): Promise<OcrExtraction> {
    const state = await this.storageService.getRunState(fulfillmentId);
    if (!state) {
      throw new Error("Fulfillment run not found.");
    }

    if (state.photos.length === 0) {
      throw new Error("Add photos before running OCR.");
    }

    if (Platform.OS === "web") {
      throw new Error("OCR is available only in native iOS and Android builds.");
    }

    let recognizedPhotos: RecognizedPhoto[] = [];
    try {
      recognizedPhotos = (
        await Promise.all(state.photos.map((photo) => recognizePhoto(photo)))
      ).filter((value): value is RecognizedPhoto => !!value);
    } catch (error) {
      const message = (error as Error).message;
      if (message.includes("doesn't seem to be linked")) {
        throw new Error(
          "Native OCR module is not linked yet. Rebuild the iOS or Android app after installing the OCR package."
        );
      }
      throw error;
    }

    if (recognizedPhotos.length === 0) {
      throw new Error("No readable text was found in the captured photos.");
    }

    const best = recognizedPhotos.sort((a, b) => b.score - a.score)[0];
    const extraction: OcrExtraction = {
      fulfillmentId,
      sourcePhotoId: best.photo.id,
      text: best.text,
      recipient: best.recipient,
      confidence: estimateConfidence(best)
    };

    await this.storageService.saveRunState({
      ...state,
      ocrExtraction: extraction
    });

    return extraction;
  }
}
