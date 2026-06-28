export interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  marks: number;
  section_id?: string | null;
  position?: number;
  temp_id?: number;
  question_type?: "mcq" | "true_false" | "multi_select" | "fill_blank" | "subjective" | "coding";
}

export interface TestSection {
  id: string;
  test_id: string;
  name: string;
  position: number;
  duration_minutes: number | null;
  negative_marks: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  navigation_locked: boolean;
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
  camera_required?: boolean;
  questions: Question[];
  sections?: TestSection[];
}
