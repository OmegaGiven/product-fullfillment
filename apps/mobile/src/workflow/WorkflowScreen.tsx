import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type {
  FulfillmentPhoto,
  FulfillmentRun,
  ImportedOrder,
  WorkflowTemplate
} from "../domain";
import { useFulfillmentRun } from "../hooks/useFulfillmentRun";
import { useAppTheme } from "../providers/AppearanceProvider";
import { useServices } from "../providers/AppProviders";
import { spacing, type AppTheme } from "../theme";
import { createId, nowIso } from "../utils";

type Props = {
  run: FulfillmentRun;
  workflow: WorkflowTemplate;
  onRunUpdated?: () => Promise<void>;
};

function formatAddress(order: ImportedOrder) {
  const address = order.shippingAddress;
  return [
    address.name,
    address.address1,
    address.address2,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.phone
  ]
    .filter(Boolean)
    .join("\n");
}

function formatRecipient(
  recipient: {
    name?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    phone?: string;
  } | null
) {
  if (!recipient) {
    return "No OCR recipient data yet.";
  }

  const cityLine = [recipient.city, recipient.state, recipient.postalCode]
    .filter(Boolean)
    .join(" ");

  return [
    recipient.name,
    recipient.address1,
    recipient.address2,
    cityLine,
    recipient.phone
  ]
    .filter(Boolean)
    .join("\n");
}

