

# Admin Panel Power Upgrades -- 5 Features

## 1. Command Palette (Cmd+K / Ctrl+K)

A searchable modal that lets admins quickly jump to any module, action, or page by typing.

- Create a new component `src/components/admin/CommandPalette.tsx` using the existing `cmdk` library (already installed)
- Wraps in a Dialog triggered by Cmd+K (Mac) / Ctrl+K (Windows)
- Populates with all menu items from the filtered groups (respects permissions)
- Includes quick actions: "Sign Out", "Toggle Theme", "Open Settings"
- Navigates on selection using `react-router-dom`'s `useNavigate`
- Rendered inside `AdminLayout` alongside the sidebar

## 2. Sidebar Group Unread Badges

Show a combined unread count on collapsed sidebar group labels so admins can see at a glance which category needs attention.

- Extend the `menuGroups` data structure with an optional `badgeCount` computed value
- For the "Communication" group: aggregate the existing `unreadChats` count onto the group label
- Display a small `Badge` next to the group label text (only when the group is collapsed)
- Uses existing `unreadChats` state -- no new database queries needed

## 3. Breadcrumb Navigation in Header

Replace the plain title in the header with a breadcrumb showing `Group > Module`.

- Create `src/components/admin/AdminBreadcrumb.tsx` using the existing `Breadcrumb` UI components
- Derives the current group and item from `location.pathname` and `filteredGroups`
- Shows: `Admin Panel / [Group Label] / [Module Title]`
- Group label links to the first item in that group; module title is the current page
- Integrated into the header section of `AdminLayout`, replacing the current `h1` title

## 4. Real-Time Activity Feed on Dashboard

A live-updating feed widget showing recent events across the platform.

- Create `src/components/admin/ActivityFeed.tsx`
- Queries the existing `admin_audit_log` table for the latest 20 events
- Subscribes to realtime changes on `admin_audit_log` for live updates
- Each entry shows: icon (based on action type), description, relative timestamp, and admin name
- Also pulls recent `applications` (new submissions) and `blog_posts` (new pending stories)
- Rendered as a Card on the Dashboard page below the existing stats

## 5. Keyboard Shortcuts with Help Overlay

Global keyboard shortcuts for fast navigation, with a `?` key overlay showing all available shortcuts.

- Create `src/components/admin/KeyboardShortcuts.tsx` -- a global listener component
- Create `src/components/admin/ShortcutsHelpDialog.tsx` -- a modal listing all shortcuts
- Shortcuts:
  - `G then D` -- Go to Dashboard
  - `G then A` -- Go to Applications
  - `G then C` -- Go to Chat
  - `G then S` -- Go to Settings
  - `?` -- Show shortcuts help
  - `Cmd/Ctrl + K` -- Open command palette
- Uses a two-key sequence listener (press G, then within 1 second press the second key)
- Disabled when user is focused on an input/textarea to avoid conflicts
- Both components rendered inside `AdminLayout`

---

## Files to Create
| File | Purpose |
|------|---------|
| `src/components/admin/CommandPalette.tsx` | Cmd+K searchable command palette |
| `src/components/admin/AdminBreadcrumb.tsx` | Header breadcrumb navigation |
| `src/components/admin/ActivityFeed.tsx` | Real-time activity feed widget |
| `src/components/admin/KeyboardShortcuts.tsx` | Global keyboard shortcut listener |
| `src/components/admin/ShortcutsHelpDialog.tsx` | Shortcuts help overlay (? key) |

## Files to Modify
| File | Changes |
|------|---------|
| `src/components/admin/AdminLayout.tsx` | Add CommandPalette, KeyboardShortcuts, ShortcutsHelpDialog components; replace header title with AdminBreadcrumb; add unread badge to Communication group label |
| `src/pages/admin/AdminDashboard.tsx` | Add ActivityFeed component below stats cards |

## No Database Changes
All features use existing tables (`admin_audit_log`, `chat_messages`, `applications`, `blog_posts`). No migrations needed.

