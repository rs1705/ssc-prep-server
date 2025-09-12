const express = require("express");
const route = express.Router();
const flashcardController = require("../controllers/FlashCard");

route.get("/getFilteredCards", flashcardController.getFilteredCards);
module.exports = route;
