import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { FulfillmentPhoto, WorkflowTemplate, FulfillmentRun } from "../domain";
import { useFulfillmentRun } from "../hooks/useFulfillmentRun";
import { useServices } from "../providers/AppProviders";
import { colors, spacing } from "../theme";
import { createId, nowIso } from "../utils";

type Props = {
  run: FulfillmentRun;
  workflow: WorkflowTemplate;
};

export function WorkflowScreen({ run, workflow }: Props) {
  const { state, refresh } = useFulfillmentRun(run.id);
  const {
    storageService,
    workflowService,
    ocrService,
    matchService,
    messageService
  } = useServices();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!state) {
    return null;
  }

  const currentStepId = run.stepOrder[run.currentStepIndex];
  const currentStep = workflow.steps.find((step) => step.id === currentStepId);

  async function addPhoto(label: "product" | "label") {
    setError(null);
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const photo: FulfillmentPhoto = {
        id: createId("photo"),
        runId: run.id,
        uri: result.assets[0].uri,
        label,
        createdAt: nowIso()
      };

      await storageService.saveRunState({
        ...state,
        photos: [...state.photos, photo]
      });
      await refresh();
    } catch (nextError) {
      setError((nextError as Error).message);
    }
  }

  async function handleAdvance() {
    if (!currentStep) {
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      if (currentStep.type === "capture-photos") {
        const hasProduct = state.photos.some((photo) => photo.label === "product");
        const hasLabel = state.photos.some((photo) => photo.label === "label");

        if (!hasProduct || !hasLabel) {
          throw new Error("Capture at least one product photo and one label photo.");
        }
      }

      if (currentStep.type === "review-photos" && state.photos.length === 0) {
        throw new Error("Add photos before reviewing them.");
      }

      if (currentStep.type === "ocr-match") {
        await ocrService.runOcr(run.id);
        await matchService.findMatchCandidates(run.id);
      }

      if (currentStep.type === "confirm-order" && !state.run.matchedOrderId) {
        throw new Error("Select the correct matched order before continuing.");
      }

      if (currentStep.type === "preview-message") {
        await messageService.generateMessagePreview(run.id);
      }

      await workflowService.advanceStep(run.id);
      await refresh();
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setIsBusy(false);
    }
  }

  async function chooseCandidate(orderId: string) {
    setIsBusy(true);
    setError(null);
    try {
      await matchService.confirmMatchedOrder(run.id, orderId);
      await refresh();
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setIsBusy(false);
    }
  }

  async function approveAndSend() {
    if (!state.previewMessage?.channel) {
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      await messageService.approveAndSend(run.id, state.previewMessage.channel);
      await refresh();
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.progressRow}>
        {workflow.stepOrder.map((stepId, index) => {
          const step = workflow.steps.find((item) => item.id === stepId);
          const isActive = index === run.currentStepIndex;
          return (
            <View
              key={stepId}
              style={[styles.progressPill, isActive ? styles.progressPillActive : null]}
            >
              <Text style={[styles.progressText, isActive ? styles.progressTextActive : null]}>
                {index + 1}. {step?.title ?? stepId}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{currentStep?.title}</Text>
        <Text style={styles.cardBody}>{currentStep?.description}</Text>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {currentStep?.type === "capture-photos" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Photo Packet</Text>
          <Text style={styles.cardBody}>
            Add at least one product photo and one label photo before moving on.
          </Text>
          <View style={styles.buttonRow}>
            <Pressable onPress={() => addPhoto("product")} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Capture Product Photo</Text>
            </Pressable>
            <Pressable onPress={() => addPhoto("label")} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Capture Label Photo</Text>
            </Pressable>
          </View>
          {state.photos.map((photo) => (
            <Text key={photo.id} style={styles.metaText}>
              {photo.label.toUpperCase()}: {photo.uri}
            </Text>
          ))}
        </View>
      ) : null}

      {currentStep?.type === "review-photos" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Photo Review</Text>
          {state.photos.length === 0 ? (
            <Text style={styles.metaText}>No photos captured yet.</Text>
          ) : (
            state.photos.map((photo) => (
              <Text key={photo.id} style={styles.metaText}>
                {photo.label.toUpperCase()}: {photo.uri}
              </Text>
            ))
          )}
        </View>
      ) : null}

      {currentStep?.type === "confirm-order" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Match Candidates</Text>
          {state.candidates.map((candidate) => (
            <Pressable
              key={candidate.orderId}
              onPress={() => chooseCandidate(candidate.orderId)}
              style={styles.candidateRow}
            >
              <Text style={styles.candidateTitle}>{candidate.orderId}</Text>
              <Text style={styles.metaText}>
                Confidence: {(candidate.confidence * 100).toFixed(0)}%
              </Text>
              <Text style={styles.metaText}>{candidate.reasons.join(" ")}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {currentStep?.type === "preview-message" || currentStep?.type === "approve-send" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Message Preview</Text>
          {state.previewMessage ? (
            <>
              <Text style={styles.metaText}>Channel: {state.previewMessage.channel}</Text>
              <Text style={styles.metaText}>Subject: {state.previewMessage.subject}</Text>
              <Text style={styles.cardBody}>{state.previewMessage.body}</Text>
            </>
          ) : (
            <Text style={styles.metaText}>Generate the preview from the prior step.</Text>
          )}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Run State</Text>
        <Text style={styles.metaText}>Matched order: {state.run.matchedOrderId ?? "None"}</Text>
        <Text style={styles.metaText}>
          Approval: {state.approval.approvedAt ? `approved at ${state.approval.approvedAt}` : "pending"}
        </Text>
      </View>

      {currentStep?.type === "approve-send" ? (
        <Pressable onPress={approveAndSend} style={styles.primaryButton} disabled={isBusy}>
          <Text style={styles.primaryButtonText}>
            {isBusy ? "Sending..." : "Approve And Send"}
          </Text>
        </Pressable>
      ) : (
        <Pressable onPress={handleAdvance} style={styles.primaryButton} disabled={isBusy}>
          <Text style={styles.primaryButtonText}>
            {isBusy ? "Working..." : "Complete Step"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg
  },
  progressRow: {
    gap: spacing.sm
  },
  progressPill: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  progressPillActive: {
    backgroundColor: colors.primary
  },
  progressText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600"
  },
  progressTextActive: {
    color: colors.surface
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  cardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700"
  },
  cardBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22
  },
  errorCard: {
    backgroundColor: "#fff2ef",
    borderColor: colors.danger,
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md
  },
  errorText: {
    color: colors.danger,
    fontWeight: "600"
  },
  metaText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  buttonRow: {
    gap: spacing.sm
  },
  secondaryButton: {
    backgroundColor: "#e7efe9",
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: "700"
  },
  candidateRow: {
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  candidateTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: spacing.md
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "700"
  }
});
