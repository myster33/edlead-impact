
# SMS and WhatsApp Messaging Integration Plan

## Overview
This plan integrates Twilio SMS and WhatsApp messaging alongside the existing email notification system. When automated emails are sent, corresponding SMS and WhatsApp messages will also be sent to students and parents. Additionally, admins will be able to compose and send custom messages from the admin portal.

## Architecture

```text
+---------------------+      +------------------+      +------------------+
|   Admin Portal      |----->| Edge Functions   |----->|     Twilio       |
|  (Message Center)   |      | (Notification)   |      |  SMS + WhatsApp  |
+---------------------+      +------------------+      +------------------+
         |                          ^
         v                          |
+---------------------+      +------------------+
| Message Templates   |      | Applications DB  |
| (SMS/WhatsApp)      |      | (Phone Numbers)  |
+---------------------+      +------------------+
```

## Required Secrets

The following Twilio credentials will need to be added:
- `TWILIO_ACCOUNT_SID` - Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token  
- `TWILIO_PHONE_NUMBER` - Twilio SMS phone number
- `TWILIO_WHATSAPP_NUMBER` - Twilio WhatsApp-enabled number (format: whatsapp:+1234567890)

## Database Changes

### 1. Create `message_templates` Table
Stores SMS and WhatsApp message templates (similar to email_templates):

```sql
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp')),
  message_content TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
```

### 2. Create `message_template_history` Table
Tracks changes to message templates:

```sql
CREATE TABLE public.message_template_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_reason TEXT
);
```

### 3. Create `message_logs` Table
Logs all sent messages for tracking and debugging:

```sql
CREATE TABLE public.message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp')),
  recipient_phone TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('learner', 'parent')),
  template_key TEXT,
  message_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  twilio_sid TEXT,
  error_message TEXT,
  application_id UUID REFERENCES applications(id),
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4. Add System Settings
Add messaging-related system settings:
- `sms_notifications_enabled` (boolean)
- `whatsapp_notifications_enabled` (boolean)

### 5. RLS Policies
- Admin users can manage message templates
- Admin users can view message logs
- System can insert message logs

## Edge Functions

### 1. New: `send-sms` Edge Function
Handles SMS sending via Twilio:

```typescript
// Accepts: { to: string, message: string, templateKey?: string }
// Uses Twilio REST API to send SMS
// Logs to message_logs table
```

### 2. New: `send-whatsapp` Edge Function
Handles WhatsApp sending via Twilio:

```typescript
// Accepts: { to: string, message: string, templateKey?: string }
// Uses Twilio WhatsApp API
// Logs to message_logs table
```

### 3. New: `send-bulk-message` Edge Function
Handles bulk messaging for admin compose feature:

```typescript
// Accepts: { 
//   channel: 'sms' | 'whatsapp' | 'both',
//   recipients: { phone: string, name: string, type: 'learner' | 'parent' }[],
//   message: string,
//   applicationIds?: string[]
// }
```

### 4. Update Existing Notification Functions
Modify these existing functions to also send SMS/WhatsApp:
- `notify-applicant-approved`
- `notify-applicant-rejected`
- `notify-applicant-status-change`
- `send-certificate`

Each will check system settings and send appropriate SMS/WhatsApp messages alongside emails.

## Frontend Changes

### 1. New Admin Page: Message Templates (`/admin/message-templates`)
Similar to Email Templates page but for SMS/WhatsApp:
- Tab view for SMS and WhatsApp templates
- Template editor with character counter (160 chars for SMS)
- Variable insertion (e.g., `{{applicant_name}}`)
- Preview with test variables
- Template history and restore functionality

### 2. New Admin Page: Message Center (`/admin/messages`)
Compose and send custom messages:
- Channel selector (SMS, WhatsApp, or Both)
- Recipient selection:
  - Individual application selection
  - Filter by status, cohort, province
  - All learners / All parents toggle
- Message composer with:
  - Character counter
  - Variable insertion
  - Template quick-select
- Send preview and confirmation
- Message history/logs view

### 3. Update Admin Settings Page
Add new toggles in System Settings section:
- "Enable SMS notifications" toggle
- "Enable WhatsApp notifications" toggle

### 4. Update Admin Layout Sidebar
Add new navigation items:
- "Message Templates" (under Email Templates)
- "Message Center" (new section)

### 5. Update Module Permissions
Add new modules to permission system:
- `message-templates`
- `message-center`

## Default Message Templates

### SMS Templates (max 160 chars)

**Application Approved (Learner)**
```
Hi {{applicant_name}}, congratulations! Your edLEAD application ({{reference_number}}) has been approved. Check your email for details. -edLEAD Team
```

**Application Approved (Parent)**
```
Dear {{parent_name}}, great news! {{applicant_name}}'s edLEAD application has been approved. Reference: {{reference_number}}. -edLEAD Team
```

**Application Rejected (Learner)**
```
Hi {{applicant_name}}, thank you for applying to edLEAD. Unfortunately, your application was not successful this time. Keep developing your leadership skills!
```

**Status Change Notification**
```
Hi {{applicant_name}}, your edLEAD application status has changed to {{new_status}}. Reference: {{reference_number}}. Check your email for details.
```

### WhatsApp Templates
Similar to SMS but can be longer and include formatting (bold, lists, etc.)

## Implementation Phases

### Phase 1: Database & Backend Setup
1. Add Twilio secrets
2. Create database tables and RLS policies
3. Create `send-sms` and `send-whatsapp` edge functions
4. Add system settings entries

### Phase 2: Update Existing Notifications
1. Modify notification edge functions to include SMS/WhatsApp
2. Add phone number validation logic
3. Check system settings before sending

### Phase 3: Admin Message Templates UI
1. Create Message Templates page
2. Implement template CRUD operations
3. Add preview and test functionality

### Phase 4: Admin Message Center UI
1. Create Message Center page
2. Implement recipient selection logic
3. Add compose and send functionality
4. Implement message logs view

### Phase 5: Integration & Testing
1. Update sidebar navigation
2. Add module permissions
3. End-to-end testing

## Phone Number Handling

The `applications` table already has:
- `student_phone` - Learner's phone number
- `parent_phone` - Parent/guardian's phone number

Phone numbers will be validated and formatted to E.164 format before sending:
- Strip spaces, dashes, parentheses
- Add country code if missing (default to +27 for South Africa)
- Validate format before API call

## Technical Considerations

### Character Limits
- SMS: 160 characters (or 153 for concatenated messages)
- WhatsApp: 4,096 characters

### Rate Limiting
- Implement rate limiting for bulk messages
- Queue large batches to avoid Twilio limits

### Error Handling
- Log failed messages with error details
- Retry logic for transient failures
- Admin notification for persistent failures

### Cost Management
- Track message counts in logs
- Display estimated costs before bulk sends
- Optional daily/monthly limits
