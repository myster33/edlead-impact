
# Switch AI from Lovable AI to AWS Bedrock

## Overview

Your project has **3 edge functions** that currently use the Lovable AI gateway. We'll switch all of them to call **AWS Bedrock** directly using the REST API with AWS Signature V4 authentication.

### Affected Edge Functions
1. **chat-ai-faq** -- The main chat assistant (FAQ, status lookups)
2. **chat-apply** -- The conversational application assistant
3. **generate-social-banner** -- AI-generated social media banner text

---

## Step 1: Store AWS Credentials as Secrets

You'll need to provide **3 secrets** from your AWS account:

| Secret Name | Where to Find It |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM Console -- your IAM user's access key |
| `AWS_SECRET_ACCESS_KEY` | IAM Console -- shown once when you create the access key |
| `AWS_REGION` | The region where Bedrock is enabled (e.g. `us-east-1`) |

Your IAM user/role must have the `bedrock:InvokeModel` permission.

---

## Step 2: Create a Shared AWS Signing Utility

Create a shared helper at `supabase/functions/bedrock-utils.ts` that:

- Implements AWS Signature V4 signing for Bedrock REST API calls
- Provides a `callBedrock()` function that accepts messages and model ID, signs the request, and returns the response
- Defaults to **Claude 3.5 Sonnet** (`anthropic.claude-3-5-sonnet-20240620-v1:0`) or another model you prefer
- Uses the Anthropic Messages API format that Bedrock expects

```text
callBedrock({ messages, system, tools?, tool_choice?, model? })
  --> POST https://bedrock-runtime.{region}.amazonaws.com/model/{modelId}/invoke
  --> Signs with SigV4
  --> Returns parsed JSON response
```

---

## Step 3: Update Each Edge Function

### 3a. chat-ai-faq (main chat)
- Replace `LOVABLE_API_KEY` with `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
- Replace `fetch("https://ai.gateway.lovable.dev/...")` with `callBedrock()`
- Convert the OpenAI-style message format to Bedrock/Anthropic Messages API format
- Keep the same response structure returned to the frontend (no frontend changes needed)

### 3b. chat-apply (application assistant)
- Same credential swap
- Convert the `tools` / `tool_choice` schema from OpenAI format to Anthropic tool-calling format
- The Anthropic tool format uses `input_schema` instead of `parameters`, and tool results come back in `content` blocks with `type: "tool_use"`
- Parse the tool call response accordingly

### 3c. generate-social-banner (banner text generation)
- Same credential swap
- Straightforward text completion -- simplest conversion

---

## Step 4: Model Format Differences

The main change is translating between OpenAI and Anthropic/Bedrock formats:

```text
OpenAI Format (current)          -->  Bedrock/Anthropic Format (new)
-------------------------------------------------------------------
messages[0].role: "system"       -->  Separate "system" parameter
model: "google/gemini-..."       -->  modelId in URL path
tools[].function.parameters      -->  tools[].input_schema
tool_calls[0].function.arguments -->  content[].type: "tool_use", content[].input
```

---

## Step 5: No Frontend Changes

All changes are backend-only. The edge functions return the same JSON shape to the frontend, so the chat widget, apply flow, and banner generation will work without any client-side updates.

---

## Technical Details

### AWS SigV4 Signing in Deno
Since we can't use the full AWS SDK in Deno edge functions, we'll implement a lightweight SigV4 signer using Web Crypto APIs (`crypto.subtle`) available in Deno. This involves:
- Creating a canonical request
- Generating a string to sign
- Computing HMAC-SHA256 signatures
- Adding the `Authorization` header with the signature

### Bedrock Request Format (Anthropic Claude)
```json
{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 1024,
  "system": "You are a helpful assistant...",
  "messages": [
    { "role": "user", "content": "Hello" }
  ]
}
```

### Recommended Bedrock Model
- **anthropic.claude-3-5-sonnet-20240620-v1:0** -- good balance of quality, speed, and cost
- Make sure this model is enabled in your AWS Bedrock console under "Model access"

---

## Summary of Changes

| File | Action |
|---|---|
| `supabase/functions/bedrock-utils.ts` | New -- shared AWS SigV4 signing + Bedrock caller |
| `supabase/functions/chat-ai-faq/index.ts` | Edit -- swap to Bedrock |
| `supabase/functions/chat-apply/index.ts` | Edit -- swap to Bedrock + convert tool format |
| `supabase/functions/generate-social-banner/index.ts` | Edit -- swap to Bedrock |
| 3 new secrets | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` |
