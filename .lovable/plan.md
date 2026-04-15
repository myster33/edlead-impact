

## Plan: Build SNS SMS Utility (Keep Twilio Active)

Build the Amazon SNS SMS infrastructure alongside the existing Twilio code. Twilio remains the active SMS sender. The SNS code will be ready to swap in with a single import change per function once your AWS SNS production access is approved.

### What gets built

**1. New file: `supabase/functions/sns-sms-utils.ts`**
- Shared utility using AWS SigV4 signing (adapted from the existing `bedrock-utils.ts` pattern)
- Exports `sendSmsSNS(to, body)` returning `{ success, sid?, error? }` — same shape as current Twilio functions
- Uses existing `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` secrets
- Includes the SA phone number formatter (E.164)
- Sets `AWS.SNS.SMS.SenderID = "edLEAD"` and `AWS.SNS.SMS.SMSType = "Transactional"`
- Endpoint: `https://sns.{region}.amazonaws.com`

**2. No other files change**
- Twilio stays active in all 15+ edge functions
- No imports swapped, no code commented out
- When you're ready to switch, I'll update each function to import from `sns-sms-utils.ts` instead of using inline Twilio calls

### Technical detail
The SNS `Publish` API is called via HTTPS POST with `Action=Publish`, `PhoneNumber`, `Message`, and `MessageAttributes` as URL-encoded form params, signed with the same SigV4 method already proven in `bedrock-utils.ts`.

### What you need to do (AWS Console)
1. Request SNS SMS **production access** (exit sandbox)
2. Enable **South Africa (+27)** in geo-permissions
3. Raise monthly spending limit above $1.00

Once those are approved, tell me and I'll swap the imports across all functions.

