

## Fix: AI Chat Not Responding — Deprecated AWS Bedrock Model

### Problem
The AI chat returns a 500 error because the Claude 3.5 Sonnet model (`anthropic.claude-3-5-sonnet-20240620-v1:0`) has reached end-of-life on AWS Bedrock. This affects all AI features: the main chat, school chat, story submission, and apply flow.

### Solution
Update the default model in `supabase/functions/bedrock-utils.ts` to a currently supported Claude model on AWS Bedrock.

**Recommended replacement**: `anthropic.claude-3-5-sonnet-20241022-v2:0` (Claude 3.5 Sonnet v2 — same capability tier, still active on Bedrock).

### Changes

**File: `supabase/functions/bedrock-utils.ts`** (line 4)
- Change `DEFAULT_MODEL` from `"anthropic.claude-3-5-sonnet-20240620-v1:0"` to `"anthropic.claude-3-5-sonnet-20241022-v2:0"`

This single-line fix will restore AI responses across all chat functions (chat-ai-faq, school-chat-ai, chat-apply, chat-story-submit).

### Technical Note
The new model is a drop-in replacement — same API format, same parameters. No other code changes are needed. After deployment, all edge functions sharing `bedrock-utils.ts` will automatically use the updated model.

