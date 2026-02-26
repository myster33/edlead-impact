

## Plan: Restructure Admin Sidebar Layout

### What Changes

**1. Move account profile to the top-right header area**
- Remove the profile picture, name, position, role, and location from the sidebar footer
- Add a profile dropdown in the header (top-right), next to the theme toggle
- The dropdown trigger will show the avatar and name
- The dropdown menu will display full profile details (name, position, role, location), a link to Settings, and Sign Out
- The Online Admins panel moves into the sidebar footer (kept minimal) or stays in the dropdown

**2. Flatten the sidebar menu (remove collapsible groups)**
- Remove the `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent` wrappers
- List all modules as a single flat list in their current order: Dashboard, Analytics, Reports, Applications, Certificates, Stories, Live Chat, Message Center, Message Templates, Email Templates, Admin Users, Permissions, Audit Log, Settings
- Each item keeps its icon, active state styling, and badges (chat unread, pending blogs)

**3. Sidebar footer simplification**
- Footer will only contain the Online Admins panel (if any are online) and the Sign Out button
- Or footer can be removed entirely if Sign Out moves to the header profile dropdown

### Technical Details

**File: `src/components/admin/AdminLayout.tsx`**

- Remove imports: `ChevronDown`, `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger`, `Eye`, `GraduationCap`, `Radio`, `ShieldCheck` (group icons no longer needed)
- Create a flat `allFilteredItems` array from `filteredGroups.flatMap(g => g.items)` plus the Settings item
- Replace the grouped sidebar content with a single `<SidebarMenu>` iterating over the flat list
- Move the avatar + profile info + sign out into a `<DropdownMenu>` in the header, positioned after the theme toggle
- Sidebar footer: keep only the Online Admins panel (compact) or remove entirely
- The `AdminBreadcrumb` component still receives `filteredGroups` for breadcrumb path resolution (no change needed there)

### Layout After Change

```text
HEADER: [☰] [Breadcrumb...] [Search] [🔔] [💬] [🌙] [👤 Name ▾]
                                                        └─ Dropdown:
                                                           Name / Position
                                                           Role / Location
                                                           ─────────────
                                                           Settings
                                                           Sign Out

SIDEBAR:
  [Logo + Admin badge]
  ─────────────────────
  Dashboard
  Analytics
  Reports
  Applications
  Certificates
  Stories
  Live Chat        (3)
  Message Center
  Message Templates
  Email Templates
  Admin Users
  Permissions
  Audit Log
  Settings
  ─────────────────────
  Online Now (2)
  [avatars...]
```

