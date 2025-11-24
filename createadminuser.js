// createAdminUser.js - Run this once to create an admin user
// Usage: node createAdminUser.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// User Schema (copy from your User model)
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },

  password: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", UserSchema);

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/feedback-system",
      {
        autoIndex: true,
      }
    );
    console.log("✅ Connected to MongoDB");

    // Admin credentials
    const adminData = {
      name: "Admin User",
      email: "admin@example.com", // Change this
      password: "admin123", // Change this
      role: "admin",
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log("⚠️ Admin already exists:", adminData.email);
      console.log(
        "💡 Use: node createAdminUser.js --force to update role/password"
      );

      // Update if --force provided
      if (process.argv[2] === "--force") {
        existingAdmin.role = "admin";
        existingAdmin.password = await bcrypt.hash(adminData.password, 10);
        await existingAdmin.save();
        console.log("✅ Updated existing user to admin");
      }
      process.exit(0);
    }

    // Create new admin
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    const admin = new User({
      name: adminData.name,
      email: adminData.email,
      password: hashedPassword,
      role: "admin",
    });

    await admin.save();

    console.log("🎉 Admin user created successfully!");
    console.log("----------------------");
    console.log("Email:", adminData.email);
    console.log("Password:", adminData.password);
    console.log("Role: admin");
    console.log("----------------------");
    console.log("👉 Login at http://localhost:3000/login");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  }
}

createAdminUser();
