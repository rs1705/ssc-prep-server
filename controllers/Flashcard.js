const Flashcard = require("../models/Flashcard");

exports.getFilteredCards = async (req, res) => {
  const { subject, type, difficulty, tag, alphabet } = req.query;
  try {
    const cards = await Flashcard.getFilteredCards({
      subject,
      type,
      difficulty,
      tag,
      alphabet,
    });
    console.log(cards);
    res.status(200).json(cards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
