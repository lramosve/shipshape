# Category 7: Accessibility Improvements

## Problem
Three custom modal dialogs lacked keyboard focus traps, allowing Tab key to escape behind the overlay. Six form inputs in AdminWorkspaceDetail lacked `aria-label` attributes, making them invisible to screen readers.

## Changes

### 1. Focus Trap Hook (`web/src/hooks/useFocusTrap.ts`)
- Created reusable `useFocusTrap(isActive)` hook
- Traps Tab/Shift+Tab within the dialog container
- Auto-focuses first focusable element on open
- Restores focus to trigger element on close

### 2. Modal Dialog Focus Traps
Applied `useFocusTrap` + `aria-labelledby` to:
- `ConversionDialog.tsx` — document type conversion confirmation
- `MergeProgramDialog.tsx` — program merge workflow
- `BacklogPickerModal.tsx` — issue picker with search

### 3. Form Input Labels (`AdminWorkspaceDetail.tsx`)
Added `aria-label` to 6 inputs:
- Member role select: `"Role for {member.name}"`
- User search input: `"Search users by email"`
- Add user role select: `"Role for new user"`
- Invite email input: `"Invite email address"`
- Invite role select: `"Role for invited user"`
- PIV Subject DN input: `"PIV X.509 Subject DN"`

### 4. Search Input Label (`BacklogPickerModal.tsx`)
- Added `aria-label="Search issues"` to the issue search field

## Before/After

| Metric | Before | After |
|--------|--------|-------|
| Dialogs with focus traps | 0/3 | 3/3 |
| Dialogs with aria-labelledby | 0/3 | 3/3 |
| Form inputs missing labels | 6 | 0 |
| Focus restored on close | No | Yes |

## Testing
- `npx tsc --noEmit` — passes with no type errors
- `npx vite build` — builds successfully
- Focus trap behavior: Tab cycles within dialog, Shift+Tab wraps, Escape closes
