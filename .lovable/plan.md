

# edLEAD School Chat Module

## Overview
Build a per-school AI chat assistant accessible to Students, Parents/Guardians, Educators/Teachers, and Guests on mobile. Each school gets its own chat instance trained on school-specific knowledge uploaded by school admins. Users can switch between schools.

## Architecture

```text
┌──────────────────────────────┐
│   Public Mobile Chat Page    │
│   /school-chat or /s/:code   │
│                              │
│  ┌─ School Selector ───────┐ │
│  │ Pick school by name/code│ │
│  └─────────────────────────┘ │
│  ┌─ Role Selector ─────────┐ │
│  │ Student/Parent/Educator/ │ │
│  │ Guest                    │ │
│  └─────────────────────────┘ │
│  ┌─ Chat Interface ────────┐ │
│  │ Messages + AI responses  │ │
│  │ School-branded header    │ │
│  └─────────────────────────┘ │
└──────────────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Edge Function:              │
│  school-chat-ai              │
│  - Loads school knowledge    │
│  - Builds system prompt      │
│  - Calls AWS Bedrock         │
└──────────────────────────────┘
```

## Database Changes

### 1. New table: `school_chat_knowledge`
Stores knowledge articles uploaded by school admins to train their school's AI.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| school_id | uuid | FK → schools |
| title | text | Article title |
| content | text | Knowledge content |
| category | text | e.g. "policies", "fees", "calendar", "general" |
| is_active | boolean | default true |
| created_by | uuid | FK → school_users |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: School staff can CRUD for their school. Public can SELECT active entries (needed by edge function via service role).

### 2. New table: `school_chat_conversations`
Per-school chat sessions.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| school_id | uuid | FK → schools |
| session_id | text | Browser session |
| visitor_name | text | nullable |
| visitor_role | text | student/parent/educator/guest |
| status | text | open/closed |
| created_at | timestamptz | |
| last_message_at | timestamptz | |

### 3. New table: `school_chat_messages`
Messages within school chat conversations.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| conversation_id | uuid | FK → school_chat_conversations |
| sender_type | text | visitor/assistant |
| content | text | |
| is_ai_response | boolean | default false |
| created_at | timestamptz | |

Enable realtime on `school_chat_messages`.

## Backend: Edge Function `school-chat-ai`

- Receives: `{ school_id, messages, visitor_role }`
- Loads active knowledge from `school_chat_knowledge` for that school
- Loads school name/details from `schools` table
- Builds a system prompt: general school assistant persona + injected knowledge base + visitor role context
- Calls AWS Bedrock (existing `bedrock-utils.ts`)
- Returns `{ reply }` 
- Rate limited per IP

## Frontend Components

### 1. School Chat Settings Tab (in SchoolSettings.tsx)
New "AI Chat" tab for school_admin/hr users:
- List/add/edit/delete knowledge articles
- Categories: General, Policies, Fees, Calendar, Curriculum, Contact, Custom
- Simple form: title + content textarea
- Toggle articles active/inactive

### 2. Public School Chat Page (`/school-chat`)
- Mobile-first, standalone page (no Navbar/Footer for full-screen chat experience)
- **Step 1**: Search/select a school (from verified schools list)
- **Step 2**: Enter name and select role (Student/Parent/Educator/Guest)
- **Step 3**: Chat interface with school-branded header (logo + school name)
- School switcher button to change school without losing identity
- Similar UX to existing ChatWidget but full-page and school-scoped

### 3. Route
Add `/school-chat` to App.tsx as a public route (no auth required).

## Implementation Steps

1. Create database migration (3 tables + RLS + realtime)
2. Create `school-chat-ai` edge function
3. Build knowledge management UI in SchoolSettings
4. Build public `/school-chat` page with school selector, role picker, and chat interface
5. Add route to App.tsx

## Key Decisions
- Uses AWS Bedrock (per existing constraint) — not Lovable AI
- No authentication required for chat users (guest access)
- Knowledge base is injected into system prompt (not RAG/embeddings — simple and effective for moderate knowledge sizes)
- Each school's chat is isolated by school_id

