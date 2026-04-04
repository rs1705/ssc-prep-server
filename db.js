import { connect } from "mongoose";
async function connectDB() {
  try {
    await connect(process.env.MONGO_URI);
    console.log("Connected to DB successfully.");
  } catch (error) {
    console.log(error);
    process.exit();
  }
}

export default connectDB;
