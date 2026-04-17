# Product Fulfillment V1 Plan

## Summary
Build a phone-first, local-first fulfillment app with `Expo` as the primary client and an architecture that already supports a later enterprise/server mode built on `NestJS + Postgres + Supabase`. In V1, all operational processing happens on the phone: photo capture, OCR, marketplace sync, order matching, message preview, and send. The same front end must later support server-backed execution by swapping service implementations instead of redesigning screens.

V1 ships with one default fulfillment workflow and a modular workflow engine underneath it. Users can configure supported step types and step order, but V1 does not include arbitrary scripting. Messaging is integration-aware: if the mapped integration supports outbound messaging, offer that channel; otherwise fall back to email from the order when available.

## Frameworks And Dependencies
### Core stack
- `Expo` / `React Native` for the mobile app and V1 primary runtime
- `NestJS` for the future enterprise/server backend
- `PostgreSQL` for the future central database in enterprise mode
- `Supabase` for future hosted Postgres, auth, storage, and realtime support in enterprise mode

### V1 mobile app
- `expo`
- `react`
- `react-native`
- `expo-router`
- `expo-camera`
- `expo-image-picker`
- `expo-file-system`
- `expo-sqlite`
- `expo-secure-store`
- `expo-mail-composer`
- `expo-sharing`
- `@tanstack/react-query`
- `zod`
- `react-hook-form`
- `zustand`
- On-device OCR implementation hidden behind `OcrService`

### Future backend
- `@nestjs/common`
- `@nestjs/config`
- `@nestjs/passport`
- `@nestjs/jwt`
- `@nestjs/bullmq`
- `prisma`
- `@prisma/client`
- `@supabase/supabase-js`
- `pg`
- `redis`
- `zod`

### Future web/admin
- `Next.js`
- `React`
- `@tanstack/react-query`
- `zod`
- Shared contracts reused from the mobile/backend layers

### Future optional additions
- `Resend` or `SendGrid`
- S3-compatible object storage
- Server-side OCR provider for enterprise mode
- `Sentry`
- Feature flag/configuration service
- Push notifications for multi-device workflows

## Implementation Plan
### Runtime model
- Support two execution modes behind one UI:
  - `local mode` for V1: the phone performs OCR, calls marketplace APIs directly, stores data locally, and sends messages directly from the device
  - `remote mode` for later enterprise use: the phone becomes a client to a backend that performs sync, OCR, matching, storage, and sending
- Route all workflow operations through service interfaces:
  - `OrderSyncService`
  - `OcrService`
  - `MatchService`
  - `MessageService`
  - `WorkflowService`
  - `StorageService`
  - `IntegrationAuthService`

### Product and workflow model
- Define the primary record as a `FulfillmentRun`
- Store `photos`, `ocr result`, `match candidates`, `selected order`, `approval state`, and `message attempt` data under each run
- Implement:
  - `WorkflowTemplate`
  - `WorkflowStepDefinition`
  - `WorkflowRun`
  - `WorkflowRunStepState`
- Ship one V1 workflow:
  1. Start fulfillment
  2. Capture product and label photos
  3. Review photos
  4. Run OCR and order matching
  5. Confirm matched order
  6. Preview message
  7. Approve and send
- Support a bounded catalog of step types in V1
- Allow admins to reorder approved steps, toggle optional steps, and insert supported checkpoints

### Mobile behavior
- Use the Expo app as the primary and only required V1 interface
- Persist workflow config, orders, fulfillment runs, OCR results, message templates, and send history on-device
- Use secure local storage for integration credentials and tokens
- Render the workflow from configuration rather than hardcoded routes
- Require manual confirmation of both photo quality and order match before sending
- Preserve in-progress runs across app restarts and intermittent connectivity

### Integrations, OCR, and messaging
- Implement Etsy first, then Squarespace, behind a common adapter contract
- Normalize imported orders into a shared internal shape
- Run OCR on-device against the designated label photo
- Match OCR output against locally stored orders and return ranked candidates with confidence scoring
- Offer the best outbound channel per integration:
  - native integration messaging if supported
  - otherwise email when order email exists
  - otherwise block sending and surface a manual state
- Record the selected channel and send outcome for each attempt

### Enterprise compatibility
- Keep local schemas and service contracts portable to a future server-backed backend
- Keep identifiers stable and sync-friendly
- Reserve the backend role for:
  - centralized Postgres
  - multi-device sync
  - shared templates and workflows
  - server-side OCR and matching
  - centralized audit and sending

## Public Interfaces
- Front-end service contracts:
  - `createFulfillmentRun`
  - `savePhotos`
  - `syncOrders`
  - `runOcr`
  - `findMatchCandidates`
  - `confirmMatchedOrder`
  - `generateMessagePreview`
  - `approveAndSend`
  - `getWorkflowDefinition`
  - `getWorkflowRunState`
- Integration adapter contract:
  - `connect`
  - `syncOrders`
  - `normalizeOrder`
  - `getSupportedMessageChannels`
  - `sendMessage`
  - `prepareMessage`

## Test Plan
### Core workflow
- Create a new fulfillment run and complete the default workflow fully on the phone
- Verify required steps cannot be skipped
- Verify send cannot happen before photo review and match confirmation
- Verify workflow configuration changes preserve core required steps

### Local processing
- Verify OCR produces extracted recipient data without a backend
- Verify order sync stores normalized orders locally
- Verify matching works using only locally stored data
- Verify message preview and send work without server infrastructure

### Matching and messaging
- Clear label photo matches the correct order
- Similar orders produce a ranked candidate list
- OCR partial failure surfaces a retry/review path
- Native integration messaging is preferred when supported
- Email fallback is offered when native messaging is unavailable
- Missing channels produce a blocked/manual state
- Approval is required before every send

### Resilience
- In-progress runs resume after app restart
- Unsynced local data survives app termination
- Temporary network failures produce retryable states
- Repeated taps and retries do not create duplicate sends

### Enterprise readiness
- Local service implementations can be swapped for remote ones without changing workflow screens
- Local entity shapes map cleanly to future server-backed persistence

## Assumptions And Defaults
- V1 is single-device and local-first
- Human approval before send is mandatory
- OCR and matching happen on-device in V1
- Messaging capability is determined by the matched integration adapter
- Workflow modularity in V1 means configurable supported step types, not arbitrary user scripting
- Etsy is the first production integration
- Squarespace is the second production integration
