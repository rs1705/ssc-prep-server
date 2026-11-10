import { PrismaClient } from "generated/prisma/client";
import * as fs from "fs";
import * as crypto from "crypto";
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function generateHash(text: string) {
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
}

async function main() {
  console.log("Loading flashcards...");
  // Assuming script is run from the 'server' root directory
  const rawData = fs.readFileSync("test.flashcards.json", "utf8");
  const flashcards = JSON.parse(rawData);
  console.log(`Loaded ${flashcards.length} flashcards from JSON.`);

  const itemsToInsert: any[] = [];
  
  for (const card of flashcards) {
    const textToHash = card.front?.text || "";
    if (!textToHash) continue;
    
    const hash = generateHash(textToHash);
    
    const item = {
      subject: card.subject ? card.subject.charAt(0).toUpperCase() + card.subject.slice(1).toLowerCase() : "English",
      topics: card.type ? [card.type.charAt(0).toUpperCase() + card.type.slice(1).toLowerCase()] : [],
      subtopics: [],
      type: "Flashcard",
      difficulty: card.difficulty ? card.difficulty.charAt(0).toUpperCase() + card.difficulty.slice(1).toLowerCase() : "Medium",
      tags: card.tags || [],
      hash: hash,
      content: {
        front: card.front,
        back: card.back,
        exam: card.exam,
        year: card.year
      }
    };
    itemsToInsert.push(item);
  }

  // 1. Deduplicate in-memory first (in case the JSON itself has duplicates)
  const uniqueItems: any[] = [];
  const seenHashes = new Set<string>();
  
  for (const item of itemsToInsert) {
    if (!seenHashes.has(item.hash)) {
      seenHashes.add(item.hash);
      uniqueItems.push(item);
    }
  }

  console.log(`Found ${uniqueItems.length} unique items to process.`);

  // 2. Fetch existing hashes from DB to avoid inserting what's already there
  const existingItems = await prisma.item.findMany({
    where: { hash: { in: Array.from(seenHashes) } },
    select: { hash: true }
  });
  
  const existingHashes = new Set(existingItems.map(i => i.hash));
  const newItems = uniqueItems.filter(i => !existingHashes.has(i.hash));
  
  console.log(`Inserting ${newItems.length} new items into the database...`);

  // 3. Chunk insert to avoid connection timeouts or payload limits
  const chunkSize = 500;
  for (let i = 0; i < newItems.length; i += chunkSize) {
    const chunk = newItems.slice(i, i + chunkSize);
    await prisma.item.createMany({
      data: chunk,
      skipDuplicates: true
    });
    console.log(`Inserted batch ${Math.floor(i / chunkSize) + 1} of ${Math.ceil(newItems.length / chunkSize)}`);
  }

  console.log("Seeding finished successfully.");
}

main()
  .catch(e => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
