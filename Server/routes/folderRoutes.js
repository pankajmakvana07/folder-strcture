const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const {
  createItem,
  getFolderStructure,
  getItemsByParent,
  deleteItem,
  renameItem,
  moveItem,
} = require("../controllers/folderController");

// All routes require authentication
router.use(authMiddleware);

// Create folder or file
router.post("/create", createItem);

// Get complete folder structure tree for user
router.get("/structure", getFolderStructure);

// Get items by parent folder ID (supports both /items and /items/:parentId)
router.get("/items/:parentId", getItemsByParent);
router.get("/items", getItemsByParent);

// Delete folder or file
router.delete("/:itemId", deleteItem);

// Rename folder or file
router.put("/:itemId/rename", renameItem);

// Move item to different parent
router.put("/:itemId/move", moveItem);

module.exports = router;
