# Implementation Plan - Fix Student List OCR Image Upload

## Goal
Fix the OCR student list extraction error caused by using an unsupported model name (`gemini-3.8-flash`) in `server.ts` when processing uploaded list images.

## Proposed Changes
### Server Backend (`server.ts`)
- Update the model parameter in `ai.models.generateContent` calls from `'gemini-3.8-flash'` to `'gemini-2.5-flash'` in both OCR student list extraction endpoints.

## Verification
- Compile and build the applet to verify correctness.
- Test uploading a student list image via the OCR modal.
