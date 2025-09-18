const mongoose = require("mongoose");
async function connectDB() {
  try {
    await mongoose.connect(
      "mongodb+srv://asmrahul17:4i50TXE5NJRkRL2x@ssc-prep.bs10gh2.mongodb.net/test?retryWrites=true&w=majority&appName=ssc-prep"
    );
    console.log("Connected to DB successfully.");
  } catch (error) {
    console.log(error);
    process.exit();
  }
}

module.exports = connectDB;
