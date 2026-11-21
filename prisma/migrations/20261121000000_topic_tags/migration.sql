-- Topic list with fixed IDs, and subtopic tags on items.
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "parentId" TEXT,
    "position" INTEGER NOT NULL,
    "concepts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Item" ADD COLUMN "topicTags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Filtering by tag (topicTags && '{...}').
CREATE INDEX "Item_topicTags_idx" ON "Item" USING GIN ("topicTags");
