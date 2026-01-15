# Project Context: Latnotate

## Goal

Create a modern Web UI for "Whitaker's Words" (a Latin dictionary) using Vercel Serverless Functions.

## Architecture Decisions

1.  **Frontend/Backend:** Next.js (App Router).
2.  **Language:** TypeScript.
3.  **Deployment:** Vercel (Hobby Tier).
4.  **Core Logic:** Keep existing Ada codebase (`whitakers-words`), compile to Linux binary, and execute via Node.js `child_process` in an API route.
5.  **Package Manager:** pnpm.

## Current State

- `whitakers-words/` contains the Ada source and data files (`.LAT`, `.GEN`).
- User is on Arch Linux.
- User will delete the current directory and re-initialize.
- Need to re-clone or restore `whitakers-words` after Next.js init.

## Implementation Plan (Post-Reset)

1.  Initialize Next.js app in root: `pnpm create next-app .`
2.  Restore `whitakers-words` directory.
3.  Create API route (`app/api/lookup/route.ts`) to wrap the binary.
4.  Create simple frontend to query the API.
