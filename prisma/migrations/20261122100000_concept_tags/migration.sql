-- Concept tags on items (level-3 Topic rows).
ALTER TABLE "Item" ADD COLUMN "conceptTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
CREATE INDEX "Item_conceptTags_idx" ON "Item" USING GIN ("conceptTags");
