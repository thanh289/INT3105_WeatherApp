import mongoose from "mongoose";

type TInput = {
  db: string;
};

// destructing
export default ({ db }: TInput) => {
  const connectDB = () => {
    mongoose
      .connect(db, {})  // can pass optional connection in {}
      .then(() => {
        return console.info("Successfully connected to database");
      })
      .catch((error) => {
        console.error("Error connecting to database: " + error.message);
        return process.exit(1);
      });
  };
  connectDB();

  // if the connection to MongoDB is lost, mongoose will release event "disconnected"
  // and call connectDB() again to reconnect
  mongoose.connection.on("disconnected", connectDB);
};
