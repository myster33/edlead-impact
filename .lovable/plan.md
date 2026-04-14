

## Plan: Migrate AI from AWS Bedrock to Lovable AI (Temporary)

This switches all 4 edge functions that use AWS Bedrock over to Lovable AI so your chat works immediately while AWS billing is sorted out.

### What changes

**Create a new shared utility: `supabase/functions/lovable-ai-utils.ts`**
- A drop-in replacement for `bedrock-utils.ts` that calls the Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) using `LOVABLE_API_KEY`
- Uses `google/gemini-2.5-flash-lite` (cheapest model, ideal for chat)
- Exports the same `callBedrock` function signature so all 4 edge functions need only a single import change
- Handles 429 (rate limit) and 402 (credits exhausted) errors with clear messages

**Update 4 edge functions (one-line import change each):**
1. `supabase/functions/chat-ai-faq/index.ts` -- change import from `../bedrock-utils.ts` to `../lovable-ai-utils.ts`
2. `supabase/functions/school-chat-ai/index.ts` -- same
3. `supabase/functions/chat-apply/index.ts` -- same
4. `supabase/functions/chat-story-submit/index.ts` -- same

**Keep `bedrock-utils.ts` untouched** so you can switch back by reverting the imports when AWS billing is fixed.

### Technical details

The new utility translates the existing Bedrock request format (separate `system` param, `content` array response) to OpenAI-compatible format (system message in messages array, `choices[0].message.content` response), returning the same response shape so no other code changes are needed.

