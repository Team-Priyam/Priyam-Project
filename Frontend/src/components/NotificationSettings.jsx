import React, { useState, useEffect } from "react";
import "./NotificationSettings.css";

const DEFAULT_PREFERENCES = {
  repaymentReminders: true,
  overdueAlerts: true,
  applicationUpdates: true,
  systemDigest: false,
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
};

const NotificationSettings = ({ token, currentUser, onPreferencesUpdated }) => {
  const storageKey = currentUser ? `notification_preferences_${currentUser.email || currentUser.id}` : "notification_preferences";
  
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  // Fetch preferences from API on mount or token change
  useEffect(() => {
    let isMounted = true;
    const fetchPreferences = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch("/api/users/preferences", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.preferences && isMounted) {
            const merged = { ...DEFAULT_PREFERENCES, ...data.preferences };
            setPreferences(merged);
            localStorage.setItem(storageKey, JSON.stringify(merged));
            if (onPreferencesUpdated) {
              onPreferencesUpdated(merged);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load notification settings from backend", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPreferences();
    return () => {
      isMounted = false;
    };
  }, [token, storageKey]);

  // Handle single toggle switch
  const handleToggle = (key) => {
    setPreferences((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      // Save locally immediately
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.error("LocalStorage save error", e);
      }
      return updated;
    });
    setStatusMessage(null);
  };

  // Keyboard accessibility for toggle switches (Enter / Space)
  const handleKeyDown = (e, key) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleToggle(key);
    }
  };

  // Save preferences to backend server
  const handleSavePreferences = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/users/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preferences }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMessage({
          type: "success",
          text: "Notification preferences saved and synchronized across sessions!",
        });
        localStorage.setItem(storageKey, JSON.stringify(preferences));
        if (onPreferencesUpdated) {
          onPreferencesUpdated(preferences);
        }
      } else {
        setStatusMessage({
          type: "error",
          text: data.message || "Failed to persist preferences to server.",
        });
      }
    } catch {
      setStatusMessage({
        type: "error",
        text: "Connection error while saving preferences to server.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset to system defaults
  const handleResetDefaults = () => {
    setPreferences(DEFAULT_PREFERENCES);
    localStorage.setItem(storageKey, JSON.stringify(DEFAULT_PREFERENCES));
    if (onPreferencesUpdated) {
      onPreferencesUpdated(DEFAULT_PREFERENCES);
    }
    setStatusMessage({
      type: "success",
      text: "Preferences reset to default configuration.",
    });
  };

  return (
    <div className="settings-container glass-card" aria-label="Notification & Reminder Settings">
      {/* Header section */}
      <div className="settings-header">
        <div className="settings-title-group">
          <div className="settings-icon-badge">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h2 className="settings-title">Notification & Alert Preferences</h2>
            <p className="settings-subtitle">Manage automated reminders, collection alerts, and delivery channels</p>
          </div>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`settings-alert-banner ${statusMessage.type === "success" ? "alert-success" : "alert-error"}`}
          role="alert"
          aria-live="polite"
        >
          {statusMessage.type === "success" ? (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {loading ? (
        <div className="settings-loading">
          <div className="spinner"></div>
          <span>Loading preference settings...</span>
        </div>
      ) : (
        <div className="settings-content">
          {/* Section 1: Alert & Reminder Types */}
          <section className="settings-section" aria-labelledby="notification-types-heading">
            <h3 id="notification-types-heading" className="section-heading">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Reminder & Alert Categories
            </h3>
            <p className="section-description">Select which platform events generate reminders and alerts for your account.</p>

            <div className="toggle-list">
              {/* Repayment Reminders */}
              <div className="toggle-item">
                <div className="toggle-info">
                  <span className="toggle-title">Repayment Reminders</span>
                  <span className="toggle-desc">Automated notifications for upcoming scheduled repayment dates</span>
                </div>
                <button
                  type="button"
                  className={`toggle-switch ${preferences.repaymentReminders ? "checked" : ""}`}
                  role="switch"
                  aria-checked={preferences.repaymentReminders}
                  aria-label="Toggle Repayment Reminders"
                  tabIndex={0}
                  onClick={() => handleToggle("repaymentReminders")}
                  onKeyDown={(e) => handleKeyDown(e, "repaymentReminders")}
                >
                  <span className="toggle-knob"></span>
                </button>
              </div>

              {/* Overdue Alerts */}
              <div className="toggle-item">
                <div className="toggle-info">
                  <span className="toggle-title">Overdue Repayment Alerts</span>
                  <span className="toggle-desc">High-priority alerts for past-due loans requiring collection</span>
                </div>
                <button
                  type="button"
                  className={`toggle-switch ${preferences.overdueAlerts ? "checked" : ""}`}
                  role="switch"
                  aria-checked={preferences.overdueAlerts}
                  aria-label="Toggle Overdue Repayment Alerts"
                  tabIndex={0}
                  onClick={() => handleToggle("overdueAlerts")}
                  onKeyDown={(e) => handleKeyDown(e, "overdueAlerts")}
                >
                  <span className="toggle-knob"></span>
                </button>
              </div>

              {/* Loan Application Status Updates */}
              <div className="toggle-item">
                <div className="toggle-info">
                  <span className="toggle-title">Application Status Updates</span>
                  <span className="toggle-desc">Notifications when loans are created, approved, or rejected</span>
                </div>
                <button
                  type="button"
                  className={`toggle-switch ${preferences.applicationUpdates ? "checked" : ""}`}
                  role="switch"
                  aria-checked={preferences.applicationUpdates}
                  aria-label="Toggle Application Status Updates"
                  tabIndex={0}
                  onClick={() => handleToggle("applicationUpdates")}
                  onKeyDown={(e) => handleKeyDown(e, "applicationUpdates")}
                >
                  <span className="toggle-knob"></span>
                </button>
              </div>

              {/* Weekly System Digest */}
              <div className="toggle-item">
                <div className="toggle-info">
                  <span className="toggle-title">System Summary Digest</span>
                  <span className="toggle-desc">Periodic summary report of portfolio performance and metrics</span>
                </div>
                <button
                  type="button"
                  className={`toggle-switch ${preferences.systemDigest ? "checked" : ""}`}
                  role="switch"
                  aria-checked={preferences.systemDigest}
                  aria-label="Toggle System Summary Digest"
                  tabIndex={0}
                  onClick={() => handleToggle("systemDigest")}
                  onKeyDown={(e) => handleKeyDown(e, "systemDigest")}
                >
                  <span className="toggle-knob"></span>
                </button>
              </div>
            </div>
          </section>

          {/* Section 2: Delivery Channels */}
          <section className="settings-section" aria-labelledby="delivery-channels-heading">
            <h3 id="delivery-channels-heading" className="section-heading">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Notification Delivery Channels
            </h3>
            <p className="section-description">Choose how you want to receive active alerts and reminders.</p>

            <div className="toggle-list">
              {/* Email Notifications */}
              <div className="toggle-item">
                <div className="toggle-info">
                  <span className="toggle-title">Email Notifications</span>
                  <span className="toggle-desc">Deliver critical alerts to <strong>{currentUser?.email || "registered email"}</strong></span>
                </div>
                <button
                  type="button"
                  className={`toggle-switch ${preferences.emailNotifications ? "checked" : ""}`}
                  role="switch"
                  aria-checked={preferences.emailNotifications}
                  aria-label="Toggle Email Notifications"
                  tabIndex={0}
                  onClick={() => handleToggle("emailNotifications")}
                  onKeyDown={(e) => handleKeyDown(e, "emailNotifications")}
                >
                  <span className="toggle-knob"></span>
                </button>
              </div>

              {/* Push / Browser Notifications */}
              <div className="toggle-item">
                <div className="toggle-info">
                  <span className="toggle-title">In-App Popups & Push Alerts</span>
                  <span className="toggle-desc">Display dynamic popups and web alerts inside the application window</span>
                </div>
                <button
                  type="button"
                  className={`toggle-switch ${preferences.pushNotifications ? "checked" : ""}`}
                  role="switch"
                  aria-checked={preferences.pushNotifications}
                  aria-label="Toggle Push & In-App Alerts"
                  tabIndex={0}
                  onClick={() => handleToggle("pushNotifications")}
                  onKeyDown={(e) => handleKeyDown(e, "pushNotifications")}
                >
                  <span className="toggle-knob"></span>
                </button>
              </div>

              {/* SMS Notifications */}
              <div className="toggle-item">
                <div className="toggle-info">
                  <span className="toggle-title">SMS / Mobile Reminders</span>
                  <span className="toggle-desc">Send text message reminders directly to your registered phone number</span>
                </div>
                <button
                  type="button"
                  className={`toggle-switch ${preferences.smsNotifications ? "checked" : ""}`}
                  role="switch"
                  aria-checked={preferences.smsNotifications}
                  aria-label="Toggle SMS Notifications"
                  tabIndex={0}
                  onClick={() => handleToggle("smsNotifications")}
                  onKeyDown={(e) => handleKeyDown(e, "smsNotifications")}
                >
                  <span className="toggle-knob"></span>
                </button>
              </div>
            </div>
          </section>

          {/* Action buttons */}
          <div className="settings-actions">
            <button
              type="button"
              className="btn-reset-defaults"
              onClick={handleResetDefaults}
            >
              Reset to Defaults
            </button>

            <button
              type="button"
              className="btn-save-settings"
              disabled={saving}
              onClick={handleSavePreferences}
            >
              {saving ? (
                <>
                  <div className="spinner-sm"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Save Preferences
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
