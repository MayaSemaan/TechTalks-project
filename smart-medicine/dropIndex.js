// dropIndex.js
import mongoose from "mongoose";

const uri =
  "mongodb+srv://mayasemaan:Sk0JkGszO1BSoDMF@cluster0.hvit37m.mongodb.net/smart-medicine?retryWrites=true&w=majority&appName=Cluster0";

async function dropIndex() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB Atlas");

    // Drop the bad index on `users`
    await mongoose.connection.db.collection("users").dropIndex("email_1");
    console.log("Dropped index email_1");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

dropIndex();
