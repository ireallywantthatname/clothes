# Project Context

This is a Next.js web application designed as a personal closet management and outfit matching tool, featuring a "Slot Machine" interface for mixing and matching tops and bottoms.

## Tech Stack

- **Framework**: Next.js (App Router, version 16.2.9)
- **Runtime & Package Manager**: Bun
- **Styling**: Tailwind CSS v4
- **Backend**: Convex (database + file storage).
- **Storage**: Convex file storage. Clothing photos are stored as `Id<"_storage">` and served via `ctx.storage.getUrl`.
- **Additional Features**: Background removal utilizing `@imgly/background-removal` and `onnxruntime-web`.

## Core Features

- **Passcode Protection**: The app can be secured via a simple passcode gate controlled by the Convex `PASSCODE` environment variable.
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
  - Fields: `storageId`, `category` (top/bottom), `status` (available/unavailable), `nickname`.
- **`matches`**: Stores saved outfit pairings.
  - Fields: `topId`, `bottomId`.
  - Duplicate pairs are rejected in the save mutation via the `by_topId_and_bottomId` index.

## Key Directories & Files

- `convex`: Schema, passcode check, clothes and matches queries/mutations.
- `src/app`: Next.js pages and layouts.
- `src/components`: UI components including `ClothesSlotMachine`, `ClothesStrip`, `UploadForm`, and `MatchesList`.
- `src/lib`: Passcode client store, background removal logic, and type definitions (`types.ts`).
