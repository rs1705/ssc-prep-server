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
  /** The option in the content-block format (main-app/CONTENT_FORMAT.md), when it has more than text. */
  blocks?: ContentBlock[];
}

/**
 * One block of the content format (main-app/CONTENT_FORMAT.md). The server passes blocks
 * through as stored; the app's renderer checks each spec before drawing it.
 */
export type ContentBlock = { type: string } & Record<string, unknown>;

/** At most this many blocks per field, so one bad row can't bloat a response. */
const MAX_BLOCKS = 60;

/** Blocks as stored, or undefined when the field is missing or malformed. */
export function blocksOrUndefined(value: unknown): ContentBlock[] | undefined {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_BLOCKS)
    return undefined;
  const ok = value.every(
    (b) =>
      typeof b === 'object' &&
      b !== null &&
      !Array.isArray(b) &&
      typeof (b as { type?: unknown }).type === 'string',
  );
  return ok ? (value as ContentBlock[]) : undefined;
}

/** Shape stored in `Item.content` for `type = "PYQ"`. */
interface PyqContent {
  question: string;
  options: PyqOption[];
  correctAnswerLabel: string;
  explanation?: string;
  requiresImage?: boolean;
  questionBlocks?: unknown;
  explanationBlocks?: unknown;
}

export interface PyqDto {
  id: string;
  topic: string;
  subtopics: string[];
  difficulty: string | null;
  /** Markdown with inline LaTeX ($...$). Always set, also when blocks are. */
  question: string;
  /** The question in the block format (tables, series, diagrams), when it has one. */
  questionBlocks?: ContentBlock[];
  options: PyqOption[];
  answer: string;
  explanation: string;
  /** The explanation in the block format, when it has one. */
  explanationBlocks?: ContentBlock[];
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
  const questionBlocks = blocksOrUndefined(item.content.questionBlocks);
  const explanationBlocks = blocksOrUndefined(item.content.explanationBlocks);
  return {
    id: item.id,
    topic: item.topics[0] ?? 'General',
    subtopics: item.subtopics,
    difficulty: item.difficulty,
    question,
    ...(questionBlocks ? { questionBlocks } : {}),
    options: options.map((o) => {
      const blocks = blocksOrUndefined(o.blocks);
      return blocks
        ? { label: o.label, text: o.text, blocks }
        : { label: o.label, text: o.text };
    }),
    answer: correctAnswerLabel,
    explanation: explanation ?? '',
    ...(explanationBlocks ? { explanationBlocks } : {}),
    passage: item.passage?.text ?? null,
    source: paper ? paperLabel(paper) : null,
  };
}

export function toPyqDtos(items: ItemWithRelations[]): PyqDto[] {
  return items.map(toPyqDto).filter((dto): dto is PyqDto => dto !== null);
}
