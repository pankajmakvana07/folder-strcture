const { pool } = require("../config/db");
const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(__dirname, "../Uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Upload file
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { parentId } = req.body;
    const userId = req.userId;
    const file = req.file;

    if (parentId) {
      const connection = await pool.getConnection();
      try {
        const [parents] = await connection.execute(
          "SELECT id FROM Items WHERE id = ? AND userId = ? AND type = 'folder'",
          [parentId, userId],
        );

        if (parents.length === 0) {
          // Delete uploaded file if parent doesn't exist
          const filePath = path.join(uploadsDir, file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          return res
            .status(404)
            .json({ message: "Parent folder not found or unauthorized" });
        }
      } finally {
        connection.release();
      }
    }

    const connection = await pool.getConnection();

    try {
      // Store the file path
      const filePath = `/uploads/${file.filename}`;
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");

      // Create Files entry
      const [fileResult] = await connection.execute(
        "INSERT INTO Files (name, filePath, originalName, size, mimeType, userId, parentId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          file.filename,
          filePath,
          file.originalname,
          file.size,
          file.mimetype,
          userId,
          parentId || null,
          now,
          now,
        ],
      );

      res.status(201).json({
        message: "File uploaded successfully",
        file: {
          id: fileResult.insertId,
          name: file.originalname,
          filePath: filePath,
          size: file.size,
          mimeType: file.mimetype,
          userId: userId,
          parentId: parentId || null,
          createdAt: now,
        },
      });
    } catch (error) {
      const filePath = path.join(uploadsDir, file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ message: "Error uploading file" });
  }
};

// Get files by parent ID
exports.getFilesByParent = async (req, res) => {
  try {
    const { parentId } = req.params;
    const userId = req.userId;
    const connection = await pool.getConnection();

    try {
      let query = "SELECT f.* FROM Files f WHERE f.userId = ?";
      const params = [userId];

      if (parentId && parentId !== "null") {
        query += " AND f.parentId = ?";
        params.push(parentId);
      } else {
        query += " AND f.parentId IS NULL";
      }

      query += " ORDER BY f.createdAt DESC";
      const [files] = await connection.execute(query, params);

      res.status(200).json({
        message: "Files retrieved successfully",
        data: files,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ message: "Error fetching files" });
  }
};

// Get all files for logged-in user
exports.getAllFiles = async (req, res) => {
  try {
    const userId = req.userId;
    const connection = await pool.getConnection();

    try {
      const [files] = await connection.execute(
        "SELECT f.* FROM Files f WHERE f.userId = ? ORDER BY f.createdAt DESC",
        [userId],
      );

      res.status(200).json({
        message: "All files retrieved successfully",
        data: files,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error fetching all files:", error);
    res.status(500).json({ message: "Error fetching all files" });
  }
};

// Delete file
exports.deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.userId;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Try to delete from Files table (uploaded files)
      const [uploadedFiles] = await connection.execute(
        "SELECT f.filePath FROM Files f WHERE f.id = ? AND f.userId = ?",
        [fileId, userId],
      );

      if (uploadedFiles.length > 0) {
        const file = uploadedFiles[0];
        const filePath = path.join(uploadsDir, path.basename(file.filePath));

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        await connection.execute(
          "DELETE FROM Files WHERE id = ? AND userId = ?",
          [fileId, userId],
        );

        await connection.commit();
        return res.status(200).json({ message: "File deleted successfully" });
      }

      // If not in Files table, try to delete from Items table (created files)
      const [itemFiles] = await connection.execute(
        "SELECT id FROM Items WHERE id = ? AND userId = ? AND type = 'file'",
        [fileId, userId],
      );

      if (itemFiles.length > 0) {
        await connection.execute(
          "DELETE FROM Items WHERE id = ? AND userId = ?",
          [fileId, userId],
        );

        await connection.commit();
        return res.status(200).json({ message: "File deleted successfully" });
      }

      // File not found in either table
      await connection.rollback();
      return res
        .status(404)
        .json({ message: "File not found or unauthorized" });
    } catch (error) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ message: "Error deleting file" });
  }
};
// Download file
exports.downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.userId;
    const connection = await pool.getConnection();

    try {
      // Get file info
      const [files] = await connection.execute(
        "SELECT f.filePath, f.originalName FROM Files f WHERE f.id = ? AND f.userId = ?",
        [fileId, userId],
      );

      if (files.length === 0) {
        return res
          .status(404)
          .json({ message: "File not found or unauthorized" });
      }

      const file = files[0];
      const filePath = path.join(uploadsDir, path.basename(file.filePath));

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on server" });
      }

      // Set headers for download
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${file.originalName}"`,
      );
      res.setHeader("Content-Type", "application/octet-stream");

      // Send file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on("error", (error) => {
        console.error("Error streaming file:", error);
        if (!res.headersSent) {
          res.status(500).json({ message: "Error downloading file" });
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ message: "Error downloading file" });
  }
};
