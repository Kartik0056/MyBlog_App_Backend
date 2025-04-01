const Blog = require("../models/Blog")
const Comment = require("../models/Comment")
const cloudinary = require("../config/cloudinary")
const { promisify } = require("util")
const streamifier = require("streamifier")

// Create a promise-based upload stream for Cloudinary
const uploadStream = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({ folder: "blog-app/blogs" }, (error, result) => {
      if (error) return reject(error)
      resolve(result)
    })
    streamifier.createReadStream(buffer).pipe(uploadStream)
  })
}

// Create a new blog
exports.createBlog = async (req, res) => {
  try {
    const { title, description } = req.body

    // Upload blog image to Cloudinary if provided
    let blogImageUrl = null
    if (req.file) {
      const result = await uploadStream(req.file.buffer)
      blogImageUrl = result.secure_url
    }

    const blog = new Blog({
      title,
      description,
      image: blogImageUrl,
      user: req.user.userId,
      likes: [],
    })

    await blog.save()
    res.status(201).json(blog)
  } catch (error) {
    console.error("Create blog error:", error)
    res.status(500).json({ message: "Error creating blog" })
  }
}

// Get all blogs for current user
exports.getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ user: req.user.userId })
      .populate("user", "email profileImage")
      .sort({ createdAt: -1 })

    res.json(blogs)
  } catch (error) {
    console.error("Get blogs error:", error)
    res.status(500).json({ message: "Error fetching blogs" })
  }
}

// Get a single blog
exports.getBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate("user", "email profileImage")

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" })
    }

    res.json(blog)
  } catch (error) {
    console.error("Get blog error:", error)
    res.status(500).json({ message: "Error fetching blog" })
  }
}

// Update a blog
exports.updateBlog = async (req, res) => {
  try {
    const { title, description } = req.body

    const blog = await Blog.findById(req.params.id)

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" })
    }

    // Check if user owns the blog
    if (blog.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized" })
    }

    // Update blog fields
    blog.title = title
    blog.description = description

    // Update image if a new one is uploaded
    if (req.file) {
      const result = await uploadStream(req.file.buffer)
      blog.image = result.secure_url
    }

    await blog.save()
    res.json(blog)
  } catch (error) {
    console.error("Update blog error:", error)
    res.status(500).json({ message: "Error updating blog" })
  }
}

// Delete a blog
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" })
    }

    // Check if user owns the blog
    if (blog.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized" })
    }

    // Delete all comments associated with the blog
    await Comment.deleteMany({ blog: req.params.id })

    // Delete the blog
    await Blog.findByIdAndDelete(req.params.id)

    res.json({ message: "Blog deleted" })
  } catch (error) {
    console.error("Delete blog error:", error)
    res.status(500).json({ message: "Error deleting blog" })
  }
}

// Like/unlike a blog
exports.likeBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" })
    }

    // Check if the blog has already been liked by this user
    const likeIndex = blog.likes.indexOf(req.user.userId)

    if (likeIndex === -1) {
      // Not liked, so add like
      blog.likes.push(req.user.userId)
    } else {
      // Already liked, so remove like
      blog.likes.splice(likeIndex, 1)
    }

    await blog.save()
    res.json(blog)
  } catch (error) {
    console.error("Like blog error:", error)
    res.status(500).json({ message: "Error liking blog" })
  }
}

// Add a comment to a blog
exports.addComment = async (req, res) => {
  try {
    const { content } = req.body

    const blog = await Blog.findById(req.params.id)
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" })
    }

    const comment = new Comment({
      content,
      blog: req.params.id,
      user: req.user.userId,
      likes: [],
    })

    await comment.save()

    // Populate user info
    await comment.populate("user", "email profileImage")

    res.status(201).json(comment)
  } catch (error) {
    console.error("Add comment error:", error)
    res.status(500).json({ message: "Error adding comment" })
  }
}

// Get all comments for a blog
exports.getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ blog: req.params.id })
      .populate("user", "email profileImage")
      .populate("replies.user", "email profileImage")
      .sort({ createdAt: -1 })

    res.json(comments)
  } catch (error) {
    console.error("Get comments error:", error)
    res.status(500).json({ message: "Error fetching comments" })
  }
}

// Delete a comment
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId)

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" })
    }

    // Check if user owns the comment
    if (comment.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized" })
    }

    await Comment.findByIdAndDelete(req.params.commentId)

    res.json({ message: "Comment deleted" })
  } catch (error) {
    console.error("Delete comment error:", error)
    res.status(500).json({ message: "Error deleting comment" })
  }
}

// Like/unlike a comment
exports.likeComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId)

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" })
    }

    // Check if the comment has already been liked by this user
    const likeIndex = comment.likes.indexOf(req.user.userId)

    if (likeIndex === -1) {
      // Not liked, so add like
      comment.likes.push(req.user.userId)
    } else {
      // Already liked, so remove like
      comment.likes.splice(likeIndex, 1)
    }

    await comment.save()
    res.json(comment)
  } catch (error) {
    console.error("Like comment error:", error)
    res.status(500).json({ message: "Error liking comment" })
  }
}

// Add a reply to a comment
exports.addReply = async (req, res) => {
  try {
    const { content } = req.body

    const comment = await Comment.findById(req.params.commentId)

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" })
    }

    const reply = {
      content,
      user: req.user.userId,
      likes: [],
      createdAt: Date.now(),
    }

    comment.replies.push(reply)
    await comment.save()

    // Populate user info
    await comment.populate("replies.user", "email profileImage")

    res.status(201).json(comment)
  } catch (error) {
    console.error("Add reply error:", error)
    res.status(500).json({ message: "Error adding reply" })
  }
}

