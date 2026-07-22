import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Shield,
  MapPin,
  Phone,
  Calendar,
  Save,
  KeyRound
} from "lucide-react";
import { getProfile, updateProfile } from "../services/api";

export default function Profile({ token, initialUser, onUserUpdated }) {
  // State for user profile data
  const [profile, setProfile] = useState({
    name: initialUser?.name || "",
    email: initialUser?.email || "",
    role: initialUser?.role || "Lender",
    village: initialUser?.village || "Central Village",
    phone: initialUser?.phone || "",
    createdAt: initialUser?.createdAt || new Date().toISOString(),
  });

  // Form edit states
  const [name, setName] = useState(initialUser?.name || "");
  const [village, setVillage] = useState(initialUser?.village || "");
  const [phone, setPhone] = useState(initialUser?.phone || "");

  // Password change form states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Password field visibility toggles
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Status & loading states
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch fresh profile data on component mount if token exists
  useEffect(() => {
    if (token) {
      setFetching(true);
      getProfile(token)
        .then((data) => {
          setProfile(data);
          setName(data.name || "");
          setVillage(data.village || "");
          setPhone(data.phone || "");
        })
        .catch((err) => {
          console.warn("Using local initial user state:", err.message);
        })
        .finally(() => {
          setFetching(false);
        });
    }
  }, [token]);

  // Handle general info update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Name field cannot be left blank.");
      return;
    }

    try {
      setLoading(true);
      const updated = await updateProfile(
        { name: name.trim(), village: village.trim(), phone: phone.trim() },
        token
      );
      setProfile((prev) => ({ ...prev, ...updated }));
      setSuccessMessage("Profile details updated successfully!");
      if (onUserUpdated) onUserUpdated(updated);
    } catch (err) {
      setErrorMessage(err.message || "Failed to update profile details.");
    } finally {
      setLoading(false);
    }
  };

  // Handle password change update
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!currentPassword) {
      setErrorMessage("Please enter your current password to proceed.");
      return;
    }

    if (!newPassword) {
      setErrorMessage("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirm password do not match.");
      return;
    }

    try {
      setLoading(true);
      const updated = await updateProfile(
        { currentPassword, newPassword },
        token
      );
      setSuccessMessage("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (onUserUpdated) onUserUpdated(updated);
    } catch (err) {
      setErrorMessage(err.message || "Password change failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page-wrapper">
      {/* Notifications */}
      {successMessage && (
        <div className="alert alert-success" role="alert">
          <CheckCircle size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={20} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Account Profile Header Card */}
      <div className="card">
        <div className="card-title-group">
          <div>
            <h2 className="card-title">
              <User size={24} style={{ color: "#10b981" }} /> User Profile & Account Settings
            </h2>
            <p className="card-subtitle">
              Manage your personal information and security credentials for village micro-lending administration.
            </p>
          </div>
          <span className={`badge ${profile.role === "Lender" ? "badge-lender" : "badge-officer"}`}>
            {profile.role}
          </span>
        </div>

        {/* Read-Only Profile Summary Metadata */}
        <div className="profile-meta-grid">
          <div className="meta-item">
            <span className="meta-label"><Mail size={12} /> Registered Email</span>
            <span className="meta-value">{profile.email}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label"><Shield size={12} /> User Role</span>
            <span className="meta-value">{profile.role}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label"><MapPin size={12} /> Assigned Village/Branch</span>
            <span className="meta-value">{profile.village || "Central Village"}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label"><Calendar size={12} /> Account Created</span>
            <span className="meta-value">
              {new Date(profile.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Personal Information Card */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: "1.25rem" }}>
          <User size={20} /> Edit Account Details
        </h3>

        <form onSubmit={handleUpdateProfile}>
          <div className="form-grid">
            {/* Full Name Field */}
            <div className="form-group">
              <label className="form-label" htmlFor="profile-name">
                <User size={14} /> Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* Read-only Email Field */}
            <div className="form-group">
              <label className="form-label" htmlFor="profile-email">
                <Mail size={14} /> Email Address (Read-only)
              </label>
              <input
                id="profile-email"
                type="email"
                className="form-input"
                value={profile.email}
                readOnly
                disabled
              />
            </div>

            {/* Village / Branch Location */}
            <div className="form-group">
              <label className="form-label" htmlFor="profile-village">
                <MapPin size={14} /> Village / Branch Area
              </label>
              <input
                id="profile-village"
                type="text"
                className="form-input"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="e.g. Rampur Village"
              />
            </div>

            {/* Contact Phone */}
            <div className="form-group">
              <label className="form-label" htmlFor="profile-phone">
                <Phone size={14} /> Contact Phone Number
              </label>
              <input
                id="profile-phone"
                type="text"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
            <button
              id="save-profile-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              <Save size={18} /> {loading ? "Saving Changes..." : "Save Profile Details"}
            </button>
          </div>
        </form>
      </div>

      {/* Password Change Form Card */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: "0.25rem" }}>
          <KeyRound size={20} /> Security & Password Verification
        </h3>
        <p className="card-subtitle" style={{ marginBottom: "1.5rem" }}>
          To update your password, verify your current password for security.
        </p>

        <form onSubmit={handlePasswordChange}>
          <div className="form-grid">
            {/* Current Password (Required Verification) */}
            <div className="form-group">
              <label className="form-label" htmlFor="current-password">
                <Lock size={14} /> Current Password (Verification)
              </label>
              <div className="form-input-wrapper">
                <input
                  id="current-password"
                  type={showCurrentPass ? "text" : "password"}
                  className="form-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  title={showCurrentPass ? "Hide password" : "Show password"}
                >
                  {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="new-password">
                <Lock size={14} /> New Password
              </label>
              <div className="form-input-wrapper">
                <input
                  id="new-password"
                  type={showNewPass ? "text" : "password"}
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowNewPass(!showNewPass)}
                  title={showNewPass ? "Hide password" : "Show password"}
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="confirm-password">
                <Lock size={14} /> Confirm New Password
              </label>
              <div className="form-input-wrapper">
                <input
                  id="confirm-password"
                  type={showConfirmPass ? "text" : "password"}
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  title={showConfirmPass ? "Hide password" : "Show password"}
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
            <button
              id="change-password-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              <KeyRound size={18} /> {loading ? "Updating Password..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
