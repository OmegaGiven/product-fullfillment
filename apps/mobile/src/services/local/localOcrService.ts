import TextRecognition from "@react-native-ml-kit/text-recognition";
import { Platform } from "react-native";

import type {
  Address,
  FulfillmentPhoto,
  OcrExtraction,
  RunId
} from "../../domain";
import type { OcrService } from "../interfaces";

import type { LocalStorageService } from "./localStorageService";

type RecognizedPhoto = {
  photo: FulfillmentPhoto;
  text: string;
  recipient: Partial<Address>;
  score: number;
};

const ADDRESS_HINTS = [
  "street",
  "st",
  "road",
  "rd",
  "avenue",
  "ave",
  "boulevard",
  "blvd",
  "lane",
  "ln",
  "drive",
  "dr",
  "court",
  "ct",
  "circle",
  "cir",
  "parkway",
  "pkwy",
  "suite",
  "ste",
  "unit",
  "apt",
  "apartment",
  "po box"
];

const LABEL_NOISE = [
  "ship to",
  "deliver to",
  "recipient",
  "tracking",
  "usps",
  "ups",
  "fedex",
  "from",
  "order",
  "priority mail",
  "ground advantage"
];

const PHONE_REGEX =
  /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanupLine(value: string) {
  return normalizeWhitespace(value.replace(/[|_*~`]/g, " "));
}

function compactPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

function splitRecognizedLines(text: string) {
  return text
    .split(/\r?\n/)
    .map(cleanupLine)
    .filter(Boolean);
}

function looksLikeNoise(line: string) {
  const lower = line.toLowerCase();
  return LABEL_NOISE.some((hint) => lower.includes(hint));
}

function looksLikeAddressLine(line: string) {
  const lower = line.toLowerCase();
  const hasStreetNumber = /^\d{1,6}\s+/.test(lower);
  const hasHint = ADDRESS_HINTS.some(
    (hint) => lower.includes(` ${hint}`) || lower.startsWith(`${hint} `)
  );
  return hasStreetNumber || hasHint;
}

function looksLikeAddressTwoLine(line: string) {
  return /^(apt|apartment|unit|suite|ste|floor|fl)\b/i.test(line);
}

function looksLikeNameLine(line: string) {
  if (looksLikeNoise(line) || looksLikeAddressLine(line)) {
    return false;
  }

  if (/\d/.test(line)) {
    return false;
  }

  const words = line.split(" ").filter(Boolean);
  if (words.length < 2 || words.length > 4) {
    return false;
  }

  return words.every((word) => /^[A-Za-z][A-Za-z'.-]*$/.test(word));
}

function parseCityStatePostal(line: string) {
  const match = line.match(
    /^(.+?)(?:,)?\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i
  );

  if (!match) {
    return null;
  }

  return {
    city: cleanupLine(match[1]),
    state: match[2].toUpperCase(),
    postalCode: match[3]
  };
}

function parseRecipient(text: string): Partial<Address> {
  const lines = splitRecognizedLines(text);
  const recipient: Partial<Address> = {};

  const phoneLineIndex = lines.findIndex((line) => PHONE_REGEX.test(line));
  if (phoneLineIndex >= 0) {
    const phoneMatch = lines[phoneLineIndex].match(PHONE_REGEX);
    if (phoneMatch) {
      recipient.phone = compactPhone(phoneMatch[0]);
      lines.splice(phoneLineIndex, 1);
    }
  }

  const cityStateIndex = lines.findIndex((line) => !!parseCityStatePostal(line));
  if (cityStateIndex >= 0) {
    const cityStatePostal = parseCityStatePostal(lines[cityStateIndex]);
    if (cityStatePostal) {
      recipient.city = cityStatePostal.city;
      recipient.state = cityStatePostal.state;
      recipient.postalCode = cityStatePostal.postalCode;
    }
  }

  const addressIndex = lines.findIndex(looksLikeAddressLine);
  if (addressIndex >= 0) {
    recipient.address1 = lines[addressIndex];

    const nextLine = lines[addressIndex + 1];
    if (
      nextLine &&
      nextLine !== lines[cityStateIndex] &&
      looksLikeAddressTwoLine(nextLine)
    ) {
      recipient.address2 = nextLine;
    }

    const nameCandidates = lines.slice(0, addressIndex).filter(looksLikeNameLine);
    if (nameCandidates.length > 0) {
      recipient.name = nameCandidates[nameCandidates.length - 1];
    }
  } else {
    const nameLine = lines.find(looksLikeNameLine);
    if (nameLine) {
      recipient.name = nameLine;
    }
  }

  if (!recipient.name) {
    const fallbackName = lines.find((line) => !looksLikeNoise(line) && !/\d/.test(line));
    if (fallbackName) {
      recipient.name = fallbackName;
    }
  }

  return recipient;
}

function scoreRecognition(text: string, recipient: Partial<Address>, photo: FulfillmentPhoto) {
  let score = photo.label === "label" ? 2.5 : 0;
  const lines = splitRecognizedLines(text);

  if (text.length > 24) {
    score += 1;
  }
  if (lines.length >= 3) {
    score += 1;
  }
  if (recipient.name) {
    score += 2;
  }
  if (recipient.address1) {
    score += 3;
  }
  if (recipient.city && recipient.state && recipient.postalCode) {
    score += 3;
  }
  if (recipient.phone) {
    score += 1;
  }

  return score;
}

function estimateConfidence(best: RecognizedPhoto) {
  let confidence = 0.25;

  if (best.recipient.name) {
    confidence += 0.15;
  }
  if (best.recipient.address1) {
    confidence += 0.2;
  }
  if (best.recipient.city && best.recipient.state && best.recipient.postalCode) {
    confidence += 0.25;
  }
  if (best.recipient.phone) {
    confidence += 0.1;
  }
  if (best.photo.label === "label") {
    confidence += 0.1;
  }
  if (best.score >= 8) {
    confidence += 0.1;
  }

  return Math.min(confidence, 0.98);
}

async function recognizePhoto(photo: FulfillmentPhoto): Promise<RecognizedPhoto | null> {
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
    score: scoreRecognition(result.text, recipient, photo)
  };
}

export class LocalOcrService implements OcrService {
  constructor(private storageService: LocalStorageService) {}

  async runOcr(runId: RunId): Promise<OcrExtraction> {
    const state = await this.storageService.getRunState(runId);
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
      runId,
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
