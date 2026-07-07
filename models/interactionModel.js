import mongoose from "mongoose";
import pkg from "fsrs.js";
const { FSRS, Card } = pkg;
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

    isImportant: {
      type: Boolean,
      default: false,
    },
    last_review: {
      type: Date,
      default: Date.now,
    },

    due: {
      type: Date,
      default: Date.now
    },

    stability: {
      type: Number,
      default: 0
    },
    difficulty: {
      type: Number,
      default: 0,
    },
    elapsed_days: {
      type: Number,
      default: 0
    },
    scheduled_days: {
      type: Number,
      default: 0
    },

    reps: {
      type: Number,
      default: 0
    },

    lapses: {
      type: Number,
      default: 0
    },

    state: {
      type: Number,
      default: 0
    }

  },
  { timestamps: true },
);
FlashcardInteractionSchema.index({ userId: 1, cardId: 1 }, { unique: true });
const f = new FSRS();
FlashcardInteractionSchema.statics.saveInteractions = async function (
  userId,
  cardId,
  rating,
) {

  const existing = await this.findOne({ userId, cardId });
  let cardState = new Card();
  if (existing) {
    cardState = {
      due: existing.due,
      stability: existing.stability,
      difficulty: existing.difficulty,
      elapsed_days: existing.elapsed_days,
      scheduled_days: existing.scheduled_days,
      reps: existing.reps,
      lapses: existing.lapses,
      state: existing.state,
      last_review: new Date(existing.last_review)
    }
  }

  const now = new Date()

  const schedulingOptions = f.repeat(cardState, now)
  const nextCardState = schedulingOptions[rating].card;

  if (existing) {
    existing.due = nextCardState.due;
    existing.stability = nextCardState.stability
    existing.difficulty = nextCardState.difficulty
    existing.elapsed_days = nextCardState.elapsed_days;
    existing.scheduled_days = nextCardState.scheduled_days;
    existing.reps = nextCardState.reps;
    existing.lapses = nextCardState.lapses
    existing.state = nextCardState.state;
    existing.last_review = now
    return await existing.save()
  }

  return await this.create({
    userId,
    cardId,
    due: nextCardState.due,
    stability: nextCardState.stability,
    difficulty: nextCardState.difficulty,
    elapsed_days: nextCardState.elapsed_days,
    scheduled_days: nextCardState.scheduled_days,
    reps: nextCardState.reps,
    lapses: nextCardState.lapses,
    state: nextCardState.state,
    last_review: now,
  })


};

FlashcardInteractionSchema.statics.getInteractions = async function (userId) {
  const userInteractions = await this.find({
    userId,
  });
  const iMap = {};
  userInteractions.forEach((i) => {
    iMap[i.cardId] = i;
  });

  return iMap;
};

export default mongoose.models.flashcardInteraction ||
  mongoose.model(
    "FlashcardInteraction",
    FlashcardInteractionSchema,
    "flashcardInteractions",
  );
