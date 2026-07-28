# SDD Design — redesign-tracking-ux

## Component Architecture

### AddToListModal (simplified)
```
┌─────────────────────────────────────┐
│  Header: "Añadir a mi lista"   [X] │
├─────────────────────────────────────┤
│  Status Selection                   │
│  ┌─ Plan para ver ─────────────────┐│
│  ├──────┬──────┬──────┬──────┬──────┤│
│  │Viendo│Compl │Pausa │Aband │...   ││
│  └──────┴──────┴──────┴──────┴──────┘│
│  ─────────────────────────────────── │
│  Custom Collections                  │
│  [Lista 1] [Lista 2]    [+ Nueva]   │
├─────────────────────────────────────┤
│  [Eliminar]       [Cancelar] [Añadir]│
└─────────────────────────────────────┘
```

**Removed**: Favorite toggle card, Score selector, "Colección Rápida" label  
**Simplified**: handleConfirm only deals with status, button disabled only needs status

### AnimeTrackingSection (progressive disclosure)
```
Compact (default):
┌──────────────────────────────────────────┐
│ [Viendo ▼]  [8/10 ▼]  [♥]  [🗑]  [📋]  │
└──────────────────────────────────────────┘

Expanded status (after clicking [Viendo ▼]):
┌──────────────────────────────────────────┐
│ [Viendo] [Completado] [En pausa]         │
│ [Abandonado] [Plan para ver]             │
└──────────────────────────────────────────┘

Expanded score (after clicking [8/10 ▼]):
┌──────────────────────────────────────────┐
│ [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]│
└──────────────────────────────────────────┘
```

## States

### AddToListModal states
- **Default**: Status unselected, no collections selected, "Añadir a mi lista" button disabled
- **Status selected**: Confirm button enabled, shows "Añadir a mi lista"
- **Submitting**: Loading spinner on confirm button, all inputs disabled
- **Error**: Red error banner above footer
- **Existing entry**: Status pre-selected, button says "Guardar Cambios", delete button visible

### AnimeTrackingSection states
- **Auth loading**: null (return nothing)
- **Unauthenticated**: Login prompt with link
- **Loading**: Spinner with "Sincronizando progreso..."
- **Compact view (default)**: Status pill + score badge + action buttons
- **Expanded status picker**: 5 status options with AnimatePresence
- **Expanded score picker**: 10 score buttons with AnimatePresence
- **No entry yet**: Only shows "Añadir" button (no remove, no score)

## Animation
- Status/score pickers use `motion.div` with `AnimatePresence`
- Expand: opacity 0→1, height from 0→auto, scale 0.95→1
- Collapse: reverse
- Duration: 200ms ease-out
