import React, { useState, useEffect } from "react";
import "./NotificationPanel.css";

const NotificationPanel = ({ token, onSelectNotification }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [groupBy, setGroupBy] = useState("event"); // "event" | "borrower"
  const [filterMode, setFilterMode] = useState("all"); // "all" | "unread"

  // Fetch recent notifications from API
  const fetchNotifications = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      } else {
        setError("Failed to retrieve officer notifications.");
      }
    } catch {
      setError("Connection error fetching notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  // Mark single notification as read
  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error("Error marking notification read", err);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error("Error marking all read", err);
    }
  };

  // Handle clicking a notification item -> mark read & show borrower/loan details
  const handleItemClick = (notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }
    if (onSelectNotification) {
      onSelectNotification(notification);
    }
  };

  // Filtered notifications
  const displayedNotifications = notifications.filter((n) =>
    filterMode === "unread" ? !n.isRead : true
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Group notifications by Event Type or Borrower
  const renderGroupedNotifications = () => {
    if (displayedNotifications.length === 0) {
      return (
        <div className="notif-empty-state">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="44" height="44">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <h4>No Notifications Found</h4>
          <p>{filterMode === "unread" ? "You have read all pending officer alerts!" : "No recent activity recorded."}</p>
        </div>
      );
    }

    if (groupBy === "borrower") {
      // Group by Borrower Name
      const borrowerGroups = {};
      displayedNotifications.forEach((item) => {
        const borrowerKey = item.borrower || "General System";
        if (!borrowerGroups[borrowerKey]) borrowerGroups[borrowerKey] = [];
        borrowerGroups[borrowerKey].push(item);
      });

      return Object.entries(borrowerGroups).map(([borrowerName, items]) => (
        <div key={borrowerName} className="notif-group-card">
          <div className="notif-group-header">
            <div className="notif-group-borrower-avatar">
              {borrowerName.charAt(0).toUpperCase()}
            </div>
            <span className="notif-group-title">{borrowerName}</span>
            <span className="notif-group-count">{items.length} Alerts</span>
          </div>
          <div className="notif-group-items">
            {items.map((item) => renderNotificationItem(item))}
          </div>
        </div>
      ));
    }

    // Default: Group by Event Type
    const eventLabels = {
      overdue: { title: "Overdue Repayments", icon: "alert", class: "event-overdue" },
      repayment: { title: "Repayment Schedules", icon: "calendar", class: "event-repayment" },
      application: { title: "Loan Application Queue", icon: "file", class: "event-application" },
      system: { title: "System Audit Logs", icon: "cog", class: "event-system" },
    };

    const eventGroups = { overdue: [], repayment: [], application: [], system: [] };
    displayedNotifications.forEach((item) => {
      const type = item.eventType || "system";
      if (!eventGroups[type]) eventGroups[type] = [];
      eventGroups[type].push(item);
    });

    return Object.entries(eventGroups)
      .filter(([_, items]) => items.length > 0)
      .map(([typeKey, items]) => {
        const meta = eventLabels[typeKey] || { title: "General Activity", class: "event-system" };
        return (
          <div key={typeKey} className="notif-group-card">
            <div className="notif-group-header">
              <span className={`notif-event-tag ${meta.class}`}>{meta.title}</span>
              <span className="notif-group-count">{items.length} Notifications</span>
            </div>
            <div className="notif-group-items">
              {items.map((item) => renderNotificationItem(item))}
            </div>
          </div>
        );
      });
  };

  const renderNotificationItem = (item) => {
    const isUnread = !item.isRead;

    return (
      <div
        key={item._id}
        className={`notif-item ${isUnread ? "notif-item-unread" : "notif-item-read"}`}
        onClick={() => handleItemClick(item)}
      >
        {/* Unread Visual Distinctness Dot */}
        {isUnread && <span className="notif-unread-dot" title="Unread notification"></span>}

        <div className="notif-item-content">
          <div className="notif-item-header">
            <span className={`notif-item-title ${isUnread ? "unread-title" : ""}`}>
              {item.title}
            </span>
            <span className="notif-item-time">
              {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          <p className="notif-item-msg">{item.message}</p>

          <div className="notif-item-footer">
            <span className="notif-borrower-badge">
              Borrower: <strong>{item.borrower}</strong>
            </span>
            {item.meta?.amount > 0 && (
              <span className="notif-amount-badge">
                ${Number(item.meta.amount).toLocaleString()}
              </span>
            )}
            <span className="notif-action-hint">Click to inspect details &rarr;</span>
          </div>
        </div>

        {/* Mark read button */}
        {isUnread && (
          <button
            type="button"
            className="notif-mark-read-btn"
            title="Mark as read"
            onClick={(e) => handleMarkAsRead(item._id, e)}
          >
            ✓
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="notif-panel-card glass-card">
      {/* Panel Header */}
      <div className="notif-panel-header">
        <div className="notif-header-title-group">
          <div className="notif-bell-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && <span className="notif-badge-count">{unreadCount}</span>}
          </div>
          <div>
            <h2 className="notif-panel-title">Officer Notification Center</h2>
            <span className="notif-panel-subtitle">Real-time reminders and borrower collection updates</span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="notif-header-actions">
          {unreadCount > 0 && (
            <button type="button" className="btn-mark-all-read" onClick={handleMarkAllRead}>
              Mark All Read ({unreadCount})
            </button>
          )}
          <button type="button" className="btn-refresh-notif" onClick={fetchNotifications} title="Refresh Notifications">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Controls Bar: Grouping & Filters */}
      <div className="notif-controls-bar">
        {/* Filter Mode */}
        <div className="notif-filter-group">
          <button
            type="button"
            className={`notif-filter-btn ${filterMode === "all" ? "active" : ""}`}
            onClick={() => setFilterMode("all")}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            className={`notif-filter-btn ${filterMode === "unread" ? "active" : ""}`}
            onClick={() => setFilterMode("unread")}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Group By Segmented Control */}
        <div className="notif-group-segmented">
          <span className="notif-group-lbl">Group By:</span>
          <button
            type="button"
            className={`notif-segmented-btn ${groupBy === "event" ? "active" : ""}`}
            onClick={() => setGroupBy("event")}
          >
            Event Type
          </button>
          <button
            type="button"
            className={`notif-segmented-btn ${groupBy === "borrower" ? "active" : ""}`}
            onClick={() => setGroupBy("borrower")}
          >
            Borrower
          </button>
        </div>
      </div>

      {/* Main Body */}
      {loading ? (
        <div className="notif-loading-spinner">
          <div className="spinner"></div>
          <span>Fetching officer notifications...</span>
        </div>
      ) : error ? (
        <div className="notif-error-banner">
          <span>{error}</span>
          <button type="button" className="btn-refresh-notif" onClick={fetchNotifications}>Retry</button>
        </div>
      ) : (
        <div className="notif-scroll-container">
          {renderGroupedNotifications()}
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
