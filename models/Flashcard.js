const mongoose = require("mongoose");

const CartFrontSchema = new mongoose.Schema({
  text: {
    type: String,
    require: true,
  },
  pronunciation: {
    english: {
      type: String,
      required: false,
    },
    hindi: {
      type: String,
      require: false,
    },
  },
});

const CardBackSchema = new mongoose.Schema({
  content_eng: {
    type: String,
    required: true,
  },
  example_eng: {
    type: [String],
    required: false,
  },
  content_hindi: {
    type: [String],
    required: false,
  },
  example_hindi: {
    type: [String],
    required: false,
  },
  synonyms: {
    type: [String],
    required: false,
  },
  antonyms: {
    type: [String],
    required: false,
  },
});

const FlashcardSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      required: false,
    },
    front: {
      type: CartFrontSchema,
      required: true,
    },
    back: {
      type: CardBackSchema,
      required: true,
    },
    tags: {
      type: [String],
      required: false,
    },
  },
  { timestamps: true }
);

FlashcardSchema.statics.getFilteredCards = async function ({
  subject,
  type,
  difficulty,
  tag,
  alphabet,
}) {
  let query = {};
  if (subject) {
    query.subject = subject;
  }
  if (type) {
    query.type = type;
  }
  if (difficulty) {
    query.difficulty = difficulty;
  }
  if (tag) {
    query.tags = { $in: [tag] };
  }

  console.log(query);
  let result = await this.find(query);
  if (alphabet) {
    const upper = alphabet.toUpperCase();
    result = result((card) => card.front.text[0].toUpperCase() === upper);
  }

  return result;
};

module.exports =
  mongoose.models.Flashcard ||
  mongoose.model("Flashcard", FlashcardSchema, "flashcards");
