import mongoose from "mongoose";

const FlashcardInteractionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Flashcard",
    },

    status: {
      type: String,
      enum: ["known", "unknown", "important"],
      required: true,
    },

    reviewCount: {
      type: Number,
      default: 1,
    },
    correctCount: {
      type: Number,
      default: 0,
    },
    wrongCount: {
      type: Number,
      default: 0,
    },
    lastReviewed: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);
FlashcardInteractionSchema.index({ userId: 1, cardId: 1 }, { unique: true });

FlashcardInteractionSchema.statics.saveInteraction = async function (
  userId,
  cardId,
  status,
) {
  const existing = await this.findOne({ userId, cardId });
  if (existing) {
    existing.status = status;
    existing.reviewCount += 1;
    existing.lastReviewed = new Date();

    if (status === "known") {
      existing.correctCount += 1;
    }
    if (status === "unknown") {
      existing.wrongCount += 1;
    }

    return await existing.save();
  }

  return await this.create({
    userId,
    cardId,
    status,
    correctCount: status === "known" ? 1 : 0,
    wrongCount: status === "unknown" ? 1 : 0,
  });
};

FlashcardInteractionSchema.statics.getRevisionCards = async function (userId) {
  const interactions = await this.find({
    userId,
    status: { $in: ["unknown", "important"] },
  });

  const cardIds = interactions.map((i) => i.cardId);
  const Flashcard = mongoose.model("Flashcard");
  return await Flashcard.find({ _id: { $in: cardIds } });
};

export default mongoose.models.flashcardInteraction ||
  mongoose.model(
    "FlashcardInteraction",
    FlashcardInteractionSchema,
    "FlashcardInteractions",
  );
