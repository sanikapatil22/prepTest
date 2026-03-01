export interface CSVQuestion {
  questionText: string;
  questionType: "SINGLE_SELECT" | "MULTI_SELECT";
  options: { id: string; text: string }[];
  correctOptionIds: string[];
  marks: number;
  negativeMarks: number;
  explanation?: string;
}

export interface CSVParseError {
  row: number;
  message: string;
}

const EXPECTED_HEADERS = [
  "question_text",
  "option_1",
  "option_2",
  "option_3",
  "option_4",
  "correct_answers",
  "question_type",
  "marks",
  "negative_marks",
  "explanation",
];

/**
 * Parse raw CSV text into a 2D string array.
 * Handles quoted fields with commas, newlines, and escaped quotes ("").
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(current.trim());
        current = "";
      } else if (char === "\n" || (char === "\r" && next === "\n")) {
        row.push(current.trim());
        current = "";
        if (row.some((cell) => cell !== "")) {
          rows.push(row);
        }
        row = [];
        if (char === "\r") i++; // skip \n in \r\n
      } else {
        current += char;
      }
    }
  }

  // Last field/row
  row.push(current.trim());
  if (row.some((cell) => cell !== "")) {
    rows.push(row);
  }

  return rows;
}

/**
 * Parse and validate a CSV string into MCQ questions.
 */
export function parseQuestionsCSV(text: string): {
  questions: CSVQuestion[];
  errors: CSVParseError[];
} {
  const rows = parseCSV(text);
  const questions: CSVQuestion[] = [];
  const errors: CSVParseError[] = [];

  if (rows.length === 0) {
    errors.push({ row: 0, message: "CSV file is empty" });
    return { questions, errors };
  }

  // Validate header
  const header = rows[0].map((h) => h.toLowerCase().trim());
  const missingHeaders = EXPECTED_HEADERS.filter(
    (h) => !header.includes(h)
  );
  if (missingHeaders.length > 0) {
    errors.push({
      row: 1,
      message: `Missing headers: ${missingHeaders.join(", ")}`,
    });
    return { questions, errors };
  }

  const colIndex = (name: string) => header.indexOf(name);
  const idBase = Date.now();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1; // 1-indexed for user display

    // Pad row to header length
    while (row.length < header.length) {
      row.push("");
    }

    const questionText = row[colIndex("question_text")];
    if (!questionText) {
      errors.push({ row: rowNum, message: "Question text is empty" });
      continue;
    }

    // Collect non-empty options
    const optionTexts: { index: number; text: string }[] = [];
    for (let j = 1; j <= 4; j++) {
      const text = row[colIndex(`option_${j}`)];
      if (text) {
        optionTexts.push({ index: j, text });
      }
    }

    if (optionTexts.length < 2) {
      errors.push({
        row: rowNum,
        message: `At least 2 options required, found ${optionTexts.length}`,
      });
      continue;
    }

    // Parse question type
    const rawType = row[colIndex("question_type")]?.toUpperCase().trim();
    const questionType: "SINGLE_SELECT" | "MULTI_SELECT" =
      rawType === "MULTI_SELECT" ? "MULTI_SELECT" : "SINGLE_SELECT";

    // Parse correct answers (1-indexed, semicolon-separated)
    const correctAnswersRaw = row[colIndex("correct_answers")];
    if (!correctAnswersRaw) {
      errors.push({ row: rowNum, message: "Correct answers field is empty" });
      continue;
    }

    const correctIndices = correctAnswersRaw
      .split(";")
      .map((s) => parseInt(s.trim(), 10));

    if (correctIndices.some((n) => isNaN(n))) {
      errors.push({
        row: rowNum,
        message: `Invalid correct_answers format: "${correctAnswersRaw}"`,
      });
      continue;
    }

    // Validate correct answer indices reference non-empty options
    const validOptionIndices = optionTexts.map((o) => o.index);
    const invalidIndices = correctIndices.filter(
      (idx) => !validOptionIndices.includes(idx)
    );
    if (invalidIndices.length > 0) {
      errors.push({
        row: rowNum,
        message: `Correct answers reference empty/missing options: ${invalidIndices.join(", ")}`,
      });
      continue;
    }

    // SINGLE_SELECT must have exactly 1 correct answer
    if (questionType === "SINGLE_SELECT" && correctIndices.length !== 1) {
      errors.push({
        row: rowNum,
        message: `SINGLE_SELECT must have exactly 1 correct answer, found ${correctIndices.length}`,
      });
      continue;
    }

    // Build options with generated IDs
    const options = optionTexts.map((o, idx) => ({
      id: `opt_${idBase}_${i}_${idx}`,
      text: o.text,
    }));

    // Map correct 1-indexed positions to option IDs
    const correctOptionIds = correctIndices.map((ci) => {
      const optIdx = optionTexts.findIndex((o) => o.index === ci);
      return options[optIdx].id;
    });

    // Parse marks
    const marksRaw = row[colIndex("marks")];
    const marks = marksRaw ? parseInt(marksRaw, 10) : 1;
    if (isNaN(marks) || marks < 1) {
      errors.push({
        row: rowNum,
        message: `Invalid marks value: "${marksRaw}"`,
      });
      continue;
    }

    // Parse negative marks
    const negMarksRaw = row[colIndex("negative_marks")];
    const negativeMarks = negMarksRaw ? parseFloat(negMarksRaw) : 0;
    if (isNaN(negativeMarks) || negativeMarks < 0) {
      errors.push({
        row: rowNum,
        message: `Invalid negative_marks value: "${negMarksRaw}"`,
      });
      continue;
    }

    const explanation = row[colIndex("explanation")] || undefined;

    questions.push({
      questionText,
      questionType,
      options,
      correctOptionIds,
      marks,
      negativeMarks,
      explanation,
    });
  }

  return { questions, errors };
}

/**
 * Generate a CSV template string for download.
 */
export function generateCSVTemplate(): string {
  const header = EXPECTED_HEADERS.join(",");
  const example1 = `"What is 2+2?","1","2","3","4","4",SINGLE_SELECT,1,0,""`;
  const example2 = `"Select all prime numbers","2","3","4","5","1;2;4",MULTI_SELECT,2,0.5,"2, 3, and 5 are prime"`;
  return `${header}\n${example1}\n${example2}\n`;
}
