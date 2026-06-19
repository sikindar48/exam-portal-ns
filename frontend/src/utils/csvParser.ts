export interface ParsedQuestion {
  question_text: string;
  question_type: "mcq" | "true_false" | "multi_select" | "fill_blank" | "subjective" | "coding";
  options: string[];
  correct_answers: string[];
  marks: number;
  negative_marks: number;
  difficulty: string;
  explanation: string;
  rowNumber: number;
  import_batch_id?: string;
  version?: number;
}

export interface CSVParseResult {
  questions: ParsedQuestion[];
  errors: { row: number; message: string }[];
}

export function parseCSV(csvText: string, importBatchId?: string): CSVParseResult {
  const lines = csvText.trim().split('\n');
  const questions: ParsedQuestion[] = [];
  const errors: { row: number; message: string }[] = [];

  if (lines.length === 0 || !lines[0].trim()) {
    errors.push({ row: 0, message: 'CSV file is empty' });
    return { questions, errors };
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  // Minimal headers required for legacy/new compatibility
  const requiredHeaders = ['question_text', 'correct_answer', 'marks'];
  const missingHeaders = requiredHeaders.filter(h => !header.includes(h));
  if (missingHeaders.length > 0) {
    errors.push({
      row: 1,
      message: `Missing required columns: ${missingHeaders.join(', ')}`,
    });
    return { questions, errors };
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    try {
      const values = parseCSVLine(line);

      // Verify row has enough columns for required headers
      const minColCount = Math.max(
        header.indexOf('question_text'),
        header.indexOf('correct_answer'),
        header.indexOf('marks')
      ) + 1;

      if (values.length < minColCount) {
        errors.push({
          row: i + 1,
          message: `Expected at least ${minColCount} columns, found ${values.length}`,
        });
        continue;
      }

      // 1. Question Type
      let qTypeRaw = header.includes('question_type')
        ? values[header.indexOf('question_type')]?.trim().toLowerCase()
        : 'mcq';
      
      const validTypes = ["mcq", "true_false", "multi_select", "fill_blank", "subjective", "coding"];
      if (!qTypeRaw || !validTypes.includes(qTypeRaw)) {
        qTypeRaw = 'mcq';
      }
      const question_type = qTypeRaw as ParsedQuestion["question_type"];

      // 2. Marks
      const marksRaw = values[header.indexOf('marks')]?.trim() || '1';
      const marks = parseFloat(marksRaw) || 1;

      // 3. Negative Marks
      const negMarksRaw = header.includes('negative_marks')
        ? values[header.indexOf('negative_marks')]?.trim() || '0'
        : '0';
      const negative_marks = parseFloat(negMarksRaw) || 0;

      // 4. Difficulty
      const difficulty = header.includes('difficulty')
        ? values[header.indexOf('difficulty')]?.trim().toLowerCase() || 'medium'
        : 'medium';

      // 5. Explanation
      const explanation = header.includes('explanation')
        ? values[header.indexOf('explanation')]?.trim() || ''
        : '';

      // 6. Options Array Builder
      const optA = header.includes('option_a') ? values[header.indexOf('option_a')]?.trim() || '' : '';
      const optB = header.includes('option_b') ? values[header.indexOf('option_b')]?.trim() || '' : '';
      const optC = header.includes('option_c') ? values[header.indexOf('option_c')]?.trim() || '' : '';
      const optD = header.includes('option_d') ? values[header.indexOf('option_d')]?.trim() || '' : '';

      let options: string[] = [];
      if (question_type === 'true_false') {
        options = ["True", "False"];
      } else if (question_type === 'mcq') {
        options = [optA, optB, optC, optD];
      } else if (question_type === 'multi_select') {
        options = [optA, optB, optC, optD].filter(o => o !== '');
      } else {
        // Extensible for future types
        options = [optA, optB, optC, optD].filter(o => o !== '');
      }

      // 7. Correct Answers Array Builder
      const correctAnsRaw = values[header.indexOf('correct_answer')]?.trim() || '';
      let correct_answers: string[] = [];
      if (correctAnsRaw.includes('|')) {
        correct_answers = correctAnsRaw.split('|').map(a => a.trim().toUpperCase());
      } else if (correctAnsRaw) {
        correct_answers = [correctAnsRaw.toUpperCase()];
      }

      const question: ParsedQuestion = {
        question_text: values[header.indexOf('question_text')]?.trim() || '',
        question_type,
        options,
        correct_answers,
        marks,
        negative_marks,
        difficulty,
        explanation,
        rowNumber: i + 1,
        import_batch_id: importBatchId,
        version: 1
      };

      questions.push(question);
    } catch (error) {
      errors.push({
        row: i + 1,
        message: `Failed to parse row: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  return { questions, errors };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export function generateCSVTemplate(): string {
  const header = 'question_text,question_type,option_a,option_b,option_c,option_d,correct_answer,marks,negative_marks,difficulty,explanation';
  const example1 = '"What is 2+2?","mcq","3","4","5","6","B","1","0","easy","2+2 is 4"';
  const example2 = '"The Earth revolves around the Sun?","true_false","True","False","","","A","1","0","easy","Statement is correct"';
  const example3 = '"Select all prime numbers","multi_select","2","3","4","5","A|B|D","2","0.5","medium","2, 3, and 5 are prime"';

  return [header, example1, example2, example3].join('\n');
}

export function downloadCSVTemplate() {
  const csv = generateCSVTemplate();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'questions_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
