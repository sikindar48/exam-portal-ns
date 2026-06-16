export interface ParsedQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  marks: number;
  rowNumber: number;
}

export interface CSVParseResult {
  questions: ParsedQuestion[];
  errors: { row: number; message: string }[];
}

export function parseCSV(csvText: string): CSVParseResult {
  const lines = csvText.trim().split('\n');
  const questions: ParsedQuestion[] = [];
  const errors: { row: number; message: string }[] = [];

  if (lines.length === 0) {
    errors.push({ row: 0, message: 'CSV file is empty' });
    return { questions, errors };
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const requiredHeaders = [
    'question_text',
    'option_a',
    'option_b',
    'option_c',
    'option_d',
    'correct_answer',
    'marks',
  ];

  // Validate header (difficulty is optional / ignored if present)
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

      // Allow rows with extra columns (e.g. old CSVs that still have difficulty)
      if (values.length < requiredHeaders.length) {
        errors.push({
          row: i + 1,
          message: `Expected at least ${requiredHeaders.length} columns, found ${values.length}`,
        });
        continue;
      }

      const question: ParsedQuestion = {
        question_text: values[header.indexOf('question_text')]?.trim() || '',
        option_a: values[header.indexOf('option_a')]?.trim() || '',
        option_b: values[header.indexOf('option_b')]?.trim() || '',
        option_c: values[header.indexOf('option_c')]?.trim() || '',
        option_d: values[header.indexOf('option_d')]?.trim() || '',
        correct_answer: values[header.indexOf('correct_answer')]?.trim().toUpperCase() || '',
        marks: parseInt(values[header.indexOf('marks')]?.trim() || '1') || 1,
        rowNumber: i + 1,
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

// Parse CSV line handling quoted fields
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
  const header = 'question_text,option_a,option_b,option_c,option_d,correct_answer,marks';
  const example1 = '"What is 2+2?","3","4","5","6","B","1"';
  const example2 = '"What is the capital of France?","London","Berlin","Paris","Madrid","C","2"';
  const example3 = '"Which language runs in the browser natively?","Python","JavaScript","Java","C++","B","1"';

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
