---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

### Prerequisites
- Node.js 20+
- Docker Desktop for Windows with WSL2 backend
- Act CLI: `choco install act-cli` or download from https://github.com/nektos/act
- GitHub CLI (optional, for testing): `choco install gh`

### Environment Setup
1. Ensure Docker Desktop is running
2. Install Act: `choco install act-cli`
3. Verify Act installation: `act --version`
4. Create `.github/act-secrets` file (copy from `.github/act-secrets.example`)
5. Configure local Supabase credentials in act-secrets

### Configuration Files
```
.github/
├── workflows/
│   ├── build.yml
│   ├── e2e-tests.yml
│   └── component-tests.yml
├── act-secrets (gitignored)
└── act-secrets.example
.actrc
```

## Code Structure
**How is the code organized?**

### Directory Structure
```
.github/
├── workflows/          # GitHub Actions workflow definitions
│   ├── build.yml      # Build and artifact upload
│   ├── e2e-tests.yml  # E2E tests with artifact download
│   └── component-tests.yml  # Component tests with artifact download
├── act-secrets        # Local secrets for Act (gitignored)
└── act-secrets.example  # Template for act-secrets
.actrc                 # Act CLI configuration
```

### Naming Conventions
- Workflow files: `kebab-case.yml`
- Job names: `PascalCase` or `Sentence Case`
- Step names: Descriptive sentences
- Artifact names: `build-{run_id}` or `build-{sha}`

## Implementation Notes
**Key technical details to remember:**

### Build Pipeline (`build.yml`)

**Key Points:**
- Use `actions/checkout@v4` for code checkout
- Use `actions/setup-node@v4` with caching enabled
- Use `actions/upload-artifact@v4` for artifact upload
- Name artifacts with `build-${{ github.run_id }}`
- Set retention to 90 days (GitHub default)

**Example Structure:**
```yaml
name: Build
on:
  push:
    branches: [main, develop]
  pull_request:
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-${{ github.run_id }}
          path: ./out
          retention-days: 90
```

### E2E Test Pipeline (`e2e-tests.yml`)

**Key Points:**
- Use `workflow_dispatch` with `build_id` input
- Split into two jobs: `setup` and `test`
- Use `needs:` to create job dependency
- Download artifact in setup job
- Use `actions/cache` to persist environment between jobs
- Start Supabase in setup job
- Run tests in separate job for re-run capability

**Job Structure:**
```yaml
jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - Download artifact
      - Install dependencies
      - Start Supabase
      - Start server
      - Cache environment state
  
  test:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - Restore cached environment
      - Run Cypress E2E tests
      - Upload test results
```

**Challenges:**
- Jobs run on different runners, so can't share state directly
- Solution: Use artifacts or cache to share environment
- Alternative: Use single job with manual step re-run (less clean)

### Component Test Pipeline (`component-tests.yml`)

**Key Points:**
- Similar structure to E2E but simpler (no Supabase needed)
- Use `workflow_dispatch` with `build_id` input
- Download artifact before running tests
- Component tests don't need server running

**Simplified Structure:**
```yaml
jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - Download artifact
      - Install dependencies
      - Cache environment
  
  test:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - Restore cache
      - Run Cypress component tests
      - Upload test results
```

### Act Configuration (`.actrc`)

