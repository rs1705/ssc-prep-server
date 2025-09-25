const mongoose = require("mongoose");

const CartFrontSchema = new mongoose.Schema(
  {
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
  },
  { _id: false }
);

const CardBackSchema = new mongoose.Schema(
  {
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
  },
  { _id: false }
);

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
    exam: {
      type: String,
      required: false,
    },
    year: {
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
  exam,
  year,
  difficulty,
  tags,
  alphabet,
  highFrequency,
}) {
  let query = {};
  if (subject) {
    query.subject = subject;
  }
  if (type) {
    query.type = type;
  }
  if (exam) {
    query.exam = exam;
  }
  if (year) {
    query.year = year;
  }
  if (difficulty) {
    query.difficulty = difficulty;
  }
  if (tags && tags.length > 0) {
    query.tags = { $all: tags };
  }
  if (highFrequency) {
    query.tags = { $in: "high frequency" };
  }

  if (alphabet) {
    const upper = alphabet.toUpperCase();
    query["front.text"] = { $regex: `^${upper}`, $options: "i" };
  }
  console.log(query);

  let result = await this.find(query).sort({ "front.text": 1 });

  return result;
};

module.exports =
  mongoose.models.Flashcard ||
  mongoose.model("Flashcard", FlashcardSchema, "flashcards");
