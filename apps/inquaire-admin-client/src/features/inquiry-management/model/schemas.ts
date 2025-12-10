/**
 * Inquiry Management Schemas
 */

import { z } from 'zod';

export const replySchema = z.object({
  message: z.string().min(1, '답변 내용을 입력해주세요'),
});

export type ReplyFormData = z.infer<typeof replySchema>;

export const notesSchema = z.object({
  notes: z.string().optional(),
});

export type NotesFormData = z.infer<typeof notesSchema>;
