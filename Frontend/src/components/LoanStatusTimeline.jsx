import React from "react";
import "./LoanStatusTimeline.css";

/**
 * Format ISO Date string to human-readable format
 */
const formatDateTime = (dateStr) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "N/A";
  }
};

/**
 * Loan Status Definitions and Icon Mapping Configuration
 */
const LOAN_STEPS = [
  {
    id: "submitted",
    title: "Submitted",
    subtext: "Application Received",
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    getTimestamp: (loan, history) => {
      const entry = history.find((h) => h.action === "created" || h.status === "pending") || history[0];
      return entry ? formatDateTime(entry.timestamp || loan.createdAt) : formatDateTime(loan.createdAt);
    },
    getState: () => "completed",
  },
  {
    id: "under_review",
    title: "Under Review",
    subtext: "Officer Evaluation",
    getIcon: (state) =>
      state === "active" ? (
        <svg className="spinner-node" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ) : (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
      ),
    getTimestamp: (loan, history) => {
      const entry = history.find((h) => h.action === "under_review" || h.action === "reviewing");
      return loan.status !== "pending"
        ? formatDateTime(entry?.timestamp || loan.createdAt)
        : "In Progress";
    },
    getState: (status) => (status === "pending" ? "active" : "completed"),
  },
  {
    id: "decision",
    getTitle: (status) => {
      if (status === "approved") return "Approved";
      if (status === "rejected") return "Rejected";
      return "Pending Decision";
    },
    subtext: "Audit Resolution",
    getIcon: (status) => {
      if (status === "approved") {
        return (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        );
      }
      if (status === "rejected") {
        return (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      }
      return (
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    },
    getTimestamp: (_loan, history, status) => {
      if (status === "pending") return "Awaiting decision";
      const entry = history.find(
        (h) => h.status === "approved" || h.status === "rejected" || h.action === "approved" || h.action === "rejected"
      ) || (history.length > 0 ? history[history.length - 1] : null);
      return entry ? formatDateTime(entry.timestamp) : "N/A";
    },
    getState: (status) => {
      if (status === "approved") return "completed";
      if (status === "rejected") return "failed";
      return "pending";
    },
  },
];

/**
 * React Component: Visual Loan Status Steps Timeline
 */
const LoanStatusTimeline = ({ loan }) => {
  if (!loan) return null;

  const currentStatus = loan.status || "pending";
  const history = Array.isArray(loan.statusHistory) ? loan.statusHistory : [];

  // Calculate progress bar fill width based on status
  let progressWidth = "50%";
  if (currentStatus === "approved" || currentStatus === "rejected") {
    progressWidth = "100%";
  }

  return (
    <div className="status-tracker-container">
      <div className="status-tracker">
        {/* Background track line */}
        <div className="tracker-line-bg"></div>
        
        {/* Dynamic active progress line */}
        <div className="tracker-line-progress" style={{ width: progressWidth }}></div>

        {/* Status Steps Nodes */}
        {LOAN_STEPS.map((step) => {
          const state = step.getState(currentStatus);
          const title = step.getTitle ? step.getTitle(currentStatus) : step.title;
          const timestamp = step.getTimestamp(loan, history, currentStatus);
          const icon = step.getIcon ? step.getIcon(state === "active" ? "active" : currentStatus) : step.icon;

          return (
            <div key={step.id} className={`tracker-step ${state}`} title={`${title}: ${timestamp}`}>
              <div className="tracker-node">{icon}</div>
              <span className="tracker-step-title">{title}</span>
              <span className="tracker-step-subtext">{step.subtext}</span>
              <span className="tracker-step-time">{timestamp}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LoanStatusTimeline;


