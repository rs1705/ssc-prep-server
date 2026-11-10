import type { ExamPaper, Item, Passage } from 'generated/prisma/client';

export const SUBJECT_KEYS = ['maths', 'english', 'reasoning', 'gk'] as const;
export type SubjectKey = (typeof SUBJECT_KEYS)[number];

/** URL subject key -> section name stored on `Item.subject` by the ingestion pipeline. */
export const SUBJECT_SECTION: Record<SubjectKey, string> = {
  maths: 'Quantitative Aptitude',
  english: 'English Comprehension',
  reasoning: 'General Intelligence & Reasoning',
  gk: 'General Awareness',
};

export interface PyqOption {
  label: string;
  text: string;
}

/** Shape stored in `Item.content` for `type = "PYQ"`. */
interface PyqContent {
  question: string;
  options: PyqOption[];
  correctAnswerLabel: string;
  explanation?: string;
  requiresImage?: boolean;
}

export interface PyqDto {
  id: string;
  topic: string;
  subtopics: string[];
  difficulty: string | null;
  /** Markdown with inline LaTeX ($...$). */
  question: string;
  options: PyqOption[];
  answer: string;
  explanation: string;
  /** Shared reading passage, when the question belongs to one. */
  passage: string | null;
  /** e.g. "SSC CGL Tier 1 · 2025" */
  source: string | null;
}

export type ItemWithRelations = Item & {
  passage?: Passage | null;
  examPapers?: ExamPaper[];
};

function isPyqContent(value: unknown): value is PyqContent {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.question === 'string' &&
    typeof v.correctAnswerLabel === 'string' &&
    Array.isArray(v.options) &&
    v.options.length >= 2 &&
    v.options.every(
      (o) =>
        typeof o === 'object' &&
        o !== null &&
        typeof (o as PyqOption).label === 'string' &&
        typeof (o as PyqOption).text === 'string',
    )
  );
}

export function paperLabel(paper: Pick<ExamPaper, 'year'>): string {
  // Paper titles from ingestion are inconsistent; the app covers SSC CGL Tier 1 only.
  return `SSC CGL Tier 1 · ${paper.year}`;
}

/** Returns null for malformed rows and for questions that need a missing image. */
export function toPyqDto(item: ItemWithRelations): PyqDto | null {
  if (!isPyqContent(item.content) || item.content.requiresImage === true) {
    return null;
  }
  const { question, options, correctAnswerLabel, explanation } = item.content;
  if (!options.some((o) => o.label === correctAnswerLabel)) return null;

  const paper = item.examPapers?.[0];
  return {
    id: item.id,
    topic: item.topics[0] ?? 'General',
    subtopics: item.subtopics,
    difficulty: item.difficulty,
    question,
    options,
    answer: correctAnswerLabel,
    explanation: explanation ?? '',
    passage: item.passage?.text ?? null,
    source: paper ? paperLabel(paper) : null,
  };
}

export function toPyqDtos(items: ItemWithRelations[]): PyqDto[] {
  return items.map(toPyqDto).filter((dto): dto is PyqDto => dto !== null);
}
