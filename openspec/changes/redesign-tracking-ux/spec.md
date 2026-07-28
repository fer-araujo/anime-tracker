# SDD Spec — redesign-tracking-ux

## Requirements

### R1: AddToListModal — simplify
1.1 Remove `setScore` import and score state + UI section  
1.2 Remove Favorite toggle card (handled by AnimeCard FavButton)  
1.3 Remove "Colección Rápida" label entirely  
1.4 Keep: Status selection, Collections toggles, "Nueva" button, CreateListDialog  
1.5 `handleConfirm` only handles status changes (remove fav/score logic)  
1.6 Confirm button disabled condition simplified: only needs `selectedStatus`  
1.7 Target: ~260 lines (down from 497)

### R2: AnimeTrackingSection — progressive disclosure
2.1 Default compact view: status pill (current status), score badge, fav button, delete, lists button  
2.2 Clicking status pill → expand inline with AnimatePresence to show all 5 status options  
2.3 Clicking score badge → expand inline with AnimatePresence to show 10 score buttons  
2.4 Clicking outside or selecting a value collapses the expanded picker  
2.5 Keep auth gate and loading states  
2.6 Target: ~150 lines (down from 178)

### R3: Remove "Colección Rápida" label globally
3.1 No component references this label anymore after R1

## Scenarios

### S1: User adds anime to list the first time
- Opens modal → sees Status selection + Collections
- Selects a status → Confirm button active
- Clicks Confirm → status saved, modal closes

### S2: User edits existing tracking entry
- Opens modal → shows current status pre-selected + Collections
- Can change status or toggle collection membership
- Confirm saves status change

### S3: User views tracking section on detail page
- Sees compact toolbar: status "Viendo" pill, score "8/10" badge, fav heart, delete, lists
- Clicks status pill → 5 status options expand with animation
- Selects new status → picker collapses, status updated
- Clicks score badge → 10 score buttons expand
- Clicks a score → picker collapses, score updated
