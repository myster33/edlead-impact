

# Cluster Admin Sidebar Modules into Collapsible Groups

## Overview
The admin sidebar currently shows all 13 modules in a single flat list, which is long and hard to scan. This plan reorganizes them into logical collapsible groups with parent labels, while keeping the Account section (Settings) separate at the bottom.

## Proposed Grouping

```text
+----------------------------------+
|  Overview                        |
|    Dashboard                     |
|    Analytics                     |
|    Reports                       |
+----------------------------------+
|  Programme                       |
|    Applications                  |
|    Certificates                  |
|    Stories                       |
+----------------------------------+
|  Communication                   |
|    Live Chat               (3)   |
|    Message Center                |
|    Message Templates             |
|    Email Templates               |
+----------------------------------+
|  Administration                  |
|    Admin Users                   |
|    Permissions                   |
|    Audit Log                     |
+----------------------------------+
|  Account                         |
|    Settings                      |
+----------------------------------+
```

## How It Works
- Each group uses a collapsible `SidebarGroup` with a clickable label that expands/collapses
- The group containing the currently active route stays open by default
- All other groups start collapsed to keep the sidebar short
- Permission filtering still applies per item -- if a user cannot access any item in a group, that group is hidden entirely

## Technical Details

### File Modified: `src/components/admin/AdminLayout.tsx`
- Restructure `allMenuItems` into a grouped structure with `group` labels (Overview, Programme, Communication, Administration)
- Replace the single `SidebarGroup` with multiple collapsible `SidebarGroup` components, one per category
- Use the Collapsible primitive from Radix (already installed) or the sidebar's built-in collapsible group support
- Auto-expand the group that contains the active route using `location.pathname`
- Filter out entire groups that have zero visible items for the current user's role
- The "Account" group with Settings remains unchanged at the bottom

### No database or routing changes needed
All routes, permissions, and module keys remain identical -- this is purely a sidebar UI reorganization.
