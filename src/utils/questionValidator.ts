import { ParsedQuestion } from './csvParser';

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export function validateQuestion(question: ParsedQuestion): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate question text
  if (!question.question_text || question.question_text.trim().length === 0) {
    errors.push({
      row: question.rowNumber,
      field: 'question_text',
      message: 'Question text is required',
    });
  } else if (question.question_text.length > 1000) {
    errors.push({
      row: question.rowNumber,
      field: 'question_text',
      message: 'Question text must be less than 1000 characters',
    });
  }

  // Validate options
  const options = ['option_a', 'option_b', 'option_c', 'option_d'] as const;
  options.forEach(opt => {
    const value = question[opt];
    if (!value || value.trim().length === 0) {
      errors.push({
        row: question.rowNumber,
        field: opt,
        message: `${opt.replace('_', ' ')} is required`,
      });
    } else if (value.length > 500) {
      errors.push({
        row: question.rowNumber,
        field: opt,
        message: `${opt.replace('_', ' ')} must be less than 500 characters`,
      });
    }
  });

  // Validate correct answer
  const validAnswers = ['A', 'B', 'C', 'D'];
  if (!validAnswers.includes(question.correct_answer)) {
    errors.push({
      row: question.rowNumber,
      field: 'correct_answer',
      message: 'Correct answer must be A, B, C, or D',
    });
  }

  // Validate marks
  if (isNaN(question.marks) || question.marks < 1 || question.marks > 100) {
    errors.push({
      row: question.rowNumber,
      field: 'marks',
      message: 'Marks must be a number between 1 and 100',
    });
  }

  return errors;
}

export function validateQuestions(questions: ParsedQuestion[]): ValidationError[] {
  return questions.flatMap(q => validateQuestion(q));
}
