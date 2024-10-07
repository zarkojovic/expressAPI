import { connect } from "mongoose";

const uri = "mongodb://localhost:27017/smart-cycle-market";
connect(uri)
  .then(() => {
    console.log("Database connected");
  })
  .catch(() => {
    console.log("Database connection failed");
  });
