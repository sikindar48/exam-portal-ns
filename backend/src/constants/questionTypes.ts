export const QUESTION_TYPES = {
  MCQ: "mcq",
  TRUE_FALSE: "true_false",
  MULTI_SELECT: "multi_select",
  FILL_BLANK: "fill_blank",
  SUBJECTIVE: "subjective",
  CODING: "coding",
} as const;

export type QuestionType = typeof QUESTION_TYPES[keyof typeof QUESTION_TYPES];
