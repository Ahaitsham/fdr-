require("dotenv").config();
const mongoose = require("mongoose");
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error("JWT_SECRET must be set (16+ chars)");
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI must be set");
  process.exit(1);
}
const app = require("./app");
const { startReminders } = require("./jobs/reminders");

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`API listening on :${port}`));
    startReminders();
  })
  .catch((e) => {
    console.error("MongoDB connection failed:", e.message);
    process.exit(1);
  });
