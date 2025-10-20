---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- **Pipeline validation:** All workflows must execute successfully in both GitHub Actions and Act
- **Integration testing:** Verify artifact flow from build to test pipelines
- **Error handling:** Test failure scenarios (missing artifacts, failed builds, etc.)
- **Documentation validation:** Ensure all documented commands work as expected
- **Alignment with requirements:** Verify all success criteria from requirements doc are met

## Unit Tests
**What individual components need testing?**

### Build Pipeline (`build.yml`)
- [ ] **Test case 1:** Pipeline triggers on push to main branch
- [ ] **Test case 2:** Pipeline triggers on pull request
- [ ] **Test case 3:** Pipeline can be manually triggered via workflow_dispatch
- [ ] **Test case 4:** Build completes successfully and produces ./out directory
- [ ] **Test case 5:** Artifact is uploaded with correct naming convention (build-{run_id})
- [ ] **Test case 6:** Artifact contains expected files (Next.js static export)
- [ ] **Test case 7:** Build fails gracefully if npm build fails

### E2E Test Pipeline (`e2e-tests.yml`)
- [ ] **Test case 1:** Pipeline accepts build_id input parameter
- [ ] **Test case 2:** Pipeline downloads correct artifact based on build_id
- [ ] **Test case 3:** Setup job completes successfully (Supabase starts, server starts)
- [ ] **Test case 4:** Test job runs after setup job completes
- [ ] **Test case 5:** Tests execute against downloaded build artifact
- [ ] **Test case 6:** Test results are uploaded on completion
- [ ] **Test case 7:** Screenshots/videos are uploaded on test failure
- [ ] **Test case 8:** Pipeline fails gracefully if artifact not found
- [ ] **Test case 9:** Pipeline fails gracefully if Supabase fails to start

### Component Test Pipeline (`component-tests.yml`)
- [ ] **Test case 1:** Pipeline accepts build_id input parameter
- [ ] **Test case 2:** Pipeline downloads correct artifact based on build_id
- [ ] **Test case 3:** Setup job completes successfully
- [ ] **Test case 4:** Test job runs after setup job completes
- [ ] **Test case 5:** Component tests execute successfully
- [ ] **Test case 6:** Test results are uploaded on completion
- [ ] **Test case 7:** Pipeline fails gracefully if artifact not found

### Act Configuration
- [ ] **Test case 1:** Act can list all workflows (`act -l`)
- [ ] **Test case 2:** Act can run build workflow locally
- [ ] **Test case 3:** Act can run E2E workflow locally with build_id
- [ ] **Test case 4:** Act can run component workflow locally with build_id
- [ ] **Test case 5:** Act uses correct Docker images (matches GitHub runners)
- [ ] **Test case 6:** Act loads secrets from .github/act-secrets
- [ ] **Test case 7:** Act creates local artifacts in configured directory

## Integration Tests
**How do we test component interactions?**

- [ ] **Integration 1:** Build pipeline → Artifact upload → E2E pipeline artifact download
  - Trigger build pipeline
  - Wait for completion and get build_id
  - Trigger E2E pipeline with build_id
  - Verify E2E pipeline downloads and uses correct artifact

- [ ] **Integration 2:** Build pipeline → Artifact upload → Component pipeline artifact download
  - Trigger build pipeline
  - Wait for completion and get build_id
  - Trigger component pipeline with build_id
  - Verify component pipeline downloads and uses correct artifact

- [ ] **Integration 3:** Parallel test execution
  - Trigger build pipeline
  - Trigger both E2E and component pipelines simultaneously with same build_id
  - Verify both complete successfully without conflicts

- [ ] **Integration 4:** Re-run test job only
  - Complete full E2E pipeline run
  - Re-run only the "test" job (not "setup")
  - Verify test runs without re-downloading artifact or re-setting up environment

- [ ] **Integration 5:** Act local to GitHub Actions consistency
  - Run build pipeline with Act locally
  - Upload local artifact to GitHub manually (or push code)
  - Run build pipeline on GitHub
  - Compare artifacts from both sources
  - Verify they are functionally identical

## End-to-End Tests
**What user flows need validation?**

- [ ] **E2E Flow 1:** Developer pushes code → Build runs → Tests run automatically
  - Push code to test branch
  - Verify build pipeline triggers automatically
  - Verify artifact is created
  - (Optional: Auto-trigger tests or manually trigger)
  - Verify tests pass

- [ ] **E2E Flow 2:** Developer tests pipeline changes locally before pushing
  - Modify workflow YAML file
  - Run workflow locally with Act
  - Verify changes work as expected
  - Push to GitHub
  - Verify same behavior in GitHub Actions

- [ ] **E2E Flow 3:** Developer re-runs failed tests without rebuilding
  - Run full pipeline (build + tests)
  - Tests fail
  - Fix test code (not build code)
  - Re-run only test job with same build_id
  - Verify tests now pass

