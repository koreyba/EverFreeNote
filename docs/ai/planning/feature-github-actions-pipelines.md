---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [ ] Milestone 1: Build pipeline with artifact upload working
- [ ] Milestone 2: Test pipelines consuming artifacts working
- [ ] Milestone 3: Act local testing fully functional
- [ ] Milestone 4: Documentation and team onboarding complete

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Build Pipeline Setup
- [x] **Task 1.1:** Create `.github/workflows/build.yml`
  - Define triggers (push, PR, workflow_dispatch)
  - Setup Node.js environment
  - Install dependencies with caching
  - Run `npm run build`
  - Upload artifact with `build-${{ github.run_id }}` naming
  - Output artifact ID for reference
  - **Estimate:** 1-2 hours

- [ ] **Task 1.2:** Test build pipeline on GitHub
  - Push to test branch
  - Verify artifact is created and uploaded
  - Check artifact contents in GitHub UI
  - Verify artifact naming convention
  - **Estimate:** 30 minutes

### Phase 2: E2E Test Pipeline Refactor
- [x] **Task 2.1:** Create `.github/workflows/e2e-tests.yml`
  - Add `workflow_dispatch` with `build_id` input
  - Add download artifact step
  - Split into "Setup Environment" and "Run Tests" jobs
  - Setup Supabase in separate job/step
  - Configure job dependencies
  - **Estimate:** 2-3 hours

- [x] **Task 2.2:** Configure Supabase for CI
  - Ensure Supabase CLI is installed
  - Start Supabase with migrations
  - Configure environment variables
  - Add health check before tests
  - **Estimate:** 1-2 hours

- [ ] **Task 2.3:** Test E2E pipeline with artifact
  - Manually trigger with build ID from Phase 1
  - Verify artifact download works
  - Verify tests run successfully
  - Test re-running only "Run Tests" step
  - **Estimate:** 1 hour

### Phase 3: Component Test Pipeline Refactor
- [x] **Task 3.1:** Create `.github/workflows/component-tests.yml`
  - Add `workflow_dispatch` with `build_id` input
  - Add download artifact step
  - Split into "Setup Environment" and "Run Tests" jobs
  - Configure job dependencies
  - **Estimate:** 1-2 hours

- [ ] **Task 3.2:** Test component pipeline with artifact
  - Manually trigger with build ID
  - Verify artifact download works
  - Verify tests run successfully
  - Test re-running only "Run Tests" step
  - **Estimate:** 30 minutes

### Phase 4: Act Local Testing Setup
- [x] **Task 4.1:** Install and configure Act
  - Install Act CLI on Windows
  - Create `.actrc` configuration file
  - Define Docker images matching GitHub runners
  - Configure Act platform mappings
  - **Estimate:** 1 hour

- [x] **Task 4.2:** Create local secrets configuration
  - Create `.github/act-secrets` file (gitignored)
  - Document required secrets
  - Add secrets to `.gitignore`
  - Create `.github/act-secrets.example` template
  - **Estimate:** 30 minutes

- [x] **Task 4.3:** Add npm scripts for Act
  - Add `act:build` script to run build pipeline locally
  - Add `act:e2e` script to run E2E tests locally
  - Add `act:component` script to run component tests locally
  - Add `act:list` script to list available workflows
  - **Estimate:** 30 minutes

- [ ] **Task 4.4:** Test all pipelines locally with Act
  - Run build pipeline with Act
  - Verify artifact is created locally
  - Run E2E tests with Act using local artifact
  - Run component tests with Act using local artifact
  - Document any differences from GitHub Actions
  - **Estimate:** 2-3 hours

### Phase 5: Integration & Polish
- [x] **Task 5.1:** Add pipeline orchestration
  - Create workflow that triggers tests after build completes
  - Use `workflow_run` trigger or similar
  - Pass build ID to test workflows
  - **Estimate:** 1-2 hours
  - **Notes:** Created `ci.yml` that orchestrates build + tests automatically

- [x] **Task 5.2:** Add error handling and retries
  - Add retry logic for artifact download
  - Add clear error messages for missing artifacts
  - Add timeout configurations
  - **Estimate:** 1 hour
  - **Notes:** Added artifact validation, clear error messages, and timeouts

