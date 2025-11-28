# GitHub Actions Pipelines Guide

## Overview

This project uses a modular GitHub Actions pipeline architecture that separates build and test stages. This allows:
- **Build once, test multiple times**: Reuse build artifacts across test runs
- **Fast test re-runs**: Re-run tests without rebuilding
- **Local testing**: Test pipelines locally with Act before pushing

## Architecture

```
┌─────────────┐
│   Push/PR   │
└──────┬──────┘
       │
       v
┌─────────────────┐
│  Build Pipeline │ ──> Upload artifact (build-{run_id})
└─────────────────┘
       │
       ├──────────────────┬──────────────────┐
       v                  v                  v
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ E2E Tests    │   │ Component    │   │ Manual       │
│ (automatic)  │   │ Tests        │   │ Trigger      │
│              │   │ (automatic)  │   │ (any build)  │
└──────────────┘   └──────────────┘   └──────────────┘
```

## Workflows

### 1. CI Pipeline (`ci.yml`)

**Triggers:**
- Push to `main`, `develop`, or `github-actions-setup` branches
- Pull requests

**Jobs:**
1. **Build**: Creates production build and uploads artifact
2. **E2E Tests**: Downloads artifact, starts Supabase, runs E2E tests
3. **Component Tests**: Downloads artifact, runs component tests

**Usage:**
```bash
# Automatic on push/PR
git push origin your-branch

# View results in GitHub Actions UI
```

### 2. Build Pipeline (`build.yml`)

**Triggers:**
- Push to main branches
- Pull requests
- Manual dispatch

**Outputs:**
- Build artifact: `build-{run_id}`
- Artifact location: `./out` directory

**Usage:**
```bash
# Manual trigger via GitHub UI
Actions > Build > Run workflow

# Or via GitHub CLI
gh workflow run build.yml
```

### 3. E2E Test Pipeline (`e2e-tests.yml`)

**Triggers:**
- Manual dispatch with `build_id` input

**Requirements:**
- Valid build artifact ID

**Steps:**
1. **Setup**: Download artifact, install deps, start Supabase
2. **Test**: Run Cypress E2E tests

**Usage:**
```bash
# Get build ID from previous build run
BUILD_ID="build-123456789"

# Trigger via GitHub UI
Actions > E2E Tests > Run workflow > Enter build_id

# Or via GitHub CLI
gh workflow run e2e-tests.yml -f build_id=$BUILD_ID
```

**Re-running tests:**
- In GitHub Actions UI, click "Re-run jobs" > Select "test" job only
- This skips setup and only re-runs tests

### 4. Component Test Pipeline (`component-tests.yml`)

**Triggers:**
- Manual dispatch with `build_id` input

**Requirements:**
- Valid build artifact ID

**Steps:**
1. **Setup**: Download artifact, install deps
2. **Test**: Run Cypress component tests

**Usage:**
```bash
# Get build ID from previous build run
BUILD_ID="build-123456789"

# Trigger via GitHub UI
Actions > Component Tests > Run workflow > Enter build_id

# Or via GitHub CLI
gh workflow run component-tests.yml -f build_id=$BUILD_ID
```

## Local Testing with Act

### Prerequisites

1. **Docker Desktop** (with WSL2 backend on Windows)
2. **Act CLI**:
   ```bash
   # Windows (Chocolatey)
   choco install act-cli
   
   # macOS (Homebrew)
   brew install act
   
   # Linux
   curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
   ```

### Setup

1. **Create local secrets file:**
   ```bash
   cp .github/act-secrets.example .github/act-secrets
   ```

2. **Configure secrets** in `.github/act-secrets`:
   ```bash
   # Get Supabase credentials
   npm run db:start
   npm run db:status
   
   # Copy API URL and anon key to .github/act-secrets
   ```

3. **Verify Act installation:**
   ```bash
   act --version
   npm run act:list
   ```

### Running Pipelines Locally

#### List Available Workflows
```bash
npm run act:list
```

#### Run Build Pipeline
```bash
npm run act:build

# Or with Act directly
act -W .github/workflows/build.yml
```

#### Run E2E Tests
```bash
# First, get build ID from local or GitHub build
BUILD_ID="build-123456789"

# Run E2E tests
npm run act:e2e -- -s BUILD_ID=$BUILD_ID

# Or with Act directly
act workflow_dispatch -W .github/workflows/e2e-tests.yml -s BUILD_ID=$BUILD_ID
```

#### Run Component Tests
```bash
# Get build ID
BUILD_ID="build-123456789"

# Run component tests
npm run act:component -- -s BUILD_ID=$BUILD_ID

# Or with Act directly
act workflow_dispatch -W .github/workflows/component-tests.yml -s BUILD_ID=$BUILD_ID
```

#### Run Full CI Pipeline
```bash
# Run all jobs (build + tests)
act -W .github/workflows/ci.yml

# Run specific job only
act -W .github/workflows/ci.yml -j build
act -W .github/workflows/ci.yml -j e2e-tests
act -W .github/workflows/ci.yml -j component-tests
```

### Act Configuration

**`.actrc`** - Act CLI configuration:
```
-P ubuntu-latest=catthehacker/ubuntu:act-latest
--secret-file .github/act-secrets
--artifact-server-path /tmp/artifacts
--container-architecture linux/amd64
```

**Platform mappings:**
- Uses official GitHub Actions runner images for compatibility
- Ensures consistent behavior between local and GitHub Actions

### Troubleshooting Act

