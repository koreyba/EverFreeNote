---
phase: design
title: System Design & Architecture
description: Define the technical architecture, components, and data models
---

# System Design & Architecture

## Architecture Overview
**What is the high-level system structure?**

- Mermaid diagram of config and secret flow:
  ```mermaid
  graph TD
    Dev[Developer] --> Repo[Git repo (no secrets)]
    Dev --> LocalEnv[Local .env (ignored)]
    Repo --> CI[GitHub Actions]
    CI --> SecretStore[GitHub Secrets]
    CI --> Build[Build and tests]
    Repo --> Pages[Cloudflare Pages]
    Pages --> PagesEnv[Cloudflare Pages env vars]
    App[Application] --> Config[Config loader]
    Config --> EnvVars[Environment variables]
    Config --> Examples[Example config files]
    PagesEnv --> EnvVars
  ```
- Key components and their responsibilities
  - Repo contains only non-sensitive configuration and documentation.
  - Local env files hold developer secrets and are gitignored.
  - CI pulls secrets from a managed store and injects them at runtime.
  - The app reads required values through a centralized config loader.
- Technology choices and rationale
  - Environment variables and CI secret stores are standard, portable, and low friction.
  - Secret scanning with gitleaks prevents regressions and establishes a baseline.

## Data Models
**What data do we need to manage?**

- Core entities and their relationships
  - Configuration schema defining required and optional env vars.
  - Example config files (for placeholders only, no secrets).
- Data schemas/structures
  - A documented list of env vars with types, defaults, and usage notes.
- Data flow between components
  - Secrets flow from local env, GitHub Secrets (CI), or Cloudflare Pages env vars into the config loader at runtime.

## API Design
**How do components communicate?**

- External APIs (if applicable)
  - None required for this change.
- Internal interfaces
  - Config loader interface that reads and validates env vars.
- Request/response formats
  - Not applicable.
- Authentication/authorization approach
  - Secrets are injected through environment variables and not stored in the repo.

## Component Breakdown
**What are the major building blocks?**

- Frontend components (if applicable)
  - Configuration usage in UI runtimes must rely on env vars only.
- Backend services/modules
  - Config loader and validation logic.
- Database/storage layer
  - No changes.
- Third-party integrations
  - GitHub Actions secrets, Cloudflare Pages environment variables, and optional secret scanning tool.

## Design Decisions
**Why did we choose this approach?**

- Use env vars for secrets to keep the repo clean and portable.
- Provide example config files to make setup clear without leaking values.
- Use gitleaks for automated secret scanning to catch future regressions.
- Rewrite git history if committed secrets are found.

## Non-Functional Requirements
**How should the system perform?**

- Performance targets
  - No measurable runtime impact beyond config validation.
- Scalability considerations
  - Config approach works for local, CI, and production environments.
- Security requirements
  - No secrets in tracked files or history; rotate any exposed credentials.
- Reliability/availability needs
  - Fail fast with clear errors when required env vars are missing.
