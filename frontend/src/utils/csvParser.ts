export interface ParsedQuestion {
  question_text: string;
  question_type: "mcq" | "true_false" | "multi_select" | "fill_blank" | "subjective" | "coding";
  options: string[];
  correct_answers: string[];
  marks: number;
  negative_marks: number;
  difficulty: string;
  explanation: string;
  image_url?: string;
  rowNumber: number;
  import_batch_id?: string;
  version?: number;
}

export interface CSVParseResult {
  questions: ParsedQuestion[];
  errors: { row: number; message: string }[];
}

export function parseCSV(csvText: string, importBatchId?: string): CSVParseResult {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  const questions: ParsedQuestion[] = [];
  const errors: { row: number; message: string }[] = [];

  if (lines.length === 0 || !lines[0].trim()) {
    errors.push({ row: 0, message: 'CSV file is empty' });
    return { questions, errors };
  }

  // Parse header
  const header = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  
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

      // 5. Explanation & Optional Image URL
      const explanation = header.includes('explanation')
        ? values[header.indexOf('explanation')]?.trim() || ''
        : '';

      const image_url = header.includes('image_url')
        ? values[header.indexOf('image_url')]?.trim() || ''
        : undefined;

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
        image_url,
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
  const header = 'question_text,question_type,option_a,option_b,option_c,option_d,correct_answer,marks,negative_marks,difficulty,explanation,image_url';
  const q1 = '"What is the capital city of France?","mcq","Berlin","Madrid","Paris","Rome","C","1","0.25","easy","Paris is the capital of France.","https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400"';
  const q2 = '"The human heart has 4 chambers.","true_false","True","False","","","A","1","0","easy","Human heart consists of 2 atria and 2 ventricles.",""';
  const q3 = '"Identify the world famous monument shown in the image.","mcq","Taj Mahal","Colosseum","Eiffel Tower","Pyramids","A","2","0.5","medium","The Taj Mahal is located in Agra, India.","https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400"';
  const q4 = '"Which geometric shape is depicted in the illustration?","mcq","Equilateral Triangle","Circle","Hexagon","Square","B","1","0.25","easy","The image displays a smooth circle shape.","https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400"';
  const q5 = '"Light travels faster than sound in air.","true_false","True","False","","","A","1","0","easy","Speed of light is 3x10^8 m/s vs sound at 343 m/s.",""';
  const q6 = '"What is the output of 15 * 4 in basic arithmetic?","mcq","50","60","65","70","B","1","0.25","easy","15 multiplied by 4 equals 60.",""';
  const q7 = '"Examine the microchip board architecture in the image.","mcq","Series Circuit","Parallel Circuit","Printed Circuit Board","Fiber Optic","C","2","0.5","hard","The image displays a PCB motherboard architecture.","https://images.unsplash.com/photo-1518770660439-4636190af475?w=400"';
  const q8 = '"Water freezes at 0 degrees Celsius under standard atmospheric pressure.","true_false","True","False","","","A","1","0","easy","0°C is the freezing point of pure water.",""';
  const q9 = '"Which organelle is known as the powerhouse of the cell?","mcq","Nucleus","Ribosome","Mitochondria","Golgi Body","C","1","0.25","medium","Mitochondria generate ATP energy for the cell.","https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=400"';
  const q10 = '"Identify the software development workspace environment shown.","mcq","Code Editor","Database Manager","Vector Drawing","Spreadsheet","A","2","0.5","medium","The image shows source code in a modern IDE code editor.","https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400"';

  return [header, q1, q2, q3, q4, q5, q6, q7, q8, q9, q10].join('\n');
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
