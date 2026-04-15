import express, { json } from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
const app = express();

import connectDB from "./db.js";

//routes
import flashcardRoute from "./routes/flashcardRoute.js";
import interactionRoute from "./routes/interactionRoute.js";
app.use(cors());
app.use(json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200); // respond to preflight immediately
  }
  next();
});

app.use("/api/flashcards", flashcardRoute);
app.use("/api/interactions", interactionRoute);
const PORT = process.env.PORT || 8080;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server up and running on port ${PORT}`);
  });
});
