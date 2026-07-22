import { ParsedQuestion } from './csvParser';

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export function validateQuestion(question: ParsedQuestion, allParsedQuestions?: ParsedQuestion[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const row = question.rowNumber;

  // 1. General Validation
  if (!question.question_text || question.question_text.trim().length === 0) {
    errors.push({ row, field: 'question_text', message: 'Question text is required' });
  } else if (question.question_text.length > 1000) {
    errors.push({ row, field: 'question_text', message: 'Question text must be less than 1000 characters' });
  }

  if (isNaN(question.marks) || question.marks < 1 || question.marks > 100) {
    errors.push({ row, field: 'marks', message: 'Marks must be a number between 1 and 100' });
  }

  if (isNaN(question.negative_marks) || question.negative_marks < 0) {
    errors.push({ row, field: 'negative_marks', message: 'Negative marks must be 0 or a positive number' });
  }

  // Check for duplicate rows inside the uploaded CSV itself (Stage 2)
  if (allParsedQuestions) {
    const normalize = (text?: string) => (text || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const getOptionsString = (q: ParsedQuestion) => {
      if (Array.isArray(q.options) && q.options.length > 0) {
        return q.options.map(normalize).join('|');
      }
      return [q.option_a, q.option_b, q.option_c, q.option_d]
        .filter(Boolean)
        .map((opt) => normalize(opt))
        .join('|');
    };

    const normalizedText = normalize(question.question_text);
    const optionsText = getOptionsString(question);

    const duplicateInCsv = allParsedQuestions.some(
      q => q.rowNumber !== row && 
           normalize(q.question_text) === normalizedText && 
           q.question_type === question.question_type &&
           getOptionsString(q) === optionsText
    );

    if (duplicateInCsv) {
      errors.push({
        row,
        field: 'question_text',
        message: 'Duplicate question text, type, and options found within this CSV upload'
      });
    }
  }

  const validAnswerKeys = ['A', 'B', 'C', 'D'];

  // 2. Type-Specific Validation
  if (question.question_type === 'mcq') {
    // MCQ option validation: Exactly 4 options required
    if (!question.options || question.options.length !== 4) {
      errors.push({ row, field: 'options', message: 'MCQ must contain exactly 4 options (option_a through option_d)' });
    } else {
      question.options.forEach((opt, idx) => {
        if (!opt || opt.trim().length === 0) {
          errors.push({ row, field: `option_${String.fromCharCode(97 + idx)}`, message: `Option ${String.fromCharCode(65 + idx)} is required for MCQ` });
        }
      });
    }

    // MCQ answer validation: Exactly 1 answer required
    if (!question.correct_answers || question.correct_answers.length !== 1) {
      errors.push({ row, field: 'correct_answer', message: 'MCQ must have exactly 1 correct answer' });
    } else {
      const ans = question.correct_answers[0];
      if (!validAnswerKeys.includes(ans)) {
        errors.push({ row, field: 'correct_answer', message: 'MCQ correct answer must be A, B, C, or D' });
      }
    }
  } 
  
  else if (question.question_type === 'true_false') {
    // True/False option validation: Must be "True" and "False"
    if (!question.options || question.options.length !== 2 || question.options[0] !== 'True' || question.options[1] !== 'False') {
      errors.push({ row, field: 'options', message: 'True/False options must be True (option_a) and False (option_b)' });
    }

    // True/False answer validation: Exactly 1 answer required (A or B)
    if (!question.correct_answers || question.correct_answers.length !== 1) {
      errors.push({ row, field: 'correct_answer', message: 'True/False must have exactly 1 correct answer' });
    } else {
      const ans = question.correct_answers[0];
      if (ans !== 'A' && ans !== 'B') {
        errors.push({ row, field: 'correct_answer', message: 'True/False correct answer must be A (True) or B (False)' });
      }
    }
  } 
  
  else if (question.question_type === 'multi_select') {
    // Multi-select option validation: Minimum 2 options required
    if (!question.options || question.options.length < 2) {
      errors.push({ row, field: 'options', message: 'Multi-select question must contain at least 2 options' });
    }

    // Multi-select answer validation: At least 1 answer required
    if (!question.correct_answers || question.correct_answers.length < 1) {
      errors.push({ row, field: 'correct_answer', message: 'Multi-select question must contain at least 1 correct answer' });
    } else {
      question.correct_answers.forEach(ans => {
        if (!validAnswerKeys.includes(ans)) {
          errors.push({ row, field: 'correct_answer', message: `Multi-select answer keys must be A, B, C, or D. Found: ${ans}` });
        } else {
          // Check that target option index exists
          const idx = ans.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
          if (!question.options || !question.options[idx] || question.options[idx].trim().length === 0) {
            errors.push({ row, field: 'correct_answer', message: `Correct answer key ${ans} references an empty option` });
          }
        }
      });
    }
  }

  // Future question types (fill_blank, subjective, coding) skip validation at this stage
  return errors;
}

export function validateQuestions(questions: ParsedQuestion[]): ValidationError[] {
  return questions.flatMap(q => validateQuestion(q, questions));
}
