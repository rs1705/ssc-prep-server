import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  SUBJECT_SECTION,
  paperLabel,
  toPyqDtos,
  type ItemWithRelations,
  type PyqDto,
  type SubjectKey,
} from './pyq.mapper';

/** SSC CGL Tier 1 section order. */
export const MOCK_SECTIONS: SubjectKey[] = [
  'reasoning',
  'gk',
  'maths',
  'english',
];
/** Tier 1: 100 questions, 25 per section, 60 minutes. */
export const MOCK_PER_SECTION = 25;
export const MOCK_SECONDS = 60 * 60;

export interface MockSection {
  subject: SubjectKey;
  questions: PyqDto[];
}

export interface FullPaperSummary {
  id: string;
  title: string;
  year: number;
  shift: string | null;
  date: Date | null;
  questionCount: number;
  /** Questions per section, in MOCK_SECTIONS order. */
  sections: { subject: SubjectKey; count: number }[];
}

export interface FullPaper extends Omit<FullPaperSummary, 'sections'> {
  /** "paper" = a real past paper; "mock" = generated from the PYQ bank. */
  kind: 'paper' | 'mock';
  durationSeconds: number;
  sections: MockSection[];
}

const SECTION_TO_KEY = Object.fromEntries(
  MOCK_SECTIONS.map((key) => [SUBJECT_SECTION[key], key]),
) as Record<string, SubjectKey>;

/** Usable PYQs only: image-dependent questions are left out. */
const usable: Prisma.ItemWhereInput = {
  type: 'PYQ',
  subject: { in: MOCK_SECTIONS.map((k) => SUBJECT_SECTION[k]) },
  content: { path: ['requiresImage'], equals: false },
};

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Picks `count` questions at random, keeping reading-comprehension questions
 * that share a passage together (a passage is taken whole or not at all).
 */
export function pickSection<
  T extends { passageId?: string | null; id: string },
>(items: T[], count: number): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.passageId ?? `single:${item.id}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const out: T[] = [];
  for (const group of shuffle([...groups.values()])) {
    if (out.length + group.length <= count) out.push(...group);
    if (out.length === count) break;
  }
  return out;
}

@Injectable()
export class MocksService {
  constructor(private readonly prisma: PrismaService) {}

  /** Past papers that have questions in every section, newest first. */
  async papers(): Promise<FullPaperSummary[]> {
    const papers = await this.prisma.examPaper.findMany({
      where: { items: { some: usable } },
      orderBy: [{ year: 'desc' }, { date: 'desc' }],
      include: { items: { where: usable, select: { subject: true } } },
    });

    return papers
      .map((paper) => {
        const sections = MOCK_SECTIONS.map((subject) => ({
          subject,
          count: paper.items.filter(
            (i) => i.subject === SUBJECT_SECTION[subject],
          ).length,
        }));
        return {
          id: paper.id,
          title: paperLabel(paper),
          year: paper.year,
          shift: paper.shift,
          date: paper.date,
          questionCount: sections.reduce((n, s) => n + s.count, 0),
          sections,
        };
      })
      .filter((p) => p.sections.every((s) => s.count > 0));
  }

  /** A whole past paper, section by section, in a stable order. */
  async paper(id: string): Promise<FullPaper> {
    const paper = await this.prisma.examPaper.findUnique({
      where: { id },
      include: {
        items: {
          where: usable,
          orderBy: { id: 'asc' },
          include: { passage: true },
        },
      },
    });
    if (!paper) throw new NotFoundException('Paper not found.');

    const sections = this.toSections(
      paper.items.map((item) => ({ ...item, examPapers: [paper] })),
      (items) => groupPassages(items),
    );
    if (sections.some((s) => s.questions.length === 0)) {
      throw new NotFoundException('This paper is missing a section.');
    }
    return {
      kind: 'paper',
      id: paper.id,
      title: paperLabel(paper),
      year: paper.year,
      shift: paper.shift,
      date: paper.date,
      questionCount: sections.reduce((n, s) => n + s.questions.length, 0),
      durationSeconds: MOCK_SECONDS,
      sections,
    };
  }

  /** A fresh 100-question mock drawn from every past paper. */
  async generate(): Promise<FullPaper> {
    const items = await this.prisma.item.findMany({
      where: usable,
      include: { passage: true, examPapers: true },
    });
    const sections = this.toSections(items, (list) =>
      pickSection(list, MOCK_PER_SECTION),
    );
    return {
      kind: 'mock',
      id: 'mock',
      title: 'SSC CGL Tier 1 · Mock test',
      year: new Date().getFullYear(),
      shift: null,
      date: null,
      questionCount: sections.reduce((n, s) => n + s.questions.length, 0),
      durationSeconds: MOCK_SECONDS,
      sections,
    };
  }

  private toSections(
    items: ItemWithRelations[],
    arrange: (items: ItemWithRelations[]) => ItemWithRelations[],
  ): MockSection[] {
    return MOCK_SECTIONS.map((subject) => {
      const own = items.filter((i) => SECTION_TO_KEY[i.subject] === subject);
      // Map first so malformed rows never take a slot, then arrange.
      const valid = new Set(toPyqDtos(own).map((q) => q.id));
      return {
        subject,
        questions: toPyqDtos(arrange(own.filter((i) => valid.has(i.id)))),
      };
    });
  }
}

/** Stable order, but questions sharing a passage stay next to each other. */
function groupPassages<T extends { passageId?: string | null; id: string }>(
  items: T[],
): T[] {
  const out: T[] = [];
  const done = new Set<string>();
  for (const item of items) {
    if (done.has(item.id)) continue;
    const group = item.passageId
      ? items.filter((i) => i.passageId === item.passageId)
      : [item];
    for (const g of group) done.add(g.id);
    out.push(...group);
  }
  return out;
}
