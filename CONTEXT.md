# Project Context

This is a Next.js web application designed as a personal closet management and outfit matching tool, featuring a "Slot Machine" interface for mixing and matching tops and bottoms.

## Tech Stack

- **Framework**: Next.js (App Router, version 16.2.9)
- **Runtime & Package Manager**: Bun
- **Styling**: Tailwind CSS v4
- **Database**: LibSQL (SQLite) via `@libsql/client`. Supports local file-based database (`data/clothes.db`) and remote Turso database.
- **Storage**: Vercel Blob (remote) with local filesystem fallback (`data/uploads`).
- **Additional Features**: Background removal utilizing `@imgly/background-removal` and `onnxruntime-web`.

## Core Features

- **Passcode Protection**: The app can be secured via a simple passcode gate controlled by the `PASSCODE` environment variable.
- **Closet Management**:
  - Upload images of clothing items categorized as `top` or `bottom`.
  - Assign optional personal nicknames to items.
  - Toggle item status between `available` and `unavailable` (e.g., in laundry).
  - Delete items.
- **Outfit Matching**:
  - A slot-machine-style interface to randomly or manually pair tops and bottoms.
  - Save favorite outfit combinations to a `matches` table.
  - View and delete saved matches.

## Data Model

- **`clothes`**: Stores individual clothing items.
  - Fields: `id`, `image_url`, `category` (top/bottom), `status` (available/unavailable), `nickname`, `created_at`.
- **`matches`**: Stores saved outfit pairings.
  - Fields: `id`, `top_id` (references clothes.id), `bottom_id` (references clothes.id), `created_at`.
  - Includes a `UNIQUE(top_id, bottom_id)` constraint to prevent duplicate saved matches.

## Key Directories & Files

- `src/app`: Contains the Next.js pages, layouts, and server actions (`actions.ts`).
- `src/components`: UI components including `ClothesSlotMachine`, `ClothesStrip`, `UploadForm`, and `MatchesList`.
- `src/lib`: Core logic, database setup (`db.ts`), background removal logic, and type definitions (`types.ts`).
