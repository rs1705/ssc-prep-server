const express = require("express");
const cors = require("cors");
const app = express();
const connectDB = require("./db");

//routes
const flashcardRoute = require("./routes/Flashcard");

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

connectDB().then(() => {
  app.listen(8080, () => {
    console.log("server up and running.");
  });
});
