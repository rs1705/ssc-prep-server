import mongoose from "mongoose";
const ProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card",
      required: true,
    },
    boxLevel: {
      type: Number,
      default: 1,
    },
    nextReviewDate: {
      type: Date,
      default: Date.now,
    },
    stats: {
      correct: {
        type: Number,
        default: 0,
      },
      wrong: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true }
);
export default mongoose.models.Progress ||
  mongoose.model("Progress", ProgressSchema);
