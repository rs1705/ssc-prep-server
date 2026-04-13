import FlashcardInteraction from "../models/interactionModel.js";

export async function saveInteraction(req, res) {
  const { userId, cardId, status } = req.body;
  console.log(req.body);
  if (!userId) {
    return res.status(401).json({ message: "User not found" });
  }
  try {
    const revisionFlashcards = await FlashcardInteraction.saveInteraction(
      userId,
      cardId,
      status,
    );
    return res.json(revisionFlashcards);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
