const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGODB_URI = "mongodb://admin:changeme@mongo:27017/projeto-sass?authSource=admin";

async function createAdmin() {
  await mongoose.connect(MONGODB_URI);

  const User = require("../db/models/User");

  const adminEmail = "admin@vendata.com.br";
  const adminPassword = "Admin123!@#";

  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    console.log("Admin user already exists");
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = new User({
    email: adminEmail,
    password: hashedPassword,
    firstName: "Admin",
    lastName: "Vendata",
    emailVerified: true,
    status: "active",
    role: "admin",
  });

  await admin.save();
  console.log("Admin user created successfully");
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