export function WorkflowScreen({ run, workflow, onRunUpdated }: Props) {
  const {
    theme: { colors }
  } = useAppTheme();
  const styles = createStyles(colors);
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
  const [orders, setOrders] = useState<ImportedOrder[]>([]);
  const [isDebugExpanded, setIsDebugExpanded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      const nextOrders = await storageService.listOrders();
      if (isMounted) {
        setOrders(nextOrders);
      }
    }

    void loadOrders();

    return () => {
      isMounted = false;
    };
  }, [storageService, state?.run.updatedAt]);

  if (!state) {
    return null;
  }

  const currentState = state;

  const currentStepId = currentState.run.stepOrder[currentState.run.currentStepIndex];
  const currentStep = workflow.steps.find((step) => step.id === currentStepId);
  const productPhotos = currentState.photos.filter((photo) => photo.label === "product");
  const labelPhotos = currentState.photos.filter((photo) => photo.label === "label");
  const matchedOrder =
    orders.find((order) => order.id === currentState.run.matchedOrderId) ?? null;

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
        ...currentState,
        photos: [...currentState.photos, photo]
      });
      await refresh();
      await onRunUpdated?.();
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
        const hasProduct = currentState.photos.some((photo) => photo.label === "product");
        const hasLabel = currentState.photos.some((photo) => photo.label === "label");

        if (!hasProduct || !hasLabel) {
          throw new Error("Capture at least one product photo and one label photo.");
        }
      }

      if (currentStep.type === "review-photos" && currentState.photos.length === 0) {
        throw new Error("Add photos before reviewing them.");
      }

      if (currentStep.type === "ocr-match") {
        await ocrService.runOcr(run.id);
        await matchService.findMatchCandidates(run.id);
      }

      if (currentStep.type === "confirm-order" && !currentState.run.matchedOrderId) {
        throw new Error("Select the correct matched order before continuing.");
      }

      if (currentStep.type === "preview-message") {
        await messageService.generateMessagePreview(run.id);
      }

      await workflowService.advanceStep(run.id);
      await refresh();
      await onRunUpdated?.();
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleBack() {
    if (currentState.run.currentStepIndex === 0) {
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      await workflowService.goToPreviousStep(run.id);
      await refresh();
      await onRunUpdated?.();
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
      await onRunUpdated?.();
    } catch (nextError) {
      setError((nextError as Error).message);
    } finally {
      setIsBusy(false);
    }
  }

  async function approveAndSend() {
    if (!currentState.previewMessage?.channel) {
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      await messageService.approveAndSend(run.id, currentState.previewMessage.channel);
      await refresh();
      await onRunUpdated?.();
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
          const isActive = index === currentState.run.currentStepIndex;
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

      <View style={styles.featureCard}>
        <Text style={styles.cardTitle}>{currentStep?.title}</Text>
        <Text style={styles.cardBody}>{currentStep?.description}</Text>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {(currentStep?.type === "capture-photos" || currentStep?.type === "review-photos") && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Photo Packet</Text>
          <Text style={styles.cardBody}>
            Capture the product set and a clear label image. Review confirms the packet is
            complete before OCR and order matching.
          </Text>
          {currentStep?.type === "capture-photos" ? (
            <View style={styles.buttonRow}>
              <Pressable onPress={() => addPhoto("product")} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Capture Product Photo</Text>
              </Pressable>
              <Pressable onPress={() => addPhoto("label")} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Capture Label Photo</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Product Photos</Text>
              <Text style={styles.summaryValue}>{productPhotos.length}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Label Photos</Text>
              <Text style={styles.summaryValue}>{labelPhotos.length}</Text>
            </View>
          </View>

          {currentState.photos.length === 0 ? (
            <Text style={styles.metaText}>No photos captured yet.</Text>
          ) : (
            <View style={styles.photoGrid}>
              {currentState.photos.map((photo) => (
                <View key={photo.id} style={styles.photoCard}>
                  <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                  <View style={styles.photoMetaRow}>
                    <Text style={styles.photoLabel}>{photo.label}</Text>
                    <Text style={styles.metaText}>
                      {photo.label === "label" ? "Used for OCR" : "Product packet"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {currentStep?.type === "ocr-match" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>OCR And Label Detection</Text>
          <Text style={styles.cardBody}>
            OCR scans the captured photos, chooses the most label-like image, and extracts
            recipient details for matching.
          </Text>
          {currentState.ocrExtraction ? (
            <>
              <Text style={styles.metaText}>
                OCR confidence: {(currentState.ocrExtraction.confidence * 100).toFixed(0)}%
              </Text>
              <Text style={styles.compareTitle}>Parsed Recipient</Text>
              <Text style={styles.compareValue}>
                {formatRecipient(currentState.ocrExtraction.recipient)}
              </Text>
              <Text style={styles.compareTitle}>Extracted Text</Text>
              <Text style={styles.compareValue}>{currentState.ocrExtraction.text}</Text>
            </>
          ) : (
            <Text style={styles.metaText}>
              Run this step to extract recipient text from the label photo packet.
            </Text>
          )}
        </View>
      ) : null}

      {currentStep?.type === "confirm-order" ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>OCR Extraction</Text>
            <Text style={styles.metaText}>
              Confidence:{" "}
              {currentState.ocrExtraction
                ? `${(currentState.ocrExtraction.confidence * 100).toFixed(0)}%`
                : "Not available"}
            </Text>
            <Text style={styles.compareValue}>
              {formatRecipient(currentState.ocrExtraction?.recipient ?? null)}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Match Candidates</Text>
            {currentState.candidates.length === 0 ? (
              <Text style={styles.metaText}>No candidates yet. Run OCR and matching first.</Text>
            ) : (
              currentState.candidates.map((candidate) => {
                const order = orders.find((item) => item.id === candidate.orderId);
                const isSelected = currentState.run.matchedOrderId === candidate.orderId;

                return (
                  <Pressable
                    key={candidate.orderId}
                    onPress={() => chooseCandidate(candidate.orderId)}
                    style={[
                      styles.candidateRow,
                      isSelected ? styles.candidateRowSelected : null
                    ]}
                  >
                    <View style={styles.candidateHeader}>
                      <View style={styles.candidateHeaderText}>
                        <Text style={styles.candidateTitle}>
                          {order?.integrationName ?? "Order"} {order?.orderNumber ?? candidate.orderId}
                        </Text>
                        <Text style={styles.metaText}>
                          Confidence: {(candidate.confidence * 100).toFixed(0)}%
                        </Text>
                      </View>
                      <View style={styles.selectPill}>
                        <Text style={styles.selectPillText}>
                          {isSelected ? "Selected" : "Tap to select"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.compareGrid}>
                      <View style={styles.compareCard}>
                        <Text style={styles.compareTitle}>OCR Recipient</Text>
                        <Text style={styles.compareValue}>
                          {formatRecipient(currentState.ocrExtraction?.recipient ?? null)}
                        </Text>
                      </View>
                      <View style={styles.compareCard}>
                        <Text style={styles.compareTitle}>Order Address</Text>
                        <Text style={styles.compareValue}>
                          {order ? formatAddress(order) : candidate.orderId}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.metaText}>{candidate.reasons.join(" ")}</Text>
                  </Pressable>
                );
              })
            )}
          </View>

          {matchedOrder ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Selected Order</Text>
              <Text style={styles.cardBody}>
                {matchedOrder.integrationName} {matchedOrder.orderNumber}
              </Text>
              <Text style={styles.metaText}>Buyer: {matchedOrder.buyerName}</Text>
              <Text style={styles.compareValue}>{formatAddress(matchedOrder)}</Text>
            </View>
          ) : null}
        </>
      ) : null}

      {currentStep?.type === "preview-message" || currentStep?.type === "approve-send" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Message Preview</Text>
          {currentState.previewMessage ? (
            <>
              <Text style={styles.metaText}>Channel: {currentState.previewMessage.channel}</Text>
              <Text style={styles.metaText}>Subject: {currentState.previewMessage.subject}</Text>
              <Text style={styles.cardBody}>{currentState.previewMessage.body}</Text>
            </>
          ) : (
            <Text style={styles.metaText}>Generate the preview from the prior step.</Text>
          )}
        </View>
      ) : null}

      <View style={styles.navigationRow}>
        <Pressable
          onPress={handleBack}
          style={[
            styles.secondaryButton,
            run.currentStepIndex === 0 ? styles.buttonDisabled : null
          ]}
          disabled={isBusy || currentState.run.currentStepIndex === 0}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              currentState.run.currentStepIndex === 0 ? styles.buttonDisabledText : null
            ]}
          >
            Back
          </Text>
        </Pressable>

        {currentStep?.type === "approve-send" ? (
          <Pressable onPress={approveAndSend} style={styles.primaryButton} disabled={isBusy}>
            <Text style={styles.primaryButtonText}>
              {isBusy ? "Sending..." : "Approve And Send"}
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={handleAdvance} style={styles.primaryButton} disabled={isBusy}>
            <Text style={styles.primaryButtonText}>
              {isBusy ? "Working..." : "Next"}
            </Text>
          </Pressable>
        )}
      </View>

      {__DEV__ ? (
        <View style={styles.debugBanner}>
          <Pressable
            onPress={() => setIsDebugExpanded((current) => !current)}
            style={styles.debugBannerHeader}
          >
            <Text style={styles.debugBannerTitle}>Debug Run State</Text>
            <Text style={styles.debugBannerAction}>
              {isDebugExpanded ? "Hide" : "Show"}
            </Text>
          </Pressable>
          {isDebugExpanded ? (
            <View style={styles.debugContent}>
              <Text style={styles.metaText}>
                Matched order: {currentState.run.matchedOrderId ?? "None"}
              </Text>
              <Text style={styles.metaText}>
                Approval:{" "}
                {currentState.approval.approvedAt
                  ? `approved at ${currentState.approval.approvedAt}`
                  : "pending"}
              </Text>
              <Text style={styles.metaText}>Run status: {currentState.run.status}</Text>
              <Text style={styles.metaText}>
                Current step: {currentState.run.currentStepIndex + 1}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: AppTheme["colors"]) {
return StyleSheet.create({
  container: {
    gap: spacing.lg
  },
  progressRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  progressPill: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  progressPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
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
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  featureCard: {
    backgroundColor: colors.backgroundAccent,
    borderColor: colors.borderStrong,
    borderRadius: 24,
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
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: 22,
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  navigationRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center"
  },
  secondaryButton: {
    backgroundColor: colors.background,
    borderColor: colors.borderStrong,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700"
  },
  buttonDisabled: {
    backgroundColor: colors.backgroundAccent,
    borderColor: colors.border
  },
  buttonDisabledText: {
    color: colors.muted
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  summaryTitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  summaryValue: {
    color: colors.primaryDark,
    fontSize: 28,
    fontWeight: "700"
  },
  photoGrid: {
    gap: spacing.md
  },
  photoCard: {
    gap: spacing.sm
  },
  photoPreview: {
    backgroundColor: colors.backgroundAccent,
    borderRadius: 20,
    height: 220,
    width: "100%"
  },
  photoMetaRow: {
    gap: spacing.xs
  },
  photoLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    textTransform: "capitalize"
  },
  candidateRow: {
    backgroundColor: colors.backgroundAccent,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  candidateRowSelected: {
    borderColor: colors.primary,
    borderWidth: 2
  },
  candidateHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  candidateHeaderText: {
    flex: 1,
    gap: spacing.xs
  },
  candidateTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700"
  },
  selectPill: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  selectPillText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700"
  },
  compareGrid: {
    gap: spacing.sm
  },
  compareCard: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  compareTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  compareValue: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20
  },
  debugBanner: {
    backgroundColor: colors.backgroundAccent,
    borderColor: colors.borderStrong,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  debugBannerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  debugBannerTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  debugBannerAction: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700"
  },
  debugContent: {
    gap: spacing.xs
  }
});
}
