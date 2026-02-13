const { pool } = require("../config/db");

const VALID_EXTENSIONS = {
  // Programming Languages
  ".js": "JavaScript",
  ".ts": "TypeScript",
  ".tsx": "TypeScript React",
  ".jsx": "JavaScript React",
  ".py": "Python",
  ".java": "Java",
  ".cpp": "C++",
  ".c": "C",
  ".cs": "C#",
  ".rb": "Ruby",
  ".go": "Go",
  ".rs": "Rust",
  ".php": "PHP",
  ".swift": "Swift",
  ".kt": "Kotlin",
  ".scala": "Scala",
  ".r": "R",
  ".lua": "Lua",
  ".pl": "Perl",
  ".sh": "Shell Script",
  ".bash": "Bash",
  ".groovy": "Groovy",
  ".gradle": "Gradle",
  ".m": "Objective-C",
  ".mm": "Objective-C++",
  ".h": "C Header",
  ".hpp": "C++ Header",
  ".vb": "Visual Basic",
  ".vbs": "VBScript",
  ".ps1": "PowerShell",
  ".asm": "Assembly",
  ".clj": "Clojure",
  ".cljs": "ClojureScript",
  ".ex": "Elixir",
  ".exs": "Elixir Script",
  ".erl": "Erlang",
  ".hrl": "Erlang Header",
  ".fs": "F#",
  ".fsx": "F# Script",
  ".fsi": "F# Interface",
  ".ml": "OCaml",
  ".mli": "OCaml Interface",
  ".hs": "Haskell",
  ".lhs": "Literate Haskell",
  ".jl": "Julia",
  ".nim": "Nim",
  ".nims": "Nim Script",
  ".d": "D Language",
  ".dart": "Dart",
  ".pas": "Pascal",
  ".pp": "Pascal",
  ".s": "Assembly",

  // Markup & Web
  ".html": "HTML",
  ".htm": "HTML",
  ".xml": "XML",
  ".xhtml": "XHTML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".sass": "SASS",
  ".less": "LESS",
  ".json": "JSON",
  ".jsonc": "JSON with Comments",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".toml": "TOML",
  ".ini": "INI",
  ".cfg": "Configuration",
  ".conf": "Configuration",
  ".config": "Configuration",
  ".properties": "Properties",

  // Documents & Text
  ".pdf": "PDF",
  ".txt": "Plain Text",
  ".md": "Markdown",
  ".markdown": "Markdown",
  ".rst": "reStructuredText",
  ".tex": "LaTeX",
  ".doc": "Word Document",
  ".docx": "Word Document",
  ".odt": "OpenDocument Text",
  ".rtf": "Rich Text Format",
  ".csv": "CSV",
  ".tsv": "TSV",
  ".xlsx": "Excel Spreadsheet",
  ".xls": "Excel Spreadsheet",
  ".ods": "OpenDocument Spreadsheet",

  // Images
  ".jpg": "JPEG Image",
  ".jpeg": "JPEG Image",
  ".png": "PNG Image",
  ".gif": "GIF Image",
  ".svg": "SVG Image",
  ".ico": "Icon",
  ".webp": "WebP Image",
  ".bmp": "Bitmap Image",
  ".tiff": "TIFF Image",
  ".tif": "TIFF Image",
  ".psd": "Photoshop",
  ".ai": "Adobe Illustrator",

  // Archives & Compression
  ".zip": "ZIP Archive",
  ".rar": "RAR Archive",
  ".7z": "7-Zip Archive",
  ".tar": "TAR Archive",
  ".gz": "GZIP Archive",
  ".tar.gz": "TAR GZIP Archive",
  ".bz2": "BZIP2 Archive",
  ".xz": "XZ Archive",

  // Data & Database
  ".sql": "SQL Script",
  ".db": "Database",
  ".sqlite": "SQLite Database",
  ".sqlite3": "SQLite Database",
  ".mdb": "Microsoft Access",

  // Other Common Files
  ".env": "Environment Variables",
  ".gitignore": "Git Ignore",
  ".gitattributes": "Git Attributes",
  ".editorconfig": "Editor Config",
  ".eslintrc": "ESLint Config",
  ".prettierrc": "Prettier Config",
  ".babelrc": "Babel Config",
  ".npmrc": "NPM Config",
  ".yarnrc": "Yarn Config",
  ".log": "Log File",
  ".lock": "Lock File",
  ".map": "Source Map",
  ".min.js": "Minified JavaScript",
  ".min.css": "Minified CSS",
};

const validateFileExtension = (filename) => {
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  return VALID_EXTENSIONS.hasOwnProperty(ext) ? ext : null;
};

