# SDD Proposal — redesign-tracking-ux

## Intent
Simplify the AddToListModal and apply progressive disclosure to AnimeTrackingSection for a cleaner, focused tracking UX.

## Motivation
- AddToListModal is 497 lines with score + favorite sections that belong elsewhere (detail page, card heart button)
- "Colección Rápida" label is confusing — it's just favorites with a different name
- AnimeTrackingSection shows all 5 status pills and 10 score buttons at once — information overload
- Score editing belongs in the detail page, not the first-add modal

## Scope
- **AddToListModal**: Remove score, favorite, "Colección Rápida". Keep only Status + Collections.
- **AnimeTrackingSection**: Compact toolbar by default, expand inline on click for status/score pickers.
- No backend changes. No new components. No style system changes.

## Approach
1. Simplify AddToListModal (~497 → ~260 lines)
2. Progressive disclosure in AnimeTrackingSection (~178 → ~150 lines)
3. Keep framer-motion AnimatePresence for smooth expand/collapse

## Out of scope
- Score section on detail page (separate change)
- Backend action changes
- Responsive modal variant extraction
