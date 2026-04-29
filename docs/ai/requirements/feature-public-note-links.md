---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Public Note Links Requirements

## Problem Statement

EverFreeNote users need a simple way to share a single note with people who do not have access to their workspace. Today notes are private to the authenticated owner, so sharing requires copying content manually or giving broader account access.

The first release started on web, and the mobile app now needs the same owner-facing share action while reusing the shared core link creation, lookup, validation, and share-state models.

## Goals & Objectives

- Add a "Share note" action to the existing note three-dot menu on the web app.
- Add a "Share note" action to the existing note options menu in the mobile app.
- Show a focused share popup/dialog for the selected note.
- Support exactly one permission option for now: "Anyone with the link can view".
- Generate a public URL that opens a dedicated read-only public note page.
- Public viewers can see only the shared note title, body text/content, and tags.
- Public tags are visual labels only; they are not clickable filters.
- Public viewers cannot edit the note, see the note list, access search, or navigate to other private notes.
- Keep share-link domain logic in `core` and platform UI/adapters in `ui/web` and `ui/mobile`.

## Non-Goals

- Native mobile public-note viewing; recipients continue to open the public web route for now.
- Permission variants such as restricted users, edit access, password protection, expiration, or comments.
- Public search, public notebooks, public tag pages, analytics, or link previews beyond normal page metadata.
- Collaborative editing or live cursors.

## User Stories & Use Cases

- As a note owner, I want to open a note menu and choose "Share note" so I can create a view-only public link without leaving the editor.
- As a mobile note owner, I want the note options menu to offer "Share note" and open a native sheet with the generated link.
- As a note owner, I want to copy an existing public link if the note was already shared so I do not create duplicates.
- As a note owner, I want the dialog to state "Anyone with the link can view" so the access level is unambiguous.
- As a recipient, I want a clean public page showing the title, content, and tags so I can read the note without signing in.
- As a recipient, I must not see app navigation, note lists, search, edit controls, or clickable tags.
- As a future mobile developer, I want share-link creation and retrieval contracts in core so mobile can reuse the same behavior.

## Success Criteria

- A user can generate or retrieve a public link from the web note menu.
- A user can generate or retrieve a public link from the mobile note options menu.
- Opening the link as an unauthenticated viewer renders the note title, sanitized content, and non-clickable tags.
- The public page exposes no private app shell, note list, search input, edit controls, delete actions, AI index actions, or links to other notes.
- Public-link lookup returns only the note bound to the token/slug.
- Existing authenticated note CRUD, search, AI index, and WordPress export behavior continues to work.
- Shared logic is located in `core` with platform-specific UI under `ui/web` and `ui/mobile`.

## Constraints & Assumptions

- Backend remains Supabase.
- Public links use an unguessable token/slug stored server-side and mapped to exactly one note.
- The current scope does not require revocation UI, but the data model should allow disabling a link later.
- Note owner authentication is required to create a share link.
- Public read access must not depend on the viewer's auth session.
- Note content may contain rich HTML and must be sanitized before public rendering.
- Mobile link generation needs a public web origin. It may be configured explicitly or derived from the mobile editor WebView URL.

## Resolved Assumptions

- Revocation UI is not part of the first web release; the schema includes `is_active` so revocation can be added later.
- Public pages use `noindex` by default for a privacy-friendly MVP.
- No blocking clarification questions remain for implementation.
