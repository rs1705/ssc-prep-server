const Flashcard = require("../models/Flashcard");

exports.getFilteredCards = async (req, res) => {
  const { subject, type, difficulty, alphabet, exam, year } = req.query;
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
    });
    res.status(200).json(cards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
