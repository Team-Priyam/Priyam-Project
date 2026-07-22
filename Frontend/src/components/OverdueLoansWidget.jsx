import React, { useState } from "react";
import "./OverdueLoansWidget.css";

/**
 * Helper to format ISO Date to clean string (e.g., Jul 15, 2026)
 */
const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "N/A";
  }
};

/**
 * Calculate days overdue relative to current date
 */
const getDaysOverdue = (dateStr) => {
  if (!dateStr) return 0;
  try {
    const due = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diffTime = now - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  } catch {
    return 0;
  }
};

const OverdueLoansWidget = ({ overdueLoans = [], token, onRepaymentRecorded }) => {
  const [repayModalLoan, setRepayModalLoan] = useState(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayNote, setRepayNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [repayError, setRepayError] = useState("");

  const totalOverdue = overdueLoans.reduce(
    (sum, loan) => sum + (loan.overdueAmount || loan.monthlyInstallment || 0),
    0
  );

  const handleOpenRepayModal = (loan) => {
    setRepayModalLoan(loan);
    setRepayAmount(loan.overdueAmount || loan.monthlyInstallment || "");
    setRepayNote("");
    setRepayError("");
  };

  const handleCloseRepayModal = () => {
    setRepayModalLoan(null);
    setRepayAmount("");
    setRepayNote("");
    setRepayError("");
  };

  const handleRecordRepayment = async (e) => {
    e.preventDefault();
    if (!repayModalLoan) return;

    const numAmount = Number(repayAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setRepayError("Please enter a valid repayment amount greater than 0");
      return;
    }

    setIsSubmitting(true);
    setRepayError("");

    try {
      const res = await fetch(`/api/loans/${repayModalLoan._id}/repay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: numAmount,
          note: repayNote,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        handleCloseRepayModal();
        if (onRepaymentRecorded) {
          onRepaymentRecorded(data.loan);
        }
      } else {
        setRepayError(data.message || "Failed to record repayment.");
      }
    } catch {
      setRepayError("Connection error recording repayment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="overdue-widget-card glass-card">
      {/* Widget Header */}
      <div className="overdue-widget-header">
        <div className="overdue-title-group">
          <div className="overdue-icon-badge">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="overdue-widget-title">Overdue Repayments</h3>
            <span className="overdue-widget-subtitle">
              Loans requiring immediate payment collection
            </span>
          </div>
        </div>

        <div className="overdue-stats-group">
          <span className="overdue-count-pill">{overdueLoans.length} Loans</span>
          <span className="overdue-amount-pill">
            ${Number(totalOverdue).toLocaleString()} Total
          </span>
        </div>
      </div>

      {/* Overdue Loans List */}
      {overdueLoans.length === 0 ? (
        <div className="overdue-empty-state">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h4>No Overdue Repayments</h4>
          <p>All loan accounts are currently up to date on scheduled payments.</p>
        </div>
      ) : (
        <div className="overdue-list">
          {overdueLoans.map((loan) => {
            const daysOverdue = getDaysOverdue(loan.dueDate);
            const overdueAmt = loan.overdueAmount || loan.monthlyInstallment || 0;
            const isCritical = daysOverdue > 15 || overdueAmt >= 2500;

            return (
              <div
                key={loan._id}
                className={`overdue-item-card ${isCritical ? "overdue-item-critical" : "overdue-item-warning"}`}
              >
                {/* Visual Status Pulse & Severity Indicator */}
                <div className="overdue-status-indicator">
                  <span className={`pulse-dot ${isCritical ? "pulse-dot-critical" : "pulse-dot-warning"}`}></span>
                </div>

                {/* Borrower details */}
                <div className="overdue-item-borrower">
                  <div className={`overdue-avatar ${isCritical ? "avatar-critical" : "avatar-warning"}`}>
                    {loan.borrower.charAt(0).toUpperCase()}
                  </div>
                  <div className="overdue-borrower-meta">
                    <div className="overdue-name-row">
                      <span className="overdue-borrower-name">{loan.borrower}</span>
                      <span className={`overdue-severity-badge ${isCritical ? "badge-critical" : "badge-warning"}`}>
                        {isCritical ? "CRITICAL" : "OVERDUE"}
                      </span>
                    </div>
                    <span className="overdue-loan-meta">
                      Principal: ${Number(loan.amount).toLocaleString()} • {loan.purpose}
                    </span>
                  </div>
                </div>

                {/* Due Date & Overdue Days */}
                <div className="overdue-item-duedate">
                  <span className="overdue-date-lbl">Payment Due Date</span>
                  <span className="overdue-date-val">{formatDate(loan.dueDate)}</span>
                  <span className={`overdue-badge-pill ${isCritical ? "pill-critical" : "pill-warning"}`}>
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="12" height="12">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {daysOverdue > 0 ? `${daysOverdue} ${daysOverdue === 1 ? "day" : "days"} overdue` : "Overdue"}
                  </span>
                </div>

                {/* Overdue Amount Highlighted */}
                <div className="overdue-item-amount highlighted-amount-box">
                  <span className="overdue-amt-lbl">Overdue Amount</span>
                  <span className="overdue-amt-val">
                    ${Number(overdueAmt).toLocaleString()}
                  </span>
                </div>

                {/* Action: Record Repayment */}
                <div className="overdue-item-action">
                  <button
                    type="button"
                    className="btn-record-repayment"
                    onClick={() => handleOpenRepayModal(loan)}
                  >
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    Record Payment
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Repayment Modal */}
      {repayModalLoan && (
        <div className="modal-backdrop" onClick={handleCloseRepayModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <button className="modal-close-btn" onClick={handleCloseRepayModal}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              Record Repayment
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
              Collection entry for <strong>{repayModalLoan.borrower}</strong>
            </p>

            {repayError && (
              <div className="auth-error-banner" style={{ marginBottom: "1rem" }}>
                <span>{repayError}</span>
              </div>
            )}

            <form onSubmit={handleRecordRepayment}>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">Payment Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  className="form-input"
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  placeholder="Enter repayment amount"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label className="form-label">Receipt Note / Payment Ref (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={repayNote}
                  onChange={(e) => setRepayNote(e.target.value)}
                  placeholder="e.g. Cash payment receipt #1042"
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn-logout"
                  style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", borderColor: "var(--border-color)" }}
                  onClick={handleCloseRepayModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-approve"
                  disabled={isSubmitting}
                  style={{ minWidth: "140px" }}
                >
                  {isSubmitting ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverdueLoansWidget;