- [x] **Task 5.3:** Optimize pipeline performance
  - Add caching for node_modules
  - Add caching for Cypress binary
  - Optimize Docker layer caching for Act
  - **Estimate:** 1-2 hours
  - **Notes:** Added caching for node_modules, Cypress, and Supabase CLI

- [x] **Task 5.4:** Create documentation
  - Document pipeline architecture
  - Document how to run pipelines locally with Act
  - Document how to trigger test pipelines manually
  - Document troubleshooting common issues
  - Update README with new pipeline information
  - **Estimate:** 2 hours
  - **Notes:** Created comprehensive `docs/GITHUB_ACTIONS_PIPELINES.md`

- [x] **Task 5.5:** Update `.gitignore`
  - Add `.github/act-secrets`
  - Add Act cache directories
  - Add local artifact directories
  - **Estimate:** 15 minutes

## Dependencies
**What needs to happen in what order?**

### Critical Path
1. **Build pipeline must work first** → All test pipelines depend on artifacts
2. **Act configuration must be done before local testing** → Can't test locally without Act setup
3. **Individual test pipelines must work** → Before adding orchestration

### External Dependencies
- GitHub Actions artifact storage (existing service)
- Supabase CLI (already in use)
- Docker Desktop (for Act on Windows)
- Act CLI (needs installation)

### Parallel Work Opportunities
- E2E and Component test pipelines can be developed in parallel (Phase 2 & 3)
- Documentation can be written while testing pipelines (Phase 5)
- Act configuration can start during Phase 2

## Timeline & Estimates
**When will things be done?**

### Total Estimated Effort
- Phase 1: 1.5-2.5 hours
- Phase 2: 4-6 hours
- Phase 3: 1.5-2.5 hours
- Phase 4: 4-5 hours
- Phase 5: 5-6.5 hours
- **Total: 16.5-22.5 hours** (2-3 working days)

### Milestones Timeline
- **Day 1:** Complete Phases 1-2 (Build + E2E pipelines)
- **Day 2:** Complete Phases 3-4 (Component tests + Act setup)
- **Day 3:** Complete Phase 5 (Integration, optimization, docs)

### Buffer
- Add 20% buffer for unexpected issues: **20-27 hours total**

## Risks & Mitigation
**What could go wrong?**

### Risk 1: Act Behavior Differs from GitHub Actions
**Likelihood:** Medium  
**Impact:** High  
**Mitigation:**
- Use official GitHub runner images in Act
- Test thoroughly with Act before pushing
- Document any known differences
- Have fallback to GitHub Actions testing if Act fails

### Risk 2: Artifact Download Failures
**Likelihood:** Low  
**Impact:** Medium  
**Mitigation:**
- Add retry logic with exponential backoff
- Add clear error messages
- Validate artifact exists before download
- Set appropriate timeout values

### Risk 3: Supabase Setup Fails in CI
**Likelihood:** Medium  
**Impact:** High  
**Mitigation:**
- Add health checks before running tests
- Use Supabase CLI with explicit versions
- Add detailed logging for debugging
- Test locally with Act first

### Risk 4: Windows-Specific Act Issues
**Likelihood:** Medium  
**Impact:** Medium  
**Mitigation:**
- Use WSL2 backend for Docker Desktop
- Document Windows-specific setup steps
- Test on actual Windows environment
- Have Linux VM as backup testing environment

### Risk 5: Artifact Retention Issues
**Likelihood:** Low  
**Impact:** Low  
**Mitigation:**
- Use GitHub's default retention (90 days)
- Document artifact lifecycle
- Add cleanup job for old artifacts if needed

## Resources Needed
**What do we need to succeed?**

### Tools & Services
- GitHub Actions (existing)
- Docker Desktop for Windows (needs installation if not present)
- Act CLI (needs installation)
- Supabase CLI (existing)
- Node.js (existing)

### Access & Permissions
- GitHub repository write access (for creating workflows)
- GitHub Actions secrets access (for configuring pipelines)
- Supabase project access (existing)

### Documentation & Knowledge
- GitHub Actions documentation
- Act documentation and examples
- Supabase CLI documentation
- Cypress CI documentation
- Next.js build/export documentation

### Team Members
- Primary developer (implementation and testing)
- Reviewer (code review and validation)

