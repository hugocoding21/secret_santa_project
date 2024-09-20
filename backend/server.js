const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const GroupRoutes = require("./src/routes/GroupRoute");

dotenv.config();

const { PORT, DB_ADDRESSE, DB_NAME } = process.env;

const app = express();

app.use(express.json());

app.use("/groups", GroupRoutes);

mongoose
  .connect(`mongodb://${DB_ADDRESSE}/${DB_NAME}`)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