#### Issue: Docker permission denied
```bash
# Windows: Ensure Docker Desktop is running
# Linux: Add user to docker group
sudo usermod -aG docker $USER
```

#### Issue: Act can't find workflows
```bash
# Ensure you're in project root
cd /path/to/EverFreeNote

# List workflows to verify
npm run act:list
```

#### Issue: Secrets not loaded
```bash
# Verify secrets file exists
cat .github/act-secrets

# Check Act is using secrets file
act -l --secret-file .github/act-secrets
```

#### Issue: Artifact not found
```bash
# Ensure build completed successfully
npm run act:build

# Check artifact was created
ls /tmp/artifacts

# Use correct build ID
act workflow_dispatch -W .github/workflows/e2e-tests.yml -s BUILD_ID=build-local
```

#### Issue: Supabase fails to start
```bash
# Start Supabase locally first
npm run db:start

# Get credentials
npm run db:status

# Update .github/act-secrets with correct values
```

## Common Workflows

### 1. Develop and Test Locally
```bash
# 1. Make code changes
vim app/page.tsx

# 2. Test build locally
npm run act:build

# 3. Run tests locally
BUILD_ID="build-$(date +%s)"
npm run act:e2e -- -s BUILD_ID=$BUILD_ID

# 4. Push when ready
git add .
git commit -m "feat: add new feature"
git push
```

### 2. Test Pipeline Changes
```bash
# 1. Modify workflow
vim .github/workflows/ci.yml

# 2. Test locally with Act
npm run act:build

# 3. Verify behavior matches expectations
# 4. Push when ready
git push
```

### 3. Re-run Failed Tests
```bash
# GitHub Actions UI:
# 1. Go to failed workflow run
# 2. Click "Re-run jobs"
# 3. Select "Re-run failed jobs" or specific job

# Or manually trigger with same build ID:
gh workflow run e2e-tests.yml -f build_id=build-123456789
```

### 4. Test Old Build
```bash
# 1. Find old build ID from GitHub Actions history
# 2. Trigger tests with that build ID
gh workflow run e2e-tests.yml -f build_id=build-123456789
```

## Artifact Management

### Artifact Naming
- Format: `build-{run_id}`
- Example: `build-123456789`
- Unique per workflow run

### Artifact Retention
- **Build artifacts**: 90 days
- **Test results**: 30 days

### Artifact Contents
- `./out` directory (Next.js static export)
- HTML, JS, CSS, static assets

### Finding Artifacts
```bash
# GitHub UI:
# 1. Go to workflow run
# 2. Scroll to "Artifacts" section
# 3. Download artifact

# GitHub CLI:
gh run list --workflow=build.yml
gh run view RUN_ID
gh run download RUN_ID
```

## Performance Optimization

### Caching Strategy
- **Node modules**: Cached via `actions/setup-node@v4`
- **Cypress binary**: Cached via `actions/cache@v4`
- **Supabase CLI**: Cached via `actions/cache@v4`

### Parallel Execution
- E2E and Component tests run in parallel
- Both download same build artifact
- No dependencies between test jobs

### Build Time
- **Build**: ~3-5 minutes
- **E2E Tests**: ~5-10 minutes
- **Component Tests**: ~3-5 minutes
- **Total CI**: ~10-15 minutes (parallel)

## Security

### Secrets Management
- GitHub Actions secrets for CI
- `.github/act-secrets` for local testing (gitignored)
- Never commit secrets to repository

### Required Secrets
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Artifact Security
- Artifacts are private to repository
- Only accessible by repository collaborators
- Automatically deleted after retention period

## Monitoring

### Workflow Status
```bash
# List recent runs
gh run list

# View specific run
gh run view RUN_ID

# Watch run in real-time
gh run watch RUN_ID
```

### Notifications
- GitHub sends email on workflow failure
- Configure in GitHub Settings > Notifications

### Logs
- View logs in GitHub Actions UI
- Download logs via GitHub CLI:
  ```bash
  gh run view RUN_ID --log
  ```

## Best Practices

1. **Always test locally first** with Act before pushing
2. **Use descriptive commit messages** to identify builds
3. **Re-run only failed jobs** to save CI time
4. **Clean up old artifacts** if storage becomes an issue
5. **Monitor workflow performance** and optimize as needed
6. **Keep secrets up to date** in both GitHub and local Act config
7. **Document any workflow changes** in this guide

## FAQ

**Q: Can I run tests on a specific commit?**
A: Yes, find the build ID for that commit's workflow run and trigger tests with that ID.

**Q: How do I debug a failing test?**
A: Download test artifacts (screenshots/videos) from the workflow run, or run tests locally with Act.

**Q: Can I run multiple test suites in parallel?**
A: Yes, E2E and Component tests already run in parallel. You can add more test jobs to `ci.yml`.

**Q: What if Act behavior differs from GitHub Actions?**
A: We use official GitHub runner images to minimize differences. Report any issues you find.

**Q: How do I add a new workflow?**
A: Create a new `.yml` file in `.github/workflows/`, test with Act, then push.

## Support

- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Act Documentation**: https://github.com/nektos/act
- **Supabase CLI**: https://supabase.com/docs/guides/cli
- **Cypress CI**: https://docs.cypress.io/guides/continuous-integration/introduction

## Related Documentation

- [Requirements](../docs/ai/requirements/feature-github-actions-pipelines.md)
- [Design](../docs/ai/design/feature-github-actions-pipelines.md)
- [Implementation](../docs/ai/implementation/feature-github-actions-pipelines.md)
- [Testing](../docs/ai/testing/feature-github-actions-pipelines.md)

