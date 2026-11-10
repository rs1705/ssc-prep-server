import type { Item } from 'generated/prisma/client';

export interface FlashcardFront {
  text: string;
  pronunciation?: { english?: string; hindi?: string };
}

export interface FlashcardBack {
  content_eng: string;
  example_eng?: string[];
  content_hindi?: string[];
  example_hindi?: string[];
  synonyms?: string[];
  antonyms?: string[];
}

/** Shape stored in `Item.content` for `type = "Flashcard"`. */
export interface FlashcardContent {
  front: FlashcardFront;
  back: FlashcardBack;
  exam?: string;
  year?: string;
}

/**
 * Response shape the frontend already consumes (it was the old Mongo document),
 * so the web app only needs to change its URLs, not its components.
 */
export interface FlashcardDto {
  /** Kept for backwards compatibility with the Mongo-era frontend. */
  _id: string;
  id: string;
  subject: string;
  /** "vocab" | "idiom" | "ows" */
  type: string;
  difficulty: string;
  exam?: string;
  year?: string;
  front: FlashcardFront;
  back: FlashcardBack;
  tags: string[];
}

function isFlashcardContent(value: unknown): value is FlashcardContent {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const front = v.front as Record<string, unknown> | undefined;
  const back = v.back as Record<string, unknown> | undefined;
  return (
    typeof front?.text === 'string' && typeof back?.content_eng === 'string'
  );
}

/** Returns null for items whose content isn't a well-formed flashcard. */
export function toFlashcardDto(item: Item): FlashcardDto | null {
  if (!isFlashcardContent(item.content)) return null;
  const { front, back, exam, year } = item.content;
  return {
    _id: item.id,
    id: item.id,
    subject: item.subject.toLowerCase(),
    type: (item.topics[0] ?? 'vocab').toLowerCase(),
    difficulty: (item.difficulty ?? 'medium').toLowerCase(),
    exam,
    year,
    front,
    back,
    tags: item.tags,
  };
}

export function toFlashcardDtos(items: Item[]): FlashcardDto[] {
  return items
    .map(toFlashcardDto)
    .filter((dto): dto is FlashcardDto => dto !== null);
}

/** Old API sorted cards alphabetically by their front text. */
export function sortByFront(cards: FlashcardDto[]): FlashcardDto[] {
  return [...cards].sort((a, b) =>
    a.front.text.localeCompare(b.front.text, 'en', { sensitivity: 'base' }),
  );
}
