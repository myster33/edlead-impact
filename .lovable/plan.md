
## Plan: Multi-Select Bookings with Confirmation Dialog

### What Changes

**1. Add checkboxes for multi-selection**
- Add a "select all" checkbox in the table header
- Add individual checkboxes per booking row
- Track selected booking IDs in state

**2. Add bulk action bar**
- When bookings are selected, show a toolbar with "Confirm Selected" and "Cancel Selected" buttons
- Display count of selected bookings (e.g., "3 selected")

**3. Add confirmation dialog (AlertDialog)**
- Before any status change (both single and bulk), show an "Are you sure?" dialog
- Dialog shows the action being taken and number of affected bookings
- User must click "Yes, continue" to proceed

**4. Keep individual status dropdown**
- The per-row Select dropdown remains, but now also triggers the confirmation dialog before executing

### Technical Details

**File modified:** `src/components/admin/events/AdminEventBookingsTab.tsx`

- New state: `selectedIds: Set<string>`, `pendingAction: { ids: string[], status: string } | null`
- Import `Checkbox` from `@/components/ui/checkbox` and `AlertDialog` components
- Add a `bulkUpdateStatus` mutation that loops through selected IDs using the existing `updateStatus` logic
- The AlertDialog opens when `pendingAction` is set; on confirm it executes, on cancel it clears
