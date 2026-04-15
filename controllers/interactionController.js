import FlashcardInteraction from "../models/interactionModel.js";

export async function saveInteractions(req, res) {
  const { userId, cardId, action } = req.body;
  console.log(action);
  if (!userId) {
    return res.status(401).json({ message: "User not found" });
  }
  try {
    const interaction = await FlashcardInteraction.saveInteractions(
      userId,
      cardId,
      action,
    );

    return res.json(interaction);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function getInteractions(req, res) {
  const { userId } = req.query;

  if (!userId || userId === "undefined" || userId === "null") {
    return res.status(401).json({ messsage: "User not found!" });
  }

  try {
    const interactions = await FlashcardInteraction.getInteractions(userId);
    return res.json(interactions);
  } catch (error) {
    return res.status(400).json({ messsage: "Some error occurred." });
  }
}
