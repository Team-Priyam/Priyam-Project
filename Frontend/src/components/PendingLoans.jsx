import React, { useState, useEffect } from "react";
import "./PendingLoans.css";

const PendingLoans = ({ showNotification, onStatusUpdate }) => {
  const [pendingLoans, setPendingLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [officerName, setOfficerName] = useState("Loan Officer");
  const [reviewNote, setReviewNote] = useState("");

  const fetchPendingLoans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/loans/pending");
      if (res.ok) {
        const data = await res.json();
        const loansList = data.loans || [];
        setPendingLoans(loansList);

        // Keep current selected loan if still pending, otherwise select first item
        if (loansList.length > 0) {
          setSelectedLoan((prev) => {
            if (!prev) return loansList[0];
            const updated = loansList.find((l) => l._id === prev._id);
            return updated || loansList[0];
          });
        } else {
          setSelectedLoan(null);
        }
      } else {
        if (showNotification) {
          showNotification("error", "Failed to retrieve pending loan applications.");
        }
      }
    } catch (err) {
      if (showNotification) {
        showNotification("error", "Could not connect to the backend server to fetch pending applications.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingLoans();
  }, []);

  const handleReviewAction = async (id, action) => {
    if (!id) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/loans/${id}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: officerName.trim() || "Loan Officer",
          note: reviewNote.trim() || `Loan application ${action}d by ${officerName.trim() || "Loan Officer"}`,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success !== false) {
        const actionText = action === "approve" ? "approved" : "rejected";
        if (showNotification) {
          showNotification("success", `Loan application for "${data.loan?.borrower || "Borrower"}" was successfully ${actionText}!`);
        }

        setReviewNote("");
        fetchPendingLoans();

        if (onStatusUpdate) {
          onStatusUpdate();
        }
      } else {
        if (showNotification) {
          showNotification("error", data.message || `Failed to ${action} loan application.`);
        }
      }
    } catch (err) {
      if (showNotification) {
        showNotification("error", `Error processing ${action} request. Please try again.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pending-loans-container">
      <header className="pending-loans-header">
        <div>
          <h2>Pending Loan Applications Review</h2>
          <p className="subtitle">Inspect submitted applications, review details, and make approval decisions</p>
        </div>
        <button className="btn-refresh" onClick={fetchPendingLoans} disabled={loading}>
          <svg className={`refresh-icon ${loading ? "spinning" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Queue
        </button>
      </header>

      <div className="pending-grid">
        {/* Left Column: Applications List */}
        <div className="glass-card applications-list-card">
          <div className="card-header">
            <h3 className="card-title">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="title-icon">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Pending Applications
            </h3>
            <span className="badge-count">{pendingLoans.length} Loans</span>
          </div>

          {loading ? (
            <div className="loader-box">
              <span className="spinner"></span>
              <p>Loading pending applications...</p>
            </div>
          ) : pendingLoans.length === 0 ? (
            <div className="empty-state">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3>Queue is Empty</h3>
              <p>All submitted loan applications have been evaluated.</p>
            </div>
          ) : (
            <div className="items-list">
              {pendingLoans.map((loan) => (
                <div
                  key={loan._id}
                  onClick={() => {
                    setSelectedLoan(loan);
                    setReviewNote("");
                  }}
                  className={`pending-card-item ${selectedLoan?._id === loan._id ? "active-item" : ""}`}
                >
                  <div className="item-avatar">
                    {loan.borrower.charAt(0).toUpperCase()}
                  </div>
                  <div className="item-main">
                    <h4 className="borrower-name">{loan.borrower}</h4>
                    <span className="item-purpose">{loan.purpose}</span>
                  </div>
                  <div className="item-stats">
                    <span className="item-amount">${Number(loan.amount).toLocaleString()}</span>
                    <span className="item-term">{loan.term} mos</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Selected Application Details & Action Panel */}
        <div className="glass-card application-details-card">
          {selectedLoan ? (
            <div>
              <div className="card-header">
                <h3 className="card-title">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="title-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Application Details
                </h3>
                <span className="badge badge-pending">Pending Review</span>
              </div>

              {/* Grid of Key Loan Details */}
              <div className="details-grid">
                <div className="detail-box">
                  <span className="detail-label">Borrower Name</span>
                  <span className="detail-value">{selectedLoan.borrower}</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">Requested Loan Amount</span>
                  <span className="detail-value highlight-green">${Number(selectedLoan.amount).toLocaleString()}</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">Term Length</span>
                  <span className="detail-value">{selectedLoan.term} months</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">Loan Purpose</span>
                  <span className="detail-value capitalize">{selectedLoan.purpose}</span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">Application Date</span>
                  <span className="detail-value">
                    {selectedLoan.createdAt
                      ? new Date(selectedLoan.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "N/A"}
                  </span>
                </div>
                <div className="detail-box">
                  <span className="detail-label">Status</span>
                  <span className="detail-value capitalize">Pending Authorization</span>
                </div>
              </div>

              {/* Officer Form Inputs */}
              <div className="evaluation-form">
                <div className="form-group">
                  <label htmlFor="officerName" className="form-label">
                    Evaluating Loan Officer Name
                  </label>
                  <input
                    type="text"
                    id="officerName"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    placeholder="e.g. Senior Loan Officer"
                    className="form-input"
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="reviewNote" className="form-label">
                    Review Notes / Audit Comments (Optional)
                  </label>
                  <textarea
                    id="reviewNote"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Provide justification, verification details, or comments..."
                    className="form-textarea"
                    rows="3"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="action-buttons">
                <button
                  type="button"
                  className="btn-action btn-reject"
                  onClick={() => handleReviewAction(selectedLoan._id, "reject")}
                  disabled={submitting}
                >
                  {submitting ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject Application
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn-action btn-approve"
                  onClick={() => handleReviewAction(selectedLoan._id, "approve")}
                  disabled={submitting}
                >
                  {submitting ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Approve Application
                    </>
                  )}
                </button>
              </div>

              {/* Audit History Log */}
              {selectedLoan.statusHistory && selectedLoan.statusHistory.length > 0 && (
                <div className="audit-history-section">
                  <h4 className="audit-title">Audit History Log</h4>
                  <div className="audit-timeline">
                    {selectedLoan.statusHistory.map((history, idx) => (
                      <div key={idx} className={`timeline-entry status-${history.status}`}>
                        <div className="timeline-top">
                          <span className="entry-action">{history.action ? history.action.toUpperCase() : history.status.toUpperCase()}</span>
                          <span className="entry-time">{new Date(history.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="entry-actor">By: {history.user || "System"}</div>
                        {history.note && <div className="entry-note">{history.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state select-prompt">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <h3>No Application Selected</h3>
              <p>Select a pending application from the left panel to inspect details and take action.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingLoans;