- [ ] **E2E Flow 4:** Developer investigates old build
  - Find old build_id from GitHub Actions history
  - Manually trigger test pipeline with old build_id
  - Verify tests run against old build artifact

## Test Data
**What data do we use for testing?**

### Test Build IDs
- Use actual GitHub run IDs from completed builds
- For Act testing, use mock build IDs like `build-test-123`

### Test Secrets
- `.github/act-secrets.example` provides template
- Local Supabase credentials for Act testing
- GitHub Actions uses repository secrets

### Test Artifacts
- Build artifacts from ./out directory (Next.js static export)
- Should contain: HTML files, JS bundles, CSS, static assets

## Test Reporting & Coverage
**How do we verify and communicate test results?**

### Coverage Commands
- No code coverage needed (testing infrastructure, not application code)
- Verify all workflows execute successfully: Check GitHub Actions UI
- Verify all Act commands work: Run each npm script

### Manual Testing Checklist
- [ ] All workflows visible in GitHub Actions UI
- [ ] Build pipeline creates artifact successfully
- [ ] E2E pipeline downloads artifact and runs tests
- [ ] Component pipeline downloads artifact and runs tests
- [ ] Act can list all workflows locally
- [ ] Act can run build workflow locally
- [ ] Act can run test workflows locally
- [ ] All npm scripts work as documented
- [ ] Documentation is accurate and complete

### Test Reports
- GitHub Actions provides built-in workflow run reports
- Cypress test results uploaded as artifacts
- Screenshots/videos uploaded on test failure

## Manual Testing
**What requires human validation?**

### GitHub Actions UI Testing
- [ ] Verify workflows appear in Actions tab
- [ ] Verify workflow runs show correct status
- [ ] Verify artifacts appear in workflow run details
- [ ] Verify artifact download works from UI
- [ ] Verify re-run functionality works (re-run jobs)
- [ ] Verify manual workflow dispatch works

### Act Local Testing
- [ ] Verify Act installation works on Windows
- [ ] Verify Docker images download correctly
- [ ] Verify Act can access local secrets
- [ ] Verify Act creates local artifacts
- [ ] Verify Act output matches GitHub Actions output
- [ ] Verify Act error messages are clear

### Documentation Testing
- [ ] Follow setup instructions from scratch
- [ ] Verify all commands in docs work
- [ ] Verify troubleshooting section is helpful
- [ ] Verify examples are accurate

### Cross-Platform Testing (if applicable)
- [ ] Test on Windows (primary development environment)
- [ ] Test on Linux (GitHub Actions runner)
- [ ] Document any platform-specific differences

## Performance Testing
**How do we validate performance?**

### Build Pipeline Performance
- [ ] Build completes in < 5 minutes
- [ ] Artifact upload completes in < 1 minute
- [ ] Caching reduces subsequent build time by > 50%

### Test Pipeline Performance
- [ ] E2E tests complete in < 10 minutes
- [ ] Component tests complete in < 5 minutes
- [ ] Artifact download completes in < 1 minute
- [ ] Re-running test job is faster than full pipeline (no setup overhead)

### Act Performance
- [ ] Act build time within 20% of GitHub Actions time
- [ ] Act test time within 20% of GitHub Actions time
- [ ] Docker image pull time acceptable (one-time cost)

### Resource Usage
- [ ] Artifact storage within GitHub limits
- [ ] Concurrent pipeline runs don't exceed GitHub Actions limits
- [ ] Local Act testing doesn't exhaust disk space

## Bug Tracking
**How do we manage issues?**

### Issue Categories
1. **Pipeline failures:** Workflow doesn't complete successfully
2. **Artifact issues:** Artifact not created, not found, or corrupted
3. **Act incompatibilities:** Behavior differs between Act and GitHub Actions
4. **Documentation errors:** Instructions don't work or are unclear

### Severity Levels
- **Critical:** Pipeline completely broken, blocking all development
- **High:** Major feature not working (e.g., artifact download fails)
- **Medium:** Minor issue with workaround (e.g., Act needs manual step)
- **Low:** Documentation improvement, nice-to-have feature

### Regression Testing
- After fixing any bug, add test case to prevent regression
- Re-run full test suite after any workflow changes
- Verify Act behavior after updating Act or Docker images

## Success Criteria Validation
**Verify all requirements are met:**

- [ ] Build pipeline creates production build and uploads artifact with unique ID
- [ ] E2E test pipeline accepts build_id input parameter
- [ ] Component test pipeline accepts build_id input parameter
- [ ] Test pipelines download correct artifact before running tests
- [ ] Test pipelines have two distinct steps: "Setup Environment" and "Run Tests"
- [ ] "Run Tests" step can be re-run independently
- [ ] Act can run all pipelines locally with identical behavior
- [ ] Documentation exists for running pipelines locally with Act
- [ ] At least one successful test run demonstrates artifact reuse across pipelines

