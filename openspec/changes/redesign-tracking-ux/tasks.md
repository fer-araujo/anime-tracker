# SDD Tasks — redesign-tracking-ux

## Task 1: Simplify AddToListModal
**Files**: `anime-tracker-ui/src/components/common/AddToListModal.tsx`
**Target**: ~260 lines (from 497)

Changes:
1. Remove `setScore` from import line 13
2. Remove score state (`setScoreState`, `score`) lines 39-41
3. Remove `scoreChanged` and score handling from `handleConfirm` lines 55, 80-82
4. Remove Favorite toggle card section (lines 224-293)
5. Remove Score selector section (lines 295-322)
6. Remove `toggleFavorite` import (line 11), `isFav` state (line 38), `favChanged` (line 54), fav handling (lines 76-78)
7. Simplify `handleConfirm`: only check `statusChanged`
8. Simplify confirm button disabled condition: only need `!selectedStatus`
9. Remove the divider lines that separated removed sections
10. Remove the "Colección Rápida" label
11. Clean up unused imports

## Task 2: AnimeTrackingSection progressive disclosure
**Files**: `anime-tracker-ui/src/components/AnimeTrackingSection.tsx`
**Target**: ~150 lines (from 178)

Changes:
1. Add `useState` for `showStatusPicker` and `showScorePicker`
2. Default compact view: current status pill (clickable), score badge (clickable), fav button, remove button
3. Add "Mis Listas" button to open AddToListModal (accept new `onOpenLists` prop)
4. On status pill click → expand AnimatePresence with 5 status options
5. On score badge click → expand AnimatePresence with 10 score buttons
6. Collapse picker on selection or when clicking other button
7. Import `motion`, `AnimatePresence` from `framer-motion`

## Task 3: Update parent to pass new props
**Files**: `anime-tracker-ui/src/components/AnimeDetails.tsx`

Changes:
1. Pass `onOpenLists` to AnimeTrackingSection that opens the tracking modal

## Task 4: Build + Test
Run `npx next build` and `npx vitest run`, fix any type errors.

## Task 5: Commit
Conventional commit with structured message.
