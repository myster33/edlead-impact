

# Use Cormorant Garamond Font in Certificate PDF

## Overview
Replace the standard Helvetica/Times fonts in the certificate with **Cormorant Garamond** from Google Fonts. Since pdf-lib only supports 14 built-in fonts, we need to fetch and embed the custom font files at runtime.

## What Changes

### `supabase/functions/generate-certificate-preview/index.ts`

1. **Fetch Cormorant Garamond font files** from Google Fonts CDN at runtime (Regular, Bold, Bold Italic variants)
2. **Embed custom fonts** using `pdfDoc.embedFont(fontBytes)` instead of `StandardFonts.*`
3. **Replace all font references**:
   - Title "Certificate" → Cormorant Garamond Bold Italic (replaces Times Bold Italic)
   - Recipient name → Cormorant Garamond Bold Italic
   - Body text, labels → Cormorant Garamond Regular (replaces Helvetica)
   - Bold text (cohort, date) → Cormorant Garamond Bold (replaces Helvetica Bold)
4. **Adjust font sizes** slightly since Cormorant Garamond has different metrics than Helvetica

### Font URLs (Google Fonts static TTF files)
- Regular: `https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmX5slCNuHLi8bLeY9MK7whWMhyjYrEtFmSq1.ttf`
- Bold: similar path with bold variant
- Bold Italic: similar path with bold-italic variant

## Technical Notes
- pdf-lib's `embedFont()` accepts raw font bytes (ArrayBuffer) for TrueType fonts
- Fonts are fetched once per invocation — small overhead (~50-100KB per font file)
- No changes needed to the frontend certificate preview component

