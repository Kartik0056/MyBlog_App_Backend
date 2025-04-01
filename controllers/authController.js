const User = require("../models/User")
const jwt = require("jsonwebtoken")
const cloudinary = require("../config/cloudinary")
const { promisify } = require("util")
const streamifier = require("streamifier")

// Create a promise-based upload stream for Cloudinary
const uploadStream = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({ folder: "blog-app/profiles" }, (error, result) => {
      if (error) return reject(error)
      resolve(result)
    })
    streamifier.createReadStream(buffer).pipe(uploadStream)
  })
}

// Register a new user
exports.signup = async (req, res) => {
  try {
    const { email, password } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" })
    }

    // Upload profile image to Cloudinary if provided
    let profileImageUrl = null
    if (req.file) {
      const result = await uploadStream(req.file.buffer)
      profileImageUrl = result.secure_url
    }

    // Create new user
    const user = new User({
      email,
      password,
      profileImage: profileImageUrl,
    })

    await user.save()

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" })

    // Return user data (excluding password) and token
    const userData = {
      _id: user._id,
      email: user.email,
      profileImage: user.profileImage,
    }

    res.status(201).json({ user: userData, token })
  } catch (error) {
    console.error("Signup error:", error)
    res.status(500).json({ message: "Error creating user" })
  }
}

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user by email
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" })

    // Return user data (excluding password) and token
    const userData = {
      _id: user._id,
      email: user.email,
      profileImage: user.profileImage,
    }

    res.json({ user: userData, token })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Error logging in" })
  }
}

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password")
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    res.json(user)
  } catch (error) {
    console.error("Get profile error:", error)
    res.status(500).json({ message: "Error fetching profile" })
  }
}

