# Smart AAC Backend (Cloud Run API)


The backend delivers culturally-aware AAC icon generation, audio synthesis, board management, and user personalization through a secure, serverless architecture on Google Cloud Run.

---

## Overview
- AI-assisted AAC workflow: text-to-icon, image-to-icon, and multilingual audio generation with cultural context.
- Comprehensive REST API (25 endpoints) with interactive Swagger docs at `/api-docs`.
- Google Cloud native deployment (Cloud Run, Firestore, Cloud Storage, Vertex AI, Firebase Auth).
- Automated provisioning scripts for prerequisites, storage, indexes, and AI model smoke tests.
- Observability built in: health probes, structured logging, and environment diagnostics.

---

## Feature Highlights
- **Icon & Audio Pipeline**: Imagen 4.0 + Gemini 2.5 + Text-to-Speech + optional translation.
- **Board Management**: Private/public boards, layout metadata, and usage stats.
- **Profile Intelligence**: Cultural preferences, demographics, and accessibility inputs driving AI prompts.
- **Secure Uploads**: Sanitized icon processing, vetted audio ingestion, and per-user storage isolation.
- **Operational Readiness**: Health endpoints, smoke-test scripts, deploy/rollback tooling.

---

## API Surface (v1)
- **Health** (2): `GET /health`, `GET /api/v1/health`
- **Profiles** (9): Profile lifecycle, cultural context, validation
- **Boards** (6): CRUD, discovery, publishing
- **Icons & Audio** (8): Generation, uploads, catalog, stats, deletion

See `API_SPECIFICATIONS.md` for request/response contracts and example payloads.

---

## Technology Stack
- **Runtime**: Node.js 18, Express 4, CommonJS
- **Auth**: Firebase Admin SDK (JWT verification)
- **Data**: Firestore (AAC boards, profiles, icon metadata)
- **Storage**: Google Cloud Storage (icons/audio)
- **AI**: Vertex AI (Imagen 4.0 Fast, Gemini 2.5 Flash Image, Gemini 2.5 Pro, Cloud TTS)
- **Infra**: Docker multi-stage build → Google Cloud Run (serverless)
- **Docs**: Swagger UI (`src/config/swagger.js`) exposed at `/api-docs`

Full diagrams, data models, and decision records live in `ARCHITECTURE.md`.

---

## Environment & Configuration
1. **Create a local env file** (example):
   ```bash
   cp deployment/environments/staging.env .env
   ```
   Adjust values (project IDs, bucket names, CORS origins, log level).

2. **Required variables** (minimum set):
   | Variable | Purpose |
   | --- | --- |
   | `GOOGLE_CLOUD_PROJECT` | GCP project ID used for Firestore, Storage, Vertex AI |
   | `FIREBASE_PROJECT_ID` | Firebase project for Auth verification |
   | `VERTEX_AI_LOCATION` | Vertex AI region (e.g. `us-central1`) |
   | `STORAGE_BUCKET_NAME` | GCS bucket for icons/audio |
   | `CORS_ORIGINS` | Comma-separated allowed origins |
   | `IMAGEN_TEXT_TO_ICON_MODEL` | Imagen model ID |
   | `GEMINI_IMAGE_TO_ICON_MODEL` | Gemini Vision model ID |
   | `GEMINI_TRANSLATE_MODEL` | Translation model for audio fallback |
   | `GEMINI_TTS_MODEL` | Text-to-speech model (if using Gemini TTS) |
   | `LOG_LEVEL` | `debug`, `info`, `warn`, `error` |

3. **Service Account Key**:
   - Place JSON key locally (e.g. `service-account-key.json`).
   - Export `GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account-key.json`.

4. **CLI prerequisites**:
   - `gcloud` CLI authenticated (`gcloud auth application-default login`).
   - Enable required services: `run.googleapis.com`, `firestore.googleapis.com`, `storage.googleapis.com`, `aiplatform.googleapis.com`.

---

