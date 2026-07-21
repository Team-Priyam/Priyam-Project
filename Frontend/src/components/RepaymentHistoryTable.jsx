import React from "react";

/**
 * RepaymentHistoryTable Component
 * Displays a borrower's full repayment history in a styled table with columns for:
 * - Date (sorted most recent first)
 * - Amount
 * - Payment Method
 */
const RepaymentHistoryTable = ({ repayments = [], loading = false, error = null }) => {
  // Sort repayments chronologically by date (most recent first)
  const sortedRepayments = [...repayments].sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt || 0);
    const dateB = new Date(b.date || b.createdAt || 0);
    return dateB - dateA;
  });

  // Helper to format currency
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Helper for payment method badge CSS style
  const getMethodBadgeClass = (method = "") => {
    const normalized = method.toLowerCase().trim();
    if (normalized.includes("cash")) return "badge-cash";
    if (normalized.includes("upi") || normalized.includes("online")) return "badge-upi";
    if (normalized.includes("bank") || normalized.includes("transfer")) return "badge-bank";
    if (normalized.includes("cheque") || normalized.includes("check")) return "badge-cheque";
    return "badge-default";
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div className="spinner"></div>
        <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>Loading repayment history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error" style={{ margin: "1rem 0" }}>
        <span>{error}</span>
      </div>
    );
  }

  if (!sortedRepayments || sortedRepayments.length === 0) {
    return (
      <div className="empty-state" style={{ padding: "2rem 1rem", textAlign: "center" }}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="40" height="40" style={{ margin: "0 auto 0.5rem", opacity: 0.5 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16V5" />
        </svg>
        <h3>No repayments found</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No payment records have been registered for this borrower yet.</p>
      </div>
    );
  }

  return (
    <div className="table-container" style={{ marginTop: "1rem" }}>
      <table className="users-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Payment Method</th>
          </tr>
        </thead>
        <tbody>
          {sortedRepayments.map((item, idx) => (
            <tr key={item._id || idx}>
              {/* Column 1: Date */}
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16" style={{ color: "var(--text-muted)" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                    {formatDate(item.date || item.createdAt)}
                  </span>
                </div>
              </td>

              {/* Column 2: Amount */}
              <td>
                <span style={{ fontWeight: 600, color: "#34d399", fontSize: "0.95rem" }}>
                  {formatCurrency(item.amount)}
                </span>
              </td>

              {/* Column 3: Payment Method */}
              <td>
                <span className={`badge ${getMethodBadgeClass(item.paymentMethod)}`}>
                  {item.paymentMethod || "Cash"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RepaymentHistoryTable;
