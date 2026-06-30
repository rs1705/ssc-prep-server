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
    learningStatus: {
      type: String,
      enum: ["known", "unknown"],
      default: "unknown",
      required: true,
    },
    isImportant: {
      type: Boolean,
      default: false,
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

FlashcardInteractionSchema.statics.saveInteractions = async function (
  userId,
  cardId,
  action,
) {
  const existing = await this.findOne({ userId, cardId });

  if (existing) {
    existing.reviewCount += 1;
    existing.lastReviewed = new Date();
    if (action === "known") {
      existing.correctCount += 1;
      existing.learningStatus = "known";
    }
    if (action === "unknown") {
      existing.learningStatus = "unknown";
      existing.wrongCount += 1;
    }
    if (action === "important") {
      existing.isImportant = !existing.isImportant;
    }

    return await existing.save();
  }

  return await this.create({
    userId,
    cardId,
    learningStatus: action,
    correctCount: action === "known" ? 1 : 0,
    wrongCount: action === "unknown" ? 1 : 0,
  });
};

FlashcardInteractionSchema.statics.getInteractions = async function (userId) {
  const userInteractions = await this.find({
    userId,
  });
  const iMap = {};
  userInteractions.forEach((i) => {
    iMap[i.cardId] = i.status;
  });

  return iMap;
};

export default mongoose.models.flashcardInteraction ||
  mongoose.model(
    "FlashcardInteraction",
    FlashcardInteractionSchema,
    "flashcardInteractions",
  );
