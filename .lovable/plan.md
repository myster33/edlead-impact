
# Chat Widget Upgrade: WhatsApp Escalation, UI Refresh, and AI FAQ

This plan covers three major enhancements to the live chat system.

---

## 1. WhatsApp Escalation After 3 Minutes

When a visitor sends a message and no admin replies within 3 minutes, the system will automatically forward the conversation to WhatsApp so your team never misses a query.

**How it works:**
- The chat intro form will add an optional **phone number** field so the visitor can provide their WhatsApp number
- A new backend function (`chat-whatsapp-escalation`) will run when triggered, checking for unanswered visitor messages older than 3 minutes
- It will compose a summary of the conversation and send it via WhatsApp to both the visitor (if they gave a phone number) and/or a designated edLEAD support WhatsApp number
- On the visitor side, after 3 minutes without a reply, the widget will show a friendly notice: "Our team is currently away. We've forwarded your message to WhatsApp and will reply shortly."
- A `visitor_phone` column will be added to `chat_conversations`
- An `escalated_to_whatsapp` boolean column will track whether escalation already happened (to prevent duplicate sends)

**Database changes:**
- Add `visitor_phone TEXT` and `escalated_to_whatsapp BOOLEAN DEFAULT false` columns to `chat_conversations`

---

## 2. Improved Chat Widget UI

The floating chat button and widget will get a visual refresh to be more inviting and encourage visitors to engage.

**Changes:**
- Animated pulsing ring effect on the floating button to draw attention
- A small tooltip/label "Chat with us!" that appears on first visit (dismisses after opening)
- Gradient or branded header with the edLEAD logo/icon
- Online/offline status indicator (green dot when team is available)
- Smoother open/close animation using CSS transitions
- Better mobile responsiveness (full-width on small screens)
- Welcome message with quick-topic buttons before typing (see FAQ section below)

---

## 3. AI-Powered FAQ and Topic Selection

When no admin is online to respond, the AI will handle common questions automatically. Visitors can also pick a topic to get instant help.

**How it works:**
- After the greeting, the widget shows **quick-topic buttons** such as:
  - "Admissions & Applications"
  - "Programme Information"
  - "Fees & Financial Aid"
  - "Contact & Location"
  - "Other Question"
- Selecting a topic or typing a question triggers an AI response via a new backend function
- The AI uses Lovable AI (Gemini) with a system prompt containing edLEAD-specific FAQs and context
- AI responses are marked with a small "AI" badge so visitors know they're automated
- If the AI can't answer or the visitor asks to speak to a human, it hands off to the live chat queue and notifies admins
- When an admin comes online and responds, the conversation seamlessly transitions from AI to human

**New backend function:** `chat-ai-faq`
- Accepts the conversation history and topic
- Calls Lovable AI Gateway with edLEAD context as system prompt
- Returns AI-generated response
- Messages from AI are stored with `sender_type = 'admin'` but will have a metadata flag `is_ai_response = true`

**Database changes:**
- Add `is_ai_response BOOLEAN DEFAULT false` column to `chat_messages`
- Add `chat_topic TEXT` column to `chat_conversations`

---

## Technical Details

### Database Migration
```sql
ALTER TABLE public.chat_conversations 
  ADD COLUMN visitor_phone TEXT,
  ADD COLUMN escalated_to_whatsapp BOOLEAN DEFAULT false,
  ADD COLUMN chat_topic TEXT;

ALTER TABLE public.chat_messages
  ADD COLUMN is_ai_response BOOLEAN DEFAULT false;
```

### New Edge Functions

1. **`chat-ai-faq`** - Calls Lovable AI with edLEAD context, returns FAQ answers. Uses `LOVABLE_API_KEY` (already configured).

2. **`chat-whatsapp-escalation`** - Checks for unanswered chats older than 3 minutes, sends WhatsApp via existing `send-whatsapp` function logic. Uses existing Twilio credentials.

### Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/chat-ai-faq/index.ts` | Create - AI FAQ edge function |
| `supabase/functions/chat-whatsapp-escalation/index.ts` | Create - WhatsApp escalation logic |
| `src/components/chat/ChatWidget.tsx` | Modify - New UI, phone field, topic buttons, AI mode, escalation timer |
| `src/pages/admin/AdminChat.tsx` | Modify - Show AI badge on AI messages, escalation status |
| `supabase/config.toml` | Auto-updated with new function entries |
| Database migration | Add new columns |

### Chat Widget Flow

```text
Visitor opens chat
    |
    v
Intro form (name, email, phone, province)
    |
    v
Welcome screen with topic buttons
    |
    +---> Picks topic or types question
    |
    v
AI responds with relevant FAQ answer
    |
    +---> Visitor satisfied? -> Conversation ends
    |
    +---> Visitor wants human? -> "Connecting you to our team..."
    |         |
    |         v
    |     Admin responds (live) -> Normal chat continues
    |         |
    |         +---> No admin response in 3 min?
    |                   |
    |                   v
    |               WhatsApp escalation triggered
    |               Visitor sees "Message forwarded to WhatsApp"
    |
    +---> Visitor types freely -> AI answers if no admin online
              |
              +---> Admin takes over at any point
```
