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
      message: 'Question text is required'
    });
  } else if (question.question_text.length > 1000) {
    errors.push({
      row: question.rowNumber,
      field: 'question_text',
      message: 'Question text must be less than 1000 characters'
    });
  }

  // Validate options
  const options = ['option_a', 'option_b', 'option_c', 'option_d'];
  options.forEach(opt => {
    const value = question[opt as keyof ParsedQuestion];
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      errors.push({
        row: question.rowNumber,
        field: opt,
        message: `${opt.replace('_', ' ')} is required`
      });
    } else if (typeof value === 'string' && value.length > 500) {
      errors.push({
        row: question.rowNumber,
        field: opt,
        message: `${opt.replace('_', ' ')} must be less than 500 characters`
      });
    }
  });

  // Validate correct answer
  const validAnswers = ['A', 'B', 'C', 'D'];
  if (!validAnswers.includes(question.correct_answer)) {
    errors.push({
      row: question.rowNumber,
      field: 'correct_answer',
      message: 'Correct answer must be A, B, C, or D'
    });
  }

  // Validate difficulty
  const validDifficulties = ['easy', 'medium', 'hard'];
  if (!validDifficulties.includes(question.difficulty)) {
    errors.push({
      row: question.rowNumber,
      field: 'difficulty',
      message: 'Difficulty must be easy, medium, or hard'
    });
  }

  // Validate marks
  if (isNaN(question.marks) || question.marks < 1 || question.marks > 100) {
    errors.push({
      row: question.rowNumber,
      field: 'marks',
      message: 'Marks must be a number between 1 and 100'
    });
  }

  return errors;
}

export function validateQuestions(questions: ParsedQuestion[]): ValidationError[] {
  const allErrors: ValidationError[] = [];

  questions.forEach(question => {
    const errors = validateQuestion(question);
    allErrors.push(...errors);
  });

  return allErrors;
}
