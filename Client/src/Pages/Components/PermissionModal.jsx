import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAvailableUsers,
  fetchItemPermissions,
  updateItemPermission,
  removeItemPermission,
  clearSuccess,
  clearError,
} from "../../store/permissionSlice";
import "./PermissionModal.css";

function PermissionModal({ itemId, itemName, onClose }) {
  const dispatch = useDispatch();
  const { availableUsers, itemPermissions, loading, error, success } =
    useSelector((state) => state.permissions);

  const [userPermissions, setUserPermissions] = useState({});

  useEffect(() => {
    dispatch(fetchAvailableUsers());
    dispatch(fetchItemPermissions({ itemId }));
  }, [itemId, dispatch]);

  useEffect(() => {
    const permissionsMap = {};
    itemPermissions.forEach((perm) => {
      permissionsMap[perm.userId] = {
        can_view: perm.can_view,
        can_create: perm.can_create,
        can_upload: perm.can_upload,
        can_edit: perm.can_edit,
        can_delete: perm.can_delete,
      };
    });
    setUserPermissions(permissionsMap);
  }, [itemPermissions]);

  const handlePermissionChange = (userId, permissionType) => {
    setUserPermissions((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {
          can_view: false,
          can_create: false,
          can_upload: false,
          can_edit: false,
          can_delete: false,
        }),
        [permissionType]: !(prev[userId]?.[permissionType] || false),
      },
    }));
  };

  const handleSavePermissions = (userId) => {
    const permissions = userPermissions[userId] || {
      can_view: false,
      can_create: false,
      can_upload: false,
      can_edit: false,
      can_delete: false,
    };

    dispatch(
      updateItemPermission({
        itemId,
        userId,
        can_view: permissions.can_view,
        can_create: permissions.can_create,
        can_upload: permissions.can_upload,
        can_edit: permissions.can_edit,
        can_delete: permissions.can_delete,
      }),
    );
  };

  const handleRemovePermission = (userId) => {
    dispatch(removeItemPermission({ itemId, userId }));
    setUserPermissions((prev) => {
      const newPermissions = { ...prev };
      delete newPermissions[userId];
      return newPermissions;
    });
  };

  const handleCloseModal = () => {
    if (success) {
      dispatch(clearSuccess());
    }
    if (error) {
      dispatch(clearError());
    }
    onClose();
  };

  const getPermissionLabel = (key) => {
    const labels = {
      can_view: "View",
      can_create: "Create",
      can_upload: "Upload",
      can_edit: "Edit",
      can_delete: "Delete",
    };
    return labels[key] || key;
  };

  return (
    <div className="permission-modal-overlay" onClick={handleCloseModal}>
      <div className="permission-modal" onClick={(e) => e.stopPropagation()}>
        <div className="permission-modal-header">
          <h2>Manage Permissions - {itemName}</h2>
          <button className="close-btn" onClick={handleCloseModal}>
            ✕
          </button>
        </div>

        {error && <div className="permission-alert error">{error}</div>}
        {success && <div className="permission-alert success">{success}</div>}

        {loading && !itemPermissions.length ? (
          <div className="permission-loading">Loading...</div>
        ) : (
          <div className="permission-modal-content">
            <div className="permission-users-list">
              <h3>Users</h3>
              {availableUsers.length === 0 ? (
                <p className="no-users">No other users available</p>
              ) : (
                availableUsers.map((user) => {
                  const userPerms = userPermissions[user.id] || {
                    can_view: false,
                    can_create: false,
                    can_upload: false,
                    can_edit: false,
                    can_delete: false,
                  };
                  const hasAnyPermission = Object.values(userPerms).some(
                    (p) => p,
                  );

                  return (
                    <div key={user.id} className="permission-user-row">
                      <div className="user-info">
                        <div className="user-name">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="user-email">{user.email}</div>
                      </div>

                      <div className="permission-checkboxes">
                        {[
                          "can_view",
                          "can_create",
                          "can_upload",
                          "can_edit",
                          "can_delete",
                        ].map((permType) => (
                          <label key={permType} className="permission-checkbox">
                            <input
                              type="checkbox"
                              checked={userPerms[permType] || false}
                              onChange={() =>
                                handlePermissionChange(user.id, permType)
                              }
                            />
                            <span>{getPermissionLabel(permType)}</span>
                          </label>
                        ))}
                      </div>

                      <div className="permission-actions">
                        {hasAnyPermission && (
                          <>
                            <button
                              className="btn-save"
                              onClick={() => handleSavePermissions(user.id)}
                              disabled={loading}
                            >
                              Save
                            </button>
                            <button
                              className="btn-remove"
                              onClick={() => handleRemovePermission(user.id)}
                              disabled={loading}
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="permission-modal-footer">
          <button className="btn-close" onClick={handleCloseModal}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default PermissionModal;
