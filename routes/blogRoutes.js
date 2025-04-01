const express = require("express")
const multer = require("multer")
const blogController = require("../controllers/blogController")
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

// Blog routes
router.post("/", auth, upload.single("blogImage"), blogController.createBlog)
router.get("/", auth, blogController.getBlogs)
router.get("/:id", auth, blogController.getBlog)
router.put("/:id", auth, upload.single("blogImage"), blogController.updateBlog)
router.delete("/:id", auth, blogController.deleteBlog)
router.post("/:id/like", auth, blogController.likeBlog)

// Comment routes
router.post("/:id/comments", auth, blogController.addComment)
router.get("/:id/comments", auth, blogController.getComments)
router.delete("/:id/comments/:commentId", auth, blogController.deleteComment)
router.post("/:id/comments/:commentId/like", auth, blogController.likeComment)
router.post("/:id/comments/:commentId/replies", auth, blogController.addReply)

module.exports = router

