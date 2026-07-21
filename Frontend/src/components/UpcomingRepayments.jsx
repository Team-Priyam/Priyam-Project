import React, { useState, useEffect } from "react";
import "./UpcomingRepayments.css";

function UpcomingRepayments({ showNotification }) {
  const [repayments, setRepayments] = useState([]);
  const [overdueRepayments, setOverdueRepayments] = useState([]);
  const [notificationsList, setNotificationsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [processingOverdue, setProcessingOverdue] = useState(false);

  const [formData, setFormData] = useState({
    borrower: "",
    amountDue: "",
    dueDate: "",
  });

  useEffect(() => {
    fetchUpcomingRepayments();
    fetchOverdueRepayments();
    fetchNotifications();
  }, []);

  const fetchUpcomingRepayments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/repayments/upcoming");
      if (res.ok) {
        const data = await res.json();
        setRepayments(data.repayments || []);
      } else {
        if (showNotification) showNotification("error", "Failed to load upcoming repayments list.");
      }
    } catch (err) {
      if (showNotification) showNotification("error", "Error connecting to server for repayments.");
    } finally {
      setLoading(false);
    }
  };

  const fetchOverdueRepayments = async () => {
    try {
      const res = await fetch("/api/repayments/overdue");
      if (res.ok) {
        const data = await res.json();
        setOverdueRepayments(data.repayments || []);
      }
    } catch (err) {
      console.error("Error fetching overdue repayments:", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/repayments/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotificationsList(data.notifications || []);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const handleProcessOverdue = async () => {
    setProcessingOverdue(true);
    try {
      const res = await fetch("/api/repayments/process-overdue", {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        if (showNotification) {
          showNotification(
            "success",
            `Overdue check complete! ${data.newlyNotifiedCount} new notifications dispatched to both borrowers & lenders.`
          );
        }
        fetchUpcomingRepayments();
        fetchOverdueRepayments();
        fetchNotifications();
      } else {
        if (showNotification) showNotification("error", data.message || "Failed to process overdue check.");
      }
    } catch (err) {
      if (showNotification) showNotification("error", "Connection error processing overdue check.");
    } finally {
      setProcessingOverdue(false);
    }
  };

  const handleRecordPayment = async (id, borrower) => {
    setPayingId(id);
    try {
      const res = await fetch(`/api/repayments/${id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: "Bank Transfer / Cash" }),
      });

      if (res.ok) {
        if (showNotification) showNotification("success", `Payment for "${borrower}" recorded successfully!`);
        fetchUpcomingRepayments();
        fetchOverdueRepayments();
      } else {
        const errData = await res.json();
        if (showNotification) showNotification("error", errData.message || "Failed to record payment.");
      }
    } catch (err) {
      if (showNotification) showNotification("error", "Connection error recording payment.");
    } finally {
      setPayingId(null);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.borrower || !formData.amountDue || !formData.dueDate) {
      if (showNotification) showNotification("error", "Please complete all repayment form fields.");
      return;
    }

    try {
      const res = await fetch("/api/repayments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        if (showNotification) showNotification("success", "New repayment schedule added!");
        setFormData({ borrower: "", amountDue: "", dueDate: "" });
        setShowAddForm(false);
        fetchUpcomingRepayments();
      } else {
        const errData = await res.json();
        if (showNotification) showNotification("error", errData.message || "Failed to add repayment.");
      }
    } catch (err) {
      if (showNotification) showNotification("error", "Connection error adding repayment schedule.");
    }
  };

  // Helper to format due date and compute days remaining
  const getDaysRemainingInfo = (dateStr) => {
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: `Overdue (${Math.abs(diffDays)}d)`, type: "urgent" };
    if (diffDays === 0) return { label: "Due Today", type: "urgent" };
    if (diffDays === 1) return { label: "Due Tomorrow", type: "warning" };
    return { label: `Due in ${diffDays} days`, type: "normal" };
  };

  const filteredRepayments = repayments.filter((r) =>
    r.borrower.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmountDue = repayments.reduce((sum, r) => sum + Number(r.amountDue || 0), 0);

  return (
    <div className="repayments-container">
      {/* Metrics Banner */}
      <div className="repayments-metrics">
        <div className="stat-card">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-val">{repayments.length}</span>
            <span className="stat-lbl">Due in Next 7 Days</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16V5" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-val">${totalAmountDue.toLocaleString()}</span>
            <span className="stat-lbl">Total 7-Day Collections</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green" style={{ background: "rgba(239, 68, 68, 0.2)", color: "#f87171" }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-val">{overdueRepayments.length}</span>
            <span className="stat-lbl">Active Overdue Loans</span>
          </div>
        </div>
      </div>

      {/* Main Glass Card Section */}
      <div className="glass-card">
        <div className="repayments-header">
          <h2 className="card-title">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Upcoming Loan Repayments (Next 7 Days)
          </h2>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={handleProcessOverdue}
              disabled={processingOverdue}
              className="btn-pay"
              style={{ background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" }}
              title="Run overdue check & send notifications to borrowers & lenders"
            >
              {processingOverdue ? (
                <span className="spinner spinner-sm"></span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              )}
              Trigger Overdue Alerts
            </button>
            <input
              type="text"
              placeholder="Search borrower..."
              className="filter-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-submit"
              style={{ width: "auto", padding: "0.5rem 1rem" }}
            >
              {showAddForm ? "Cancel" : "+ Add Schedule"}
            </button>
          </div>
        </div>

        {/* Add Repayment Form */}
        {showAddForm && (
          <form onSubmit={handleAddSubmit} className="add-repayment-form" style={{ marginTop: "1rem" }}>
            <h4 style={{ marginBottom: "1rem", color: "var(--text-primary)" }}>New Repayment Schedule Entry</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Borrower Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.borrower}
                  onChange={(e) => setFormData({ ...formData, borrower: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Amount Due ($)</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  placeholder="e.g. 500"
                  value={formData.amountDue}
                  onChange={(e) => setFormData({ ...formData, amountDue: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn-submit" style={{ marginTop: "1rem", width: "auto" }}>
              Save Schedule Entry
            </button>
          </form>
        )}

        {/* Repayments Table */}
        {loading ? (
          <div className="global-loader">
            <span className="spinner"></span>
          </div>
        ) : filteredRepayments.length === 0 ? (
          <div className="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3>No Repayments Due</h3>
            <p>There are no loan repayments scheduled in the next 7 days matching your query.</p>
          </div>
        ) : (
          <div className="table-container" style={{ marginTop: "1rem" }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th>Borrower Details</th>
                  <th>Amount Due</th>
                  <th>Scheduled Due Date</th>
                  <th>Time Horizon</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRepayments.map((item) => {
                  const info = getDaysRemainingInfo(item.dueDate);
                  return (
                    <tr key={item._id}>
                      <td>
                        <div className="user-name-cell">
                          <div className="user-avatar" style={{ background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)" }}>
                            {item.borrower.charAt(0).toUpperCase()}
                          </div>
                          <div className="user-details">
                            <span style={{ fontWeight: 600 }}>{item.borrower}</span>
                            <span className="user-email">ID: {item._id.slice(-6)}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-primary)" }}>
                          ${Number(item.amountDue).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>
                          {new Date(item.dueDate).toLocaleDateString(undefined, {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </td>
                      <td>
                        <span className={`due-badge due-badge-${info.type}`}>
                          {info.label}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          onClick={() => handleRecordPayment(item._id, item.borrower)}
                          disabled={payingId === item._id}
                          className="btn-pay"
                          title="Record Payment as Paid"
                        >
                          {payingId === item._id ? (
                            <span className="spinner spinner-sm"></span>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          Record Payment
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Overdue Notifications Feed Section */}
      {notificationsList.length > 0 && (
        <div className="glass-card" style={{ marginTop: "1.5rem" }}>
          <h3 className="card-title" style={{ color: "#ef4444", marginBottom: "1rem" }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Overdue Notification Dispatches (Both Parties)
          </h3>

          <div style={{ display: "grid", gap: "0.85rem" }}>
            {notificationsList.map((notif) => (
              <div
                key={notif._id}
                style={{
                  background: notif.recipientRole === "borrower" ? "rgba(239, 68, 68, 0.08)" : "rgba(245, 158, 11, 0.08)",
                  borderLeft: `4px solid ${notif.recipientRole === "borrower" ? "#ef4444" : "#f59e0b"}`,
                  padding: "0.85rem 1.1rem",
                  borderRadius: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                    {notif.title}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      padding: "0.25rem 0.6rem",
                      borderRadius: "9999px",
                      background: notif.recipientRole === "borrower" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)",
                      color: notif.recipientRole === "borrower" ? "#f87171" : "#fbbf24",
                    }}
                  >
                    Recipient: {notif.recipientRole} ({notif.recipientName})
                  </span>
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                  {notif.message}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
                  Sent At: {new Date(notif.createdAt).toLocaleString()} | Target Email: {notif.recipientEmail}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default UpcomingRepayments;
