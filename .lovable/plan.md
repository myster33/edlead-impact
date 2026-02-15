

# Add "Submit Your Story" via Chat

## Overview
The chat widget already supports applying to edLEAD conversationally (Apply Now mode). This plan adds a similar **"Submit Your Story"** mode where visitors can submit a Leader's Story through the chat, guided by the AI assistant. The AI will collect all required fields conversationally, allow photo uploads, and submit the story to the `blog_posts` table -- mirroring the existing `StorySubmissionForm` but within the chat.

## What Visitors Will Experience
1. Click the chat widget and complete the intro form (existing flow)
2. See a new **"Submit Your Story"** button alongside the existing topic buttons
3. The AI assistant guides them through providing: title, category, reference number, school info, summary, full story content, optional video link, and optional featured image
4. A progress bar shows completion status (similar to Apply mode)
5. Before submission, they can review and inline-edit their story details
6. On confirmation, the story is inserted into the database and notifications are sent

## Technical Plan

### 1. New Edge Function: `chat-story-submit`
Create `supabase/functions/chat-story-submit/index.ts` -- modeled after `chat-apply`:
- System prompt instructs the AI to collect story fields conversationally (title, summary, content, category, reference_number, author details, optional video_url, optional tags)
- Uses the same `respond_and_collect` tool-calling pattern with Bedrock
- Pre-fills author_name and author_email from the chat intro form
- Tracks collected vs. missing fields and returns `is_complete` when done
- For long fields (summary, content), the AI asks simpler sub-questions and composes polished text

**Required fields**: title, summary, content, author_name, author_school, author_country, author_province, author_email, category, reference_number

**Optional fields**: video_url, tags, author_phone

### 2. New Component: `ChatStoryActions.tsx`
Similar to `ChatApplyActions.tsx`:
- Progress bar showing collected fields vs. total required
- "Upload Image" and "Take Photo" buttons for the featured image (reuses `WebcamCaptureDialog`)
- "Submit Story" button appears when all required fields are collected

### 3. New Component: `ChatStoryReview.tsx`
Similar to `ChatApplyReview.tsx`:
- Expandable/collapsible review panel showing all collected story data
- Inline editing for each field
- "Back to Chat" and "Confirm & Submit" buttons
- Image preview if uploaded

### 4. Update `ChatTopicButtons.tsx`
Add a "Submit Your Story" button (using the `PenLine` icon) alongside the existing "Apply Now" button.

### 5. Update `ChatWidget.tsx`
Add story mode state and logic, mirroring the apply mode pattern:
- New state: `storyMode`, `storyData`, `storyComplete`, `storySubmitting`, `storyCollectedCount`, `storyTotalRequired`, `showStoryReview`
- `startStoryMode()` -- initializes story mode, pre-fills name/email, sends first AI message
- `callStoryAi()` -- calls the `chat-story-submit` edge function
- `handleStorySubmit()` -- inserts into `blog_posts`, triggers notification edge functions (`notify-blog-submission`, `notify-author-submission`), calculates reading time
- `handleStoryPhotoUploaded()` -- uploads featured image to `blog-images` bucket
- Routing in `sendMessage()` to use `callStoryAi` when in story mode
- Render `ChatStoryActions` and `ChatStoryReview` components when in story mode
- LocalStorage persistence for story mode data (same pattern as apply mode)
- Header text changes to "edLEAD Story Submission" when in story mode

### 6. Edge Function Config
Add to `supabase/config.toml`:
```toml
[functions.chat-story-submit]
verify_jwt = false
```

## Files to Create
- `supabase/functions/chat-story-submit/index.ts`
- `src/components/chat/ChatStoryActions.tsx`
- `src/components/chat/ChatStoryReview.tsx`

## Files to Modify
- `src/components/chat/ChatTopicButtons.tsx` -- add "Submit Your Story" button
- `src/components/chat/ChatWidget.tsx` -- add story mode logic and rendering
- `supabase/config.toml` -- add function config

