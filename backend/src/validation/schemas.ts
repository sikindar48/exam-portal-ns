import { z } from "zod";

export const testCreateSchema = z.object({
  test_name: z.string().min(1, "Test name is required").max(100, "Test name is too long"),
  timer: z.number().int().min(1).max(480).optional(),
  attempts_allowed: z.number().int().min(1).nullable().optional(),
  scheduled_start: z.string().datetime({ offset: true }).nullable().optional(),
  scheduled_end: z.string().datetime({ offset: true }).nullable().optional(),
  status: z.enum(["draft", "published"]).optional(),
  active: z.boolean().optional(),
  shuffle: z.boolean().optional(),
  allow_review: z.boolean().optional(),
  negative_marking: z.boolean().optional(),
  negative_marks: z.number().min(0).optional(),
  restrict_navigation: z.boolean().optional(),
  allow_guests: z.boolean().optional(),
  public_link_enabled: z.boolean().optional(),
  folder_id: z.string().nullable().optional(),
  share_code: z.string().max(20).optional(),
});

export const testUpdateSchema = testCreateSchema.partial();

export const questionCreateSchema = z.object({
  id: z.string().optional(),
  client_id: z.string().optional(),
  folder_id: z.string().nullable().optional(),
  question_text: z.string().min(1, "Question text is required"),
  option_a: z.string().optional().nullable(),
  option_b: z.string().optional().nullable(),
  option_c: z.string().optional().nullable(),
  option_d: z.string().optional().nullable(),
  correct_answer: z.string().optional().nullable(),
  difficulty: z.string().nullable().optional(),
  marks: z.number().min(0).optional(),
  question_type: z.enum(["mcq", "true_false", "multi_select", "fill_blank", "subjective", "coding"]).optional(),
  options: z.array(z.string()).optional(),
  correct_answers: z.array(z.string()).optional(),
  negative_marks: z.number().min(0).optional(),
  explanation: z.string().optional().nullable(),
  is_case_sensitive: z.number().int().optional(),
  import_batch_id: z.string().optional().nullable(),
  version: z.number().int().min(1).optional(),
});

export const questionUpdateSchema = questionCreateSchema.extend({
  ids: z.array(z.string()).optional(),
}).partial();

export const profileUpsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  client_id: z.string().nullable().optional(),
});

export const attemptCreateSchema = z.object({
  student_id: z.string().optional(),
  test_id: z.string().min(1, "test_id is required"),
  status: z.enum(["in_progress", "submitted"]).optional(),
});

export const userRoleCreateSchema = z.object({
  user_id: z.string().min(1, "user_id is required"),
  role: z.enum(["superadmin", "clientadmin", "student"]),
  client_id: z.string().nullable().optional(),
});
