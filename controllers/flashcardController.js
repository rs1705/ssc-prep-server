import Flashcard from "../models/flashcardModel.js";
import FlashcardInteraction from "../models/interactionModel.js";

export async function getFilteredCards(req, res) {
  console.log("inside get filtered cards");
  const { subject, type, difficulty, alphabet, exam, year, highFrequency } =
    req.query;
  const tags = req.query.tags?.split(",");
  try {
    const cards = await Flashcard.getFilteredCards({
      subject,
      type,
      exam,
      year,
      difficulty,
      tags,
      alphabet,
      highFrequency,
    });
    res.status(200).json(cards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}


export const getStudyDeck = async (req, res) => {
  try {
    const userId = req.user.uid;
    const DAILY_NEW_LIMIT = 30;
    const interactions = await FlashcardInteraction.find({
      userId
    });
    const now = new Date().getTime();
    const dueInteractions = interactions.filter(interaction => new Date(interaction.due).getTime() <= now)
    const dueCardIds = dueInteractions.map(i => i.cardId)

    const dueCards = await Flashcard.find({ _id: { $in: dueCardIds } })

    const interactedCardIds = interactions.map(i => i.cardId)
    const newCards = await Flashcard.find({
      _id: { $nin: interactedCardIds }
    }).limit(DAILY_NEW_LIMIT)

    const studyDeck = [...dueCards, ...newCards]
    res.status(200).json(studyDeck)
  } catch (error) {
    console.log("Error generating study deck.", error);
    res.status(500).json({ message: "Failed to generate study deck." })
  }
}
