import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  SUBJECT_SECTION,
  SUBJECT_TOPIC_ID,
  paperLabel,
  toPyqDtos,
  type PyqDto,
  type SubjectKey,
} from './pyq.mapper';

const DEFAULT_SET_SIZE = 10;
/** One section's share of the 60-minute, 100-question paper. */
const SECONDS_PER_QUESTION = 36;

export interface TopicSummary {
  topic: string;
  count: number;
  subtopics: string[];
}

/** A node of the topic tree with how many usable questions sit under it. */
export interface TopicNode {
  id: string;
  name: string;
  count: number;
  concepts: string[];
  children: TopicNode[];
}

export interface PaperSummary {
  id: string;
  title: string;
  year: number;
  shift: string | null;
  date: Date | null;
  questionCount: number;
}

export interface SectionalPaper extends PaperSummary {
  durationSeconds: number;
  questions: PyqDto[];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

@Injectable()
export class PyqsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Usable PYQs for a subject: image-dependent questions are left out. */
  private baseWhere(subject: SubjectKey): Prisma.ItemWhereInput {
    return {
      type: 'PYQ',
      subject: SUBJECT_SECTION[subject],
      content: { path: ['requiresImage'], equals: false },
    };
  }

  /** Topics with question counts, largest first. */
  async topics(subject: SubjectKey): Promise<TopicSummary[]> {
    const items = await this.prisma.item.findMany({
      where: this.baseWhere(subject),
      select: { topics: true, subtopics: true },
    });

    const byTopic = new Map<
      string,
      { count: number; subtopics: Set<string> }
    >();
    for (const item of items) {
      const topic = item.topics[0] ?? 'General';
      const entry = byTopic.get(topic) ?? { count: 0, subtopics: new Set() };
      entry.count += 1;
      item.subtopics.forEach((s) => entry.subtopics.add(s));
      byTopic.set(topic, entry);
    }

    return [...byTopic.entries()]
      .map(([topic, entry]) => ({
        topic,
        count: entry.count,
        subtopics: [...entry.subtopics].sort(),
      }))
      .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
  }

  /**
   * The subject's topic tree (topics → subtopics) with question counts, in syllabus order.
   * Every node is listed, empty ones with count 0, so the app can show them greyed out.
   */
  async topicTree(subject: SubjectKey): Promise<TopicNode[]> {
    const root = SUBJECT_TOPIC_ID[subject];
    const [rows, items] = await Promise.all([
      this.prisma.topic.findMany({
        where: { id: { startsWith: `${root}.` } },
        orderBy: { position: 'asc' },
      }),
      this.prisma.item.findMany({
        where: this.baseWhere(subject),
        select: { topicTags: true },
      }),
    ]);
    // A question counts once under each node it is tagged into.
    const counts = new Map<string, number>();
    for (const item of items) {
      const nodes = new Set<string>();
      for (const tag of item.topicTags) {
        const parts = tag.split('.');
        for (let i = 2; i <= parts.length; i++)
          nodes.add(parts.slice(0, i).join('.'));
      }
      nodes.forEach((n) => counts.set(n, (counts.get(n) ?? 0) + 1));
    }
    const node = (r: (typeof rows)[number]): TopicNode => ({
      id: r.id,
      name: r.name,
      count: counts.get(r.id) ?? 0,
      concepts: r.concepts,
      children: rows.filter((c) => c.parentId === r.id).map(node),
    });
    return rows.filter((r) => r.parentId === root).map(node);
  }

  /**
   * A shuffled practice set, optionally limited to one topic: a topic-list ID (a topic or
   * subtopic, e.g. "quant.geometry" or "quant.geometry.triangles") or an old topic name.
   */
  async practiceSet(
    subject: SubjectKey,
    topic?: string,
    limit = DEFAULT_SET_SIZE,
  ): Promise<PyqDto[]> {
    let filter: Prisma.ItemWhereInput = {};
    if (topic?.startsWith(`${SUBJECT_TOPIC_ID[subject]}.`)) {
      const under = await this.prisma.topic.findMany({
        where: {
          OR: [{ id: topic }, { id: { startsWith: `${topic}.` } }],
          level: 2,
        },
        select: { id: true },
      });
      filter = { topicTags: { hasSome: under.map((t) => t.id) } };
    } else if (topic) {
      filter = { topics: { has: topic } };
    }
    const items = await this.prisma.item.findMany({
      where: {
        ...this.baseWhere(subject),
        ...filter,
      },
      include: { passage: true, examPapers: true },
    });
    return shuffle(toPyqDtos(items)).slice(0, limit);
  }

  /** Papers that have questions for this subject, newest first. */
  async papers(subject: SubjectKey): Promise<PaperSummary[]> {
    const papers = await this.prisma.examPaper.findMany({
      where: { items: { some: this.baseWhere(subject) } },
      orderBy: [{ year: 'desc' }, { date: 'desc' }],
      include: {
        _count: { select: { items: { where: this.baseWhere(subject) } } },
      },
    });

    return papers.map((paper) => ({
      id: paper.id,
      title: paperLabel(paper),
      year: paper.year,
      shift: paper.shift,
      date: paper.date,
      questionCount: paper._count.items,
    }));
  }

  /** One subject's section of a paper, in a stable order, for a timed test. */
  async sectionalPaper(
    paperId: string,
    subject: SubjectKey,
  ): Promise<SectionalPaper> {
    const paper = await this.prisma.examPaper.findUnique({
      where: { id: paperId },
      include: {
        items: {
          where: this.baseWhere(subject),
          orderBy: { id: 'asc' },
          include: { passage: true },
        },
      },
    });
    if (!paper) throw new NotFoundException('Paper not found.');

    const questions = toPyqDtos(
      paper.items.map((item) => ({ ...item, examPapers: [paper] })),
    );
    if (questions.length === 0) {
      throw new NotFoundException(
        'This paper has no questions for the subject.',
      );
    }

    return {
      id: paper.id,
      title: paperLabel(paper),
      year: paper.year,
      shift: paper.shift,
      date: paper.date,
      questionCount: questions.length,
      durationSeconds: questions.length * SECONDS_PER_QUESTION,
      questions,
    };
  }
}
