import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchFolderStructure,
  fetchFolderChildren,
  createItem,
  deleteItem,
  renameItem,
  moveItem,
  clearSuccess,
} from "../../store/folderSlice";
import "./FolderManager.css";

function FolderManager() {
  const dispatch = useDispatch();
  const { folders, childrenMap, loading, error, success } = useSelector(
    (state) => state.folder
  );

  const [openFolders, setOpenFolders] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [createType, setCreateType] = useState("folder");
  const [newItemName, setNewItemName] = useState("");
  const [renameItemId, setRenameItemId] = useState(null);
  const [renameNewName, setRenameNewName] = useState("");
  const [parentIdForCreate, setParentIdForCreate] = useState(null);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [parentToRefresh, setParentToRefresh] = useState(null);
  const [parentOfRenamingItem, setParentOfRenamingItem] = useState(null);

  useEffect(() => {
    dispatch(fetchFolderStructure());
  }, [dispatch]);

  // Refresh specific parent folder's children after action
  useEffect(() => {
    if (success && parentToRefresh) {
      if (parentToRefresh === "root") {
        // For root items, fetch the entire structure
        dispatch(fetchFolderStructure());
      } else {
        // For nested items, open the parent and fetch its children
        setOpenFolders((prev) => ({
          ...prev,
          [parentToRefresh]: true,
        }));
        dispatch(fetchFolderChildren(parentToRefresh));
      }
      dispatch(clearSuccess());
      setParentToRefresh(null);
    } else if (success) {
      // If no specific parent, just clear success
      dispatch(clearSuccess());
    }
  }, [success, dispatch, parentToRefresh]);

  const toggleFolder = (folderId) => {
    const isOpen = openFolders[folderId];

    if (!isOpen && !childrenMap[folderId]) {
      dispatch(fetchFolderChildren(folderId));
    }

    setOpenFolders((prev) => ({
      ...prev,
      [folderId]: !isOpen,
    }));
  };

  const handleCreateClick = (parentId = null) => {
    setParentIdForCreate(parentId);
    setCreateType("folder");
    setNewItemName("");
    setShowCreateModal(true);
    setExpandedMenu(null);
  };

  const handleCreateSubmit = () => {
    if (!newItemName.trim()) {
      alert("Please enter a name");
      return;
    }

    console.log("Creating item:", {
      name: newItemName,
      type: createType,
      parentId: parentIdForCreate,
    });

    // Mark parent folder to refresh after action
    if (parentIdForCreate) {
      setParentToRefresh(parentIdForCreate);
    } else {
      setParentToRefresh("root");
    }

    dispatch(
      createItem({
        name: newItemName,
        type: createType,
        parentId: parentIdForCreate,
      })
    );

    setShowCreateModal(false);
    setNewItemName("");
    setParentIdForCreate(null);
  };

  const handleDeleteClick = (itemId) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      // Find the parent ID of the item to delete
      const findParentId = (items, targetId) => {
        for (let item of items) {
          if (item.id === targetId) return item.parentId;
          if (childrenMap[item.id]) {
            const result = findParentId(childrenMap[item.id], targetId);
            if (result !== undefined) return result;
          }
        }
        return null;
      };
      
      const parentId = findParentId(folders, itemId);
      if (parentId) {
        setParentToRefresh(parentId);
      } else {
        setParentToRefresh("root");
      }
      
      dispatch(deleteItem(itemId));
      setSelectedItem(null);
    }
  };

  const handleRenameClick = (item) => {
    setRenameItemId(item.id);
    setRenameNewName(item.name);
    setParentOfRenamingItem(item.parentId || "root");
    setShowRenameModal(true);
    setExpandedMenu(null);
  };

  const handleRenameSubmit = () => {
    if (!renameNewName.trim()) {
      alert("Please enter a name");
      return;
    }

    if (parentOfRenamingItem) {
      setParentToRefresh(parentOfRenamingItem);
    }

    dispatch(renameItem({ itemId: renameItemId, name: renameNewName }));
    setShowRenameModal(false);
    setRenameItemId(null);
    setRenameNewName("");
    setParentOfRenamingItem(null);
  };

  const toggleMenu = (itemId, e) => {
    e.stopPropagation();
    setExpandedMenu(expandedMenu === itemId ? null : itemId);
  };

  const getItemIcon = (item) => {
    if (item.type === "folder") {
      return openFolders[item.id] ? "📂" : "📁";
    }
    // File icons based on extension
    const ext = item.extension?.toLowerCase() || "";
    const fileIcons = {
      ".js": "📜",
      ".py": "🐍",
      ".html": "🌐",
      ".css": "🎨",
      ".json": "📋",
      ".txt": "📄",
      ".pdf": "📕",
      ".jpg": "🖼️",
      ".png": "🖼️",
      ".zip": "📦",
    };
    return fileIcons[ext] || "📄";
  };

  const renderFolder = (folder, level = 0) => {
    const isOpen = openFolders[folder.id];
    const children = childrenMap[folder.id] || [];
    const isLoading = loading[folder.id] || false;
    const isSelected = selectedItem?.id === folder.id;

    return (
      <div key={folder.id} className="folder-item-wrapper">
        <div
          className={`folder-item ${isSelected ? "selected" : ""}`}
          style={{ paddingLeft: `${level * 20}px` }}
        >
          <div className="folder-content">
            <button
              className="toggle-btn"
              onClick={() => toggleFolder(folder.id)}
            >
              {children.length > 0 || !childrenMap.hasOwnProperty(folder.id)
                ? isOpen
                  ? "▼"
                  : "▶"
                : "•"}
            </button>

            <span className="folder-icon">{getItemIcon(folder)}</span>

            <span
              className="folder-name"
              onClick={() => setSelectedItem(folder)}
            >
              {folder.name}
            </span>

            <div className="folder-inline-actions">
              {folder.type === "folder" && (
                <button
                  className="action-icon-btn"
                  title="Add subfolder"
                  onClick={() => handleCreateClick(folder.id)}
                >
                  ➕
                </button>
              )}
              <button
                className="action-icon-btn"
                title="Edit"
                onClick={() => handleRenameClick(folder)}
              >
                ✏️
              </button>
              <button
                className="action-icon-btn delete-icon"
                title="Delete"
                onClick={() => handleDeleteClick(folder.id)}
              >
                🗑️
              </button>
            </div>
          </div>

          {isOpen && !childrenMap.hasOwnProperty(folder.id) && isLoading && (
            <div className="loading-indicator">Loading...</div>
          )}

          {isOpen &&
            children.map((child) => renderFolder(child, level + 1))}
        </div>
      </div>
    );
  };

  const rootFolders = folders.filter((f) => !f.parentId);

  return (
    <div className="folder-manager">
      <div className="folder-manager-header">
        <h2>📁 Folder Structure</h2>
        <button
          className="btn-primary"
          onClick={() => handleCreateClick(null)}
        >
          ➕ New Folder
        </button>
      </div>

      {error && <div className="error-message">❌ Error: {error}</div>}

      <div className="folder-tree">
        {rootFolders.length === 0 && !error && (
          <div className="empty-state">
            <p>No folders yet. Create one to get started!</p>
            <button
              className="btn-primary"
              onClick={() => handleCreateClick(null)}
            >
              ➕ Create First Folder
            </button>
          </div>
        )}

        {rootFolders.map((folder) => renderFolder(folder))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create New {createType === "folder" ? "Folder" : "File"}</h3>

            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={`Enter ${createType} name`}
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleCreateSubmit();
                }}
              />
            </div>

            <div className="form-group">
              <label>Type:</label>
              <select
                value={createType}
                onChange={(e) => setCreateType(e.target.value)}
              >
                <option value="folder">Folder</option>
                <option value="file">File</option>
              </select>
            </div>

            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={handleCreateSubmit}
              >
                Create
              </button>
              <button
                className="btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="modal-overlay" onClick={() => setShowRenameModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Rename Item</h3>

            <div className="form-group">
              <label>New Name:</label>
              <input
                type="text"
                value={renameNewName}
                onChange={(e) => setRenameNewName(e.target.value)}
                placeholder="Enter new name"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleRenameSubmit();
                }}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={handleRenameSubmit}
              >
                Rename
              </button>
              <button
                className="btn-secondary"
                onClick={() => setShowRenameModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FolderManager;
