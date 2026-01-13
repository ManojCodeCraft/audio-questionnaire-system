const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

// Create email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Helper function to return safe user data
function getSafeUserData(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role || "user",
    createdAt: user.createdAt,
  };
}

// -----------------------------
// USER SIGNUP
// -----------------------------
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "All fields required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be 6+ chars",
      });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({
        success: false,
        error: "Email already exists",
      });
    }

    const user = new User({ name, email, password });
    await user.save();

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: getSafeUserData(user),
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({
      success: false,
      error: "Server error during signup",
    });
  }
});

// -----------------------------
// USER LOGIN
// -----------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(400).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: getSafeUserData(user),
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      error: "Server error during login",
    });
  }
});

// -----------------------------
// GET CURRENT USER
// -----------------------------
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    res.json({
      success: true,
      user: getSafeUserData(user),
    });
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(401).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
});

// -----------------------------
// FORGOT PASSWORD - Request Reset
// -----------------------------
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      return res.json({
        success: true,
        message:
          "If an account exists with this email, you will receive password reset instructions.",
      });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Store reset token in user document with expiry
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send email with reset link
    const resetUrl = `${
      process.env.APP_URL || "http://localhost:3000"
    }/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "🔑 Password Reset Request - Audio Feedback Platform",
      html: `
        <div style="font-family: 'Segoe UI', Arial; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; color: white; text-align: center;">
            <h2 style="margin: 0;">🔑 Password Reset Request</h2>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <p style="color: #1f2937; font-size: 16px; margin-bottom: 20px;">Hi ${user.name},</p>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password. Click the button below to create a new password:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                Reset Password
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
              This link will expire in 1 hour. If you didn't request this, please ignore this email.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 10px;">
              Or copy this link: <br>
              <code style="background: #f3f4f6; padding: 8px; border-radius: 4px; display: inline-block; margin-top: 10px; word-break: break-all; font-size: 11px;">${resetUrl}</code>
            </p>
          </div>
        </div>
      `,
    });

    res.json({
      success: true,
      message:
        "If an account exists with this email, you will receive password reset instructions.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      error: "Server error. Please try again later.",
    });
  }
});

// -----------------------------
// RESET PASSWORD - Verify Token & Update Password
// -----------------------------
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Token and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters",
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset token",
      });
    }

    // Find user and check if token matches and hasn't expired
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset token",
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Send confirmation email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "✅ Password Successfully Reset",
      html: `
        <div style="font-family: 'Segoe UI', Arial; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; color: white; text-align: center;">
            <h2 style="margin: 0;">✅ Password Reset Successful</h2>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <p style="color: #1f2937; font-size: 16px; margin-bottom: 20px;">Hi ${
              user.name
            },</p>
            <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
              Your password has been successfully reset. You can now login with your new password.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${
                process.env.APP_URL || "http://localhost:3000"
              }/login" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                Login Now
              </a>
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
              If you didn't make this change, please contact support immediately.
            </p>
          </div>
        </div>
      `,
    });

    res.json({
      success: true,
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      error: "Server error. Please try again later.",
    });
  }
});

// -----------------------------
// VERIFY RESET TOKEN
// -----------------------------
router.get("/verify-reset-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.json({
        success: false,
        valid: false,
        message: "Invalid or expired token",
      });
    }

    // Check if user exists and token is still valid
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.json({
        success: false,
        valid: false,
        message: "Invalid or expired token",
      });
    }

    res.json({
      success: true,
      valid: true,
      email: user.email,
    });
  } catch (error) {
    console.error("Verify token error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

module.exports = router;