**Key Points:**
- Use official GitHub runner images for compatibility
- Configure platform mappings for ubuntu/windows/macos
- Point to secrets file
- Configure artifact server (Act's built-in)

**Example Configuration:**
```
-P ubuntu-latest=catthehacker/ubuntu:act-latest
-P ubuntu-22.04=catthehacker/ubuntu:act-22.04
-P ubuntu-20.04=catthehacker/ubuntu:act-20.04
--secret-file .github/act-secrets
--artifact-server-path /tmp/artifacts
```

### Act Secrets File (`.github/act-secrets`)

**Format:**
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Security:**
- Must be in `.gitignore`
- Create example file without real values
- Document required secrets in README

## Integration Points
**How do pieces connect?**

### Artifact Flow
```
Build Pipeline → Upload Artifact → GitHub Artifacts Storage
                                          ↓
                                    Download Artifact
                                          ↓
                              Test Pipelines (E2E, Component)
```

### Workflow Triggers
```
Push/PR → Build Pipeline (automatic)
Build Complete → Optionally trigger test pipelines
Manual Trigger → Test pipelines with specific build_id
```

### Local Act Flow
```
Developer → Act CLI → Docker → Workflow Execution
                                      ↓
                              Local Artifacts Directory
```

## Error Handling
**How do we handle failures?**

### Artifact Download Failures
```yaml
- name: Download artifact
  uses: actions/download-artifact@v4
  with:
    name: ${{ inputs.build_id }}
    path: ./out
  continue-on-error: false  # Fail fast if artifact missing

- name: Validate artifact
  run: |
    if [ ! -d "./out" ] || [ -z "$(ls -A ./out)" ]; then
      echo "Error: Artifact is empty or missing"
      exit 1
    fi
```

### Supabase Startup Failures
```yaml
- name: Start Supabase
  run: |
    npx supabase start
    npx supabase status

- name: Wait for Supabase
  run: |
    timeout 60 bash -c 'until curl -f http://localhost:54321; do sleep 2; done'
```

### Test Failures
- Upload screenshots and videos on failure
- Use `if: failure()` condition for cleanup steps
- Set appropriate timeout values

## Performance Considerations
**How do we keep it fast?**

### Caching Strategy
```yaml
# Cache node_modules
- uses: actions/setup-node@v4
  with:
    cache: 'npm'

# Cache Cypress binary
- name: Cache Cypress
  uses: actions/cache@v4
  with:
    path: ~/.cache/Cypress
    key: cypress-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

# Cache Supabase CLI
- name: Cache Supabase CLI
  uses: actions/cache@v4
  with:
    path: ~/.supabase
    key: supabase-${{ runner.os }}
```

### Parallel Execution
- E2E and Component tests can run in parallel
- Use matrix strategy for multiple test suites if needed

### Artifact Size Optimization
- Only include necessary files in artifact (./out directory)
- Use compression (automatic with upload-artifact@v4)

## Security Notes
**What security measures are in place?**

### Secrets Management
- Use GitHub Actions secrets for sensitive data
- Never log secrets (GitHub automatically masks them)
- Use `.github/act-secrets` for local testing (gitignored)
- Rotate secrets regularly

### Artifact Security
- Artifacts are private to repository by default
- Set appropriate retention period (90 days)
- Don't include sensitive data in artifacts
- Use least-privilege service accounts

### Supabase Security
- Use service role key only in CI (not in artifacts)
- Reset test database after each run
- Use separate Supabase project for CI if possible

## Testing the Implementation
**How do we verify it works?**

### Build Pipeline Testing
1. Push to test branch
2. Check GitHub Actions UI for workflow run
3. Verify artifact is uploaded
4. Download artifact manually and inspect contents

### E2E Test Pipeline Testing
1. Get build ID from successful build run
2. Manually trigger E2E workflow with build ID
3. Verify artifact downloads successfully
4. Verify tests run and pass
5. Try re-running only "test" job

### Component Test Pipeline Testing
1. Get build ID from successful build run
2. Manually trigger component workflow with build ID
3. Verify artifact downloads successfully
4. Verify tests run and pass

### Act Local Testing
1. Run `npm run act:build` (or `act -W .github/workflows/build.yml`)
2. Verify build completes and artifact is created locally
3. Run `npm run act:e2e -- -s BUILD_ID=build-123` with actual build ID
4. Verify tests run successfully
5. Compare behavior with GitHub Actions

### Integration Testing
1. Push code change
2. Verify build pipeline runs automatically
3. Manually trigger test pipelines with new build ID
4. Verify entire flow works end-to-end

