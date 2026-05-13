export interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  marks: number;
  temp_id?: number;
}

export interface TestData {
  id?: string;
  test_name: string;
  timer: number;
  attempts_allowed: number | null;
  shuffle: boolean;
  allow_review: boolean;
  negative_marking: boolean;
  negative_marks: number;
  restrict_navigation: boolean;
  active: boolean;
  allow_guests: boolean;
  share_code?: string;
  questions: Question[];
}
