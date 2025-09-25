const express = require("express");
const route = express.Router();
const flashcardController = require("../controllers/flashcard.js");

route.get("/getFilteredCards", flashcardController.getFilteredCards);
module.exports = route;