## Local Development Workflow
```bash
# 1. Install dependencies
npm install

# 2. Verify environment and Google Cloud readiness
npm run check

# 3. Provision Firestore (collections, indexes) and storage bucket settings
npm run setup:firestore
node scripts/setup-storage-bucket.js

# 4. Run AI smoke tests (optional but recommended)
npm run test:ai-models

# 5. Start the API (nodemon in development mode)
npm run dev

# 6. Open Swagger UI
open http://localhost:8080/api-docs
```

**Hot reload**: Nodemon watches `src/` by default.  
**Default port**: `8080` (configurable via `PORT`).

---

## Testing & Quality Gates
- `npm test`: Jest unit/integration suite.
- `npm run test:api`: End-to-end API smoke test (requires `TEST_TOKEN`).
- `npm run test:ai-models`: Sequential Imagen/Gemini sanity checks.
- `node scripts/test-complete-workflow.js`: Full icon → board → profile workflow.
- `node scripts/diagnose-firebase.js`: Validates Firebase Admin credentials.

Testing scripts read `API_BASE_URL`, `TEST_USER_TOKEN`, and related env vars when present.

---

## Deployment (Google Cloud Run)
```bash
# Build container locally
npm run build

# Deploy via helper script (wraps gcloud run deploy)
./deploy.sh

# Validate deployed service (runs health + smoke checks)
npm run validate
```

Alternative CI/CD:
- `cloudbuild.yaml`: Build & deploy pipeline (Cloud Build).
- `cloud-run-service.yaml`: Declarative service configuration (memory, concurrency, min/max instances).
- `deployment/environments/*.env`: Promote configuration between staging/production.

Observability post-deploy:
- `GET /health` → liveness.
- `GET /api/v1/health` → dependency matrix (Firestore, Vertex AI, Firebase Auth, environment).
- Logs emitted as structured JSON (see `src/utils/logger.js`).

---

## Operations Cheat Sheet
- **Credentials**: Verify `GOOGLE_APPLICATION_CREDENTIALS` before running scripts.
- **Bucket Maintenance**: `node scripts/setup-storage-bucket.js` applies CORS + lifecycle rules.
- **Firestore Indexes**: `node setup-firestore-indexes.js` guides manual index creation if needed.
- **Token Utilities**:
  - `node scripts/generate-test-token.js`: Create JWT for manual testing.
  - `npm run postman:token`: Convenience wrapper around `scripts/get-postman-token.js`.

---

## Project Structure
```
backend/
├── src/
│   ├── server.js                # Express bootstrap, middleware wiring
│   ├── routes/                  # REST controllers (health, profiles, boards, icons)
│   ├── services/                # Firestore, Storage, Vertex AI, cultural context
│   ├── middleware/              # Auth, error handler, uploads, validation
│   └── utils/                   # Logger, validation helpers
├── scripts/                     # Setup, diagnostics, smoke tests
├── deployment/                  # Cloud Run configs, env templates
├── cloudbuild.yaml              # CI/CD pipeline
├── docker-compose.yml           # Local container orchestration
├── Dockerfile                   # Multi-stage production build
└── README.md                    # This document
```

Refer to `ARCHITECTURE.md` for extended diagrams, data schemas, and future roadmap.

---

## Additional Resources
- `ARCHITECTURE.md` – Detailed component, data, and security architecture.
- `API_SPECIFICATIONS.md` – Endpoint contracts and workflows.
- `deployment/README.md` – Environment promotion and Cloud Run rollout guidance.
- `deployment-plan.md` – Release steps, rollback strategy, smoke tests.
- `scripts/` – All automation utilities (bucket, indexes, diagnostics, AI tests).

---

## Contributing
- Follow existing Express + service-layer structure; keep modules cohesive.
- Enforce authentication and validation in new endpoints.
- Update Swagger docs (`src/config/swagger.js`) when API shapes change.
- Add/extend Jest or script-based tests for new features.
- Maintain accessibility and cultural context considerations across features.

---

## License

MIT License – see `LICENSE`.

---
