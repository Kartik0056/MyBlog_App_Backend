const express = require("express")
const multer = require("multer")
const authController = require("../controllers/authController")
const auth = require("../middleware/auth")

const router = express.Router()

// Configure multer for memory storage (for Cloudinary)
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype) {
      return cb(null, true)
    } else {
      cb(new Error("Only image files are allowed!"))
    }
  },
})

// Auth routes
router.post("/signup", upload.single("profileImage"), authController.signup)
router.post("/login", authController.login)
router.get("/profile", auth, authController.getProfile)

module.exports = router

