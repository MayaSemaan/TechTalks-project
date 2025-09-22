import mongoose from "mongoose";

const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(
    "mongodb+srv://mayasemaan:Sk0JkGszO1BSoDMF@cluster0.hvit37m.mongodb.net/smart-medicine?retryWrites=true&w=majority"
  );
};

export default connectDB;
