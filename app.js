require("dotenv").config();

const express = require("express");
const cors = require("cors");
const app = express();

const connectDB = require("./db.js");

//routes
const flashcardRoute = require("./routes/flashcard.js");

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200); // respond to preflight immediately
  }
  next();
});

app.use("/api/flashcards", flashcardRoute);
const PORT = process.env.PORT || 8080;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server up and running on port ${PORT}`);
  });
});
