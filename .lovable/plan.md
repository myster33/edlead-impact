

## Plan: Shorten All Automated SMS Messages to Reduce Twilio Costs

Twilio charges per SMS segment (160 characters per segment). Messages over 160 chars are split into multiple segments, each billed separately. Most of your current SMS messages are 2-4 segments long. Cutting them to 1 segment (under 160 chars) will reduce costs by 50-75%.

### Current vs Proposed SMS Messages

**1. Event Booking (notify-event-booking)**

| Status | Current (~300+ chars, 2-3 segments) | Proposed (~140 chars, 1 segment) |
|--------|-------------------------------------|----------------------------------|
| Received | `🎟️ edLEAD Event Booking Received!\n\nHi Name,\n\nYour booking for "Event" has been received.\n\n📋 Ticket No: EVT-000001\n\nPlease keep this ticket number for check-in at the event.\n\n🔗 Event: https://edlead.co.za/events\n\nPlease check the email sent for more details...` | `edLEAD: Hi Name, booking received for "Event". Ticket: EVT-000001. Check email for details. edlead.co.za` |
| Confirmed | Similar length | `edLEAD: Hi Name, booking CONFIRMED for "Event". Ticket: EVT-000001. Check email for details. edlead.co.za` |
| Cancelled | Similar length | `edLEAD: Hi Name, booking for "Event" cancelled. Ticket: EVT-000001. Check email for details. edlead.co.za` |
| Parent variants | Same pattern, even longer | Same short format with child's name |

**2. Event Check-In (notify-event-checkin)**

| Current (~200 chars) | Proposed (~120 chars) |
|---|---|
| `🎟️ edLEAD Event Check-In Confirmed!\n\nHi Name,\n\nYou have been checked in for: Event\n\n📋 Your Ticket Number: EVT-000001\n\nPlease keep this ticket number for reference.\n\nThank you for attending!\n— edLEAD Team` | `edLEAD: Hi Name, checked in for "Event". Ticket: EVT-000001. Enjoy! edlead.co.za` |

**3. Event Check-Out (notify-event-checkout)**

| Current (~200 chars) | Proposed (~110 chars) |
|---|---|
| `👋 edLEAD Event Check-Out\n\nHi Name,\n\nYou have been checked out of: Event\n\n📋 Ticket Number: EVT-000001\n\nThank you for attending!\n— edLEAD Team` | `edLEAD: Hi Name, checked out of "Event". Ticket: EVT-000001. Thanks for attending! edlead.co.za` |

**4. Application Status Change (notify-applicant-status-change)**

| Status | Current (~250+ chars) | Proposed (~140 chars) |
|---|---|---|
| Approved | `🎉 Congratulations Name! Your edLEAD application (REF) has been APPROVED! We'll be in touch... Please check the email... contact us on info@edlead.co.za... edLEAD Chat... - edLEAD Team` | `edLEAD: Congrats Name! Application REF APPROVED. Check email for next steps. edlead.co.za` |
| Rejected | Similar length | `edLEAD: Hi Name, application REF was not successful. Check email for details. edlead.co.za` |
| Pending | Similar length | `edLEAD: Hi Name, application REF is under review. We'll notify you. edlead.co.za` |
| Cancelled | Similar length | `edLEAD: Hi Name, application REF has been cancelled. Check email for details. edlead.co.za` |

**5. Application Submission (submit-application)** -- already short, minor trim only.

### Key Principles
- Keep every SMS under 160 characters (1 segment)
- Remove emojis from SMS (they force Unicode encoding which limits to 70 chars per segment)
- Remove duplicate info like "contact us on info@edlead.co.za or talk to us through our website edLEAD Chat" -- that info is in the email
- Keep "Check email for details" to direct users to the richer email notification
- Leave email and WhatsApp messages unchanged (they are free/cheap)

### Files to Edit
1. `supabase/functions/notify-event-booking/index.ts` -- shorten `buildSmsMessage` and `buildParentSmsMessage`
2. `supabase/functions/notify-event-checkin/index.ts` -- shorten `buildMessage`
3. `supabase/functions/notify-event-checkout/index.ts` -- shorten `buildAttendeeMsg` and `buildParentMsg`
4. `supabase/functions/notify-applicant-status-change/index.ts` -- shorten `defaultSmsTemplates` and `SMS_FOOTER`
5. `supabase/functions/submit-application/index.ts` -- minor trim to `learnerSmsMsg` and `parentSmsMsg`

### Estimated Cost Impact
- Current: Most messages use 2-3 SMS segments each
- After: All messages fit in 1 segment
- Savings: ~50-66% reduction in SMS costs

