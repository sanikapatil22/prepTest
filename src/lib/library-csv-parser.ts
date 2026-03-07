import { parseCSV, type CSVParseError } from "./csv-parser";

export interface LibraryCSVQuestion {
  questionText: string;
  questionType: "SINGLE_SELECT" | "MULTI_SELECT";
  options: { id: string; text: string }[];
  correctOptionIds: string[];
  marks: number;
  negativeMarks: number;
  explanation?: string;
  category: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
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
  "category",
  "difficulty",
];

/**
 * Parse and validate a CSV string into library MCQ questions with category/difficulty.
 */
export function parseLibraryQuestionsCSV(text: string): {
  questions: LibraryCSVQuestion[];
  errors: CSVParseError[];
} {
  const rows = parseCSV(text);
  const questions: LibraryCSVQuestion[] = [];
  const errors: CSVParseError[] = [];

  if (rows.length === 0) {
    errors.push({ row: 0, message: "CSV file is empty" });
    return { questions, errors };
  }

  const header = rows[0].map((h) => h.toLowerCase().trim());
  const missingHeaders = EXPECTED_HEADERS.filter((h) => !header.includes(h));
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
    const rowNum = i + 1;

    while (row.length < header.length) {
      row.push("");
    }

    const questionText = row[colIndex("question_text")];
    if (!questionText) {
      errors.push({ row: rowNum, message: "Question text is empty" });
      continue;
    }

    // Category is required
    const category = row[colIndex("category")]?.trim();
    if (!category) {
      errors.push({ row: rowNum, message: "Category is required" });
      continue;
    }

    // Difficulty is required
    const rawDifficulty = row[colIndex("difficulty")]?.toUpperCase().trim();
    if (!rawDifficulty) {
      errors.push({ row: rowNum, message: "Difficulty is required (EASY, MEDIUM, or HARD)" });
      continue;
    }
    if (rawDifficulty !== "EASY" && rawDifficulty !== "MEDIUM" && rawDifficulty !== "HARD") {
      errors.push({
        row: rowNum,
        message: `Invalid difficulty "${rawDifficulty}". Use EASY, MEDIUM, or HARD`,
      });
      continue;
    }
    const difficulty: "EASY" | "MEDIUM" | "HARD" = rawDifficulty;

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

    const rawType = row[colIndex("question_type")]?.toUpperCase().trim();
    const questionType: "SINGLE_SELECT" | "MULTI_SELECT" =
      rawType === "MULTI_SELECT" ? "MULTI_SELECT" : "SINGLE_SELECT";

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

    if (questionType === "SINGLE_SELECT" && correctIndices.length !== 1) {
      errors.push({
        row: rowNum,
        message: `SINGLE_SELECT must have exactly 1 correct answer, found ${correctIndices.length}`,
      });
      continue;
    }

    const options = optionTexts.map((o, idx) => ({
      id: `opt_${idBase}_${i}_${idx}`,
      text: o.text,
    }));

    const correctOptionIds = correctIndices.map((ci) => {
      const optIdx = optionTexts.findIndex((o) => o.index === ci);
      return options[optIdx].id;
    });

    const marksRaw = row[colIndex("marks")];
    const marks = marksRaw ? parseInt(marksRaw, 10) : 1;
    if (isNaN(marks) || marks < 1) {
      errors.push({ row: rowNum, message: `Invalid marks value: "${marksRaw}"` });
      continue;
    }

    const negMarksRaw = row[colIndex("negative_marks")];
    const negativeMarks = negMarksRaw ? parseFloat(negMarksRaw) : 0;
    if (isNaN(negativeMarks) || negativeMarks < 0) {
      errors.push({ row: rowNum, message: `Invalid negative_marks value: "${negMarksRaw}"` });
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
      category,
      difficulty,
    });
  }

  return { questions, errors };
}

/**
 * Generate a CSV template string with category/difficulty columns.
 */
export function generateLibraryCSVTemplate(): string {
  const header = EXPECTED_HEADERS.join(",");
  const example1 = `"What is 2+2?","1","2","3","4","4",SINGLE_SELECT,1,0,"","Math",EASY`;
  const example2 = `"Select all prime numbers","2","3","4","5","1;2;4",MULTI_SELECT,2,0.5,"2, 3, and 5 are prime","Math",MEDIUM`;
  return `${header}\n${example1}\n${example2}\n`;
}
