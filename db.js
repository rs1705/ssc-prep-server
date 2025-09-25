require("dotenv").config();
const mongoose = require("mongoose");
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB successfully.");
  } catch (error) {
    console.log(error);
    process.exit();
  }
}

module.exports = connectDB;