exports.createItem = async (req, res) => {
  try {
    const { name, type, parentId } = req.body;
    const userId = req.userId;

    console.log("Creating item - Request data:", {
      name,
      type,
      parentId,
      userId,
    });

    if (!name || !type || !["folder", "file"].includes(type)) {
      return res
        .status(400)
        .json({ message: "Invalid input. Name and type are required." });
    }

    const connection = await pool.getConnection();

    try {
      let extension = null;
      if (type === "file") {
        extension = validateFileExtension(name);
        if (!extension) {
          const supportedExts = Object.keys(VALID_EXTENSIONS)
            .slice(0, 10)
            .join(", ");
          return res.status(400).json({
            message: `Invalid file extension. Examples: ${supportedExts}...`,
          });
        }
      }

      if (parentId) {
        const [parents] = await connection.execute(
          "SELECT id, type FROM Items WHERE id = ? AND userId = ? AND type = ?",
          [parentId, userId, "folder"],
        );

        if (parents.length === 0) {
          return res
            .status(404)
            .json({ message: "Parent folder not found or unauthorized" });
        }
      }

      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      const [result] = await connection.execute(
        "INSERT INTO Items (name, type, userId, parentId, extension, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [name, type, userId, parentId || null, extension, now, now],
      );

      res.status(201).json({
        message: `${type === "folder" ? "Folder" : "File"} created successfully`,
        item: {
          id: result.insertId,
          name,
          type,
          userId,
          parentId: parentId || null,
          extension,
          createdAt: now,
          updatedAt: now,
        },
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({ message: "Error creating item" });
  }
};

exports.getFolderStructure = async (req, res) => {
  try {
    const userId = req.userId;
    const connection = await pool.getConnection();

    try {
      const ownFolderQuery =
        "SELECT id, name, type, parentId, extension, createdAt, NULL as filePath, NULL as originalName, NULL as size, NULL as mimeType FROM Items WHERE userId = ? AND parentId IS NULL AND type = 'folder'";

      const ownFileQuery =
        "SELECT id, name, type, parentId, extension, createdAt, NULL as filePath, NULL as originalName, NULL as size, NULL as mimeType FROM Items WHERE userId = ? AND parentId IS NULL AND type = 'file'";

      const ownUploadedFileQuery =
        "SELECT id, name, 'file' as type, parentId, NULL as extension, createdAt, filePath, originalName, size, mimeType FROM Files WHERE userId = ? AND parentId IS NULL";

      const sharedRootFolderQuery =
        "SELECT i.id, i.name, i.type, i.parentId, i.extension, i.createdAt, NULL as filePath, NULL as originalName, NULL as size, NULL as mimeType FROM Items i INNER JOIN Permissions p ON i.id = p.itemId WHERE p.userId = ? AND p.can_view = true AND i.parentId IS NULL AND i.type = 'folder'";

      const parentFolderOfSharedQuery = `SELECT DISTINCT i.id, i.name, i.type, i.parentId, i.extension, i.createdAt, NULL as filePath, NULL as originalName, NULL as size, NULL as mimeType FROM Items i WHERE i.parentId IS NULL AND i.type = 'folder' AND EXISTS (
          SELECT 1 FROM Items child 
          INNER JOIN Permissions p ON child.id = p.itemId 
          WHERE p.userId = ? AND p.can_view = true 
          AND (
            child.parentId = i.id 
            OR child.parentId IN (
              SELECT id FROM Items 
              WHERE parentId = i.id 
              UNION ALL 
              SELECT id FROM Items parent_items 
              WHERE EXISTS (
                SELECT 1 FROM Items nested 
                WHERE nested.parentId = parent_items.id 
                AND nested.parentId IS NOT NULL
              )
            )
          )
        )`;

      const combinedQuery = `(${ownFolderQuery}) UNION (${ownFileQuery}) UNION (${ownUploadedFileQuery}) UNION (${sharedRootFolderQuery}) UNION (${parentFolderOfSharedQuery}) ORDER BY type DESC, name ASC`;

      const [items] = await connection.execute(combinedQuery, [
        userId,
        userId,
        userId,
        userId,
        userId,
      ]);

      res.status(200).json({
        message: "Folder structure retrieved successfully",
        data: items,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error fetching folder structure:", error);
    res.status(500).json({ message: "Error fetching folder structure" });
  }
};

exports.getItemsByParent = async (req, res) => {
  try {
    const { parentId } = req.params;
    const userId = req.userId;

    const connection = await pool.getConnection();

    try {
      if (!parentId || parentId === "null") {
        const [rootItems] = await connection.execute(
          `
          SELECT id, name, type, parentId, extension, createdAt,
          NULL as filePath, NULL as originalName, NULL as size, NULL as mimeType
          FROM Items
          WHERE parentId IS NULL
          `,
        );

        const [rootFiles] = await connection.execute(
          `
          SELECT id, name, 'file' as type, parentId,
          NULL as extension, createdAt,
          filePath, originalName, size, mimeType
          FROM Files
          WHERE parentId IS NULL
          `,
        );

        const data = [...rootItems, ...rootFiles];

        return res.status(200).json({
          message: "Root items retrieved successfully",
          data,
        });
      }

      const accessQuery = `
      WITH RECURSIVE folder_path AS (
          SELECT id, parentId, userId
          FROM Items
          WHERE id = ?

          UNION ALL

          SELECT i.id, i.parentId, i.userId
          FROM Items i
          INNER JOIN folder_path fp ON fp.parentId = i.id
      )

      SELECT COUNT(*) as hasAccess
      FROM folder_path fp
      LEFT JOIN Permissions p 
          ON p.itemId = fp.id 
          AND p.userId = ?
          AND p.can_view = 1
      WHERE 
          fp.userId = ?  -- owner
          OR p.itemId IS NOT NULL
      LIMIT 1;
      `;

      const [accessResult] = await connection.execute(accessQuery, [
        parentId,
        userId,
        userId,
      ]);

      if (accessResult[0].hasAccess === 0) {
        return res.status(403).json({
          message: "Access denied to this folder",
        });
      }

      const [items] = await connection.execute(
        `
        SELECT id, name, type, parentId, extension, createdAt,
        NULL as filePath, NULL as originalName, NULL as size, NULL as mimeType
        FROM Items
        WHERE parentId = ?
        `,
        [parentId],
      );

      const [files] = await connection.execute(
        `
        SELECT id, name, 'file' as type, parentId,
        NULL as extension, createdAt,
        filePath, originalName, size, mimeType
        FROM Files
        WHERE parentId = ?
        `,
        [parentId],
      );

      const data = [...items, ...files].sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === "folder" ? -1 : 1;
      });

      res.status(200).json({
        message: "Items retrieved successfully",
        data,
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.userId;
    const connection = await pool.getConnection();

    try {
      const [items] = await connection.execute(
        "SELECT id, type FROM Items WHERE id = ? AND userId = ?",
        [itemId, userId],
      );

      if (items.length === 0) {
        return res
          .status(404)
          .json({ message: "Item not found or unauthorized" });
      }

      const item = items[0];

      if (item.type === "folder") {
        const deleteChildren = async (parentId) => {
          const [children] = await connection.execute(
            "SELECT id, type FROM Items WHERE parentId = ? AND userId = ?",
            [parentId, userId],
          );

          for (const child of children) {
            if (child.type === "folder") {
              await deleteChildren(child.id);
            }
            await connection.execute("DELETE FROM Items WHERE id = ?", [
              child.id,
            ]);
          }

          const [uploadedFiles] = await connection.execute(
            "SELECT filePath FROM Files WHERE parentId = ? AND userId = ?",
            [parentId, userId],
          );

          for (const file of uploadedFiles) {
            const path = require("path");
            const fs = require("fs");
            const uploadsDir = path.join(__dirname, "../Uploads");
            const filePath = path.join(
              uploadsDir,
              path.basename(file.filePath),
            );
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }

          await connection.execute(
            "DELETE FROM Files WHERE parentId = ? AND userId = ?",
            [parentId, userId],
          );
        };

        await deleteChildren(itemId);

        const [directFiles] = await connection.execute(
          "SELECT filePath FROM Files WHERE parentId = ? AND userId = ?",
          [itemId, userId],
        );

        for (const file of directFiles) {
          const path = require("path");
          const fs = require("fs");
          const uploadsDir = path.join(__dirname, "../Uploads");
          const filePath = path.join(uploadsDir, path.basename(file.filePath));
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }

        await connection.execute(
          "DELETE FROM Files WHERE parentId = ? AND userId = ?",
          [itemId, userId],
        );
      }

      await connection.execute("DELETE FROM Items WHERE id = ?", [itemId]);

      res.status(200).json({
        message: "Item deleted successfully",
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ message: "Error deleting item" });
  }
};

exports.renameItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name } = req.body;
    const userId = req.userId;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    const connection = await pool.getConnection();

    try {
      const [items] = await connection.execute(
        "SELECT id, type FROM Items WHERE id = ? AND userId = ?",
        [itemId, userId],
      );

      if (items.length === 0) {
        return res
          .status(404)
          .json({ message: "Item not found or unauthorized" });
      }

      const item = items[0];
      let extension = null;

      if (item.type === "file") {
        extension = validateFileExtension(name);
        if (!extension) {
          const supportedExts = Object.keys(VALID_EXTENSIONS)
            .slice(0, 10)
            .join(", ");
          return res.status(400).json({
            message: `Invalid file extension. Supported files: programming languages, documents, images, archives, and more. Examples: ${supportedExts}...`,
          });
        }
      }

      await connection.execute(
        "UPDATE Items SET name = ?, extension = ? WHERE id = ?",
        [name, extension, itemId],
      );

      const [updatedItems] = await connection.execute(
        "SELECT id, name, type, parentId, extension, createdAt FROM Items WHERE id = ?",
        [itemId],
      );

      res.status(200).json({
        message: "Item renamed successfully",
        item: updatedItems[0],
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error renaming item:", error);
    res.status(500).json({ message: "Error renaming item" });
  }
};
