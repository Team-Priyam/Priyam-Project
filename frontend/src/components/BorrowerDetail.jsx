import React, { useState, useEffect } from "react";
import {
  User,
  MapPin,
  Phone,
  IdCard,
  Briefcase,
  Calendar,
  IndianRupee,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  ShieldCheck,
  PhoneCall,
  Activity,
  FileText,
  RotateCcw,
  PlusCircle,
} from "lucide-react";
import { getBorrowerDetail, recordRepayment } from "../services/api";
import RepaymentModal from "./RepaymentModal";

export default function BorrowerDetail({
  borrowerId = "bw_8842",
  token,
  onBack,
  initialData,
}) {
  const [borrower, setBorrower] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);

  // Modal and submission states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [actionError, setActionError] = useState("");

  // Mock demo dataset for robust offline / preview display
  const demoBorrower = {
    _id: "bw_8842",
    borrowerCode: "BW-2024-8842",
    name: "Sunita Devi",
    photoUrl: null,
    phone: "+91 94123 89012",
    secondaryPhone: null,
    village: "East Rampur Village",
    address: "House 42, Near Panchayat Bhavan, East Rampur",
    kycType: "Aadhaar Card",
    kycNumber: "XXXX-XXXX-8921",
    kycVerified: true,
    occupation: "Dairy Farmer & Women SHG Member",
    joinedDate: "2024-02-10T00:00:00.000Z",
    emergencyContact: "Rajesh Devi (Husband) - +91 94123 89099",
    financials: {
      totalBorrowed: 50000,
      totalRepaid: 35000,
      currentBalance: 15000,
      activeLoansCount: 1,
      status: "Active",
    },
    activities: [
      {
        id: "act_101",
        type: "Repayment",
        amount: 2500,
        date: "2026-07-20T10:30:00.000Z",
        mode: "Cash (Field Officer Collection)",
        receiptNo: "RCP-2026-0912",
        status: "Completed",
      },
      {
        id: "act_102",
        type: "Repayment",
        amount: 2500,
        date: "2026-06-20T11:15:00.000Z",
        mode: "UPI Collection",
        receiptNo: "RCP-2026-0784",
        status: "Completed",
      },
      {
        id: "act_103",
        type: "Loan Disbursement",
        amount: 50000,
        date: "2026-02-10T09:00:00.000Z",
        mode: "Bank Transfer",
        receiptNo: "DISB-2026-0042",
        status: "Disbursed",
      },
    ],
  };

  const fetchDetail = async () => {
    if (initialData) {
      setBorrower(initialData);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (borrowerId) {
        const data = await getBorrowerDetail(borrowerId, token);
        const bData = data?.data || data;
        setBorrower(bData);
      } else {
        setBorrower(demoBorrower);
      }
    } catch (err) {
      console.warn("API fetch error for borrower:", err.message);
      setError(err.message || "Failed to load borrower records from backend API");
      if (!token || token === "demo_jwt_token_123") {
        setBorrower(demoBorrower);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [borrowerId, token, initialData]);

  // Handle Repayment Submission to Backend API
  const handleRepaymentSubmit = async (repaymentData) => {
    const targetId = borrower?._id || borrowerId || "bw_8842";
    setSubmitting(true);
    setActionError("");
    setSuccessMessage("");

    try {
      const response = await recordRepayment(targetId, repaymentData, token);

      if (response && response.success) {
        const updatedBorrower = response.data || response.borrower;
        if (updatedBorrower) {
          setBorrower(updatedBorrower);
        } else {
          // Fallback manual state update if needed
          setBorrower((prev) => {
            const currentObj = prev || demoBorrower;
            const newTotalRepaid = (currentObj.financials?.totalRepaid || 0) + repaymentData.amount;
            const newBalance = Math.max(0, (currentObj.financials?.totalBorrowed || 0) - newTotalRepaid);
            const receiptNo = response.receiptNo || `RCP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

            const newAct = {
              id: `act_${Date.now()}`,
              type: "Repayment",
              amount: repaymentData.amount,
              date: repaymentData.date,
              mode: repaymentData.mode,
              receiptNo,
              status: "Completed",
            };

            return {
              ...currentObj,
              financials: {
                ...currentObj.financials,
                totalRepaid: newTotalRepaid,
                currentBalance: newBalance,
                status: newBalance === 0 ? "Cleared" : currentObj.financials?.status || "Active",
              },
              activities: [newAct, ...(currentObj.activities || [])],
            };
          });
        }

        setSuccessMessage(
          response.message ||
            `Repayment of ₹${repaymentData.amount.toLocaleString("en-IN")} recorded successfully! Receipt: ${response.receiptNo || "Generated"}`
        );
        setIsModalOpen(false);

        // Auto hide success alert after 6 seconds
        setTimeout(() => {
          setSuccessMessage("");
        }, 6000);
      } else {
        throw new Error(response?.message || "Failed to process repayment");
      }
    } catch (err) {
      console.error("Repayment recording failed:", err);
      setActionError(err.message || "Failed to save repayment to backend API.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="card text-center" style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <Activity size={36} className="spin-icon" color="var(--accent-primary)" style={{ margin: "0 auto" }} />
        <div style={{ marginTop: "1rem", fontWeight: 700, color: "var(--text-main)" }}>
          Loading Borrower Details...
        </div>
        <div style={{ marginTop: "0.25rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Fetching record by ID: <code>{borrowerId}</code>
        </div>
      </div>
    );
  }

  if (error && !borrower) {
    return (
      <div className="card">
        <div className="alert alert-error">
          <AlertTriangle size={20} />
          <span>Error loading borrower profile: {error}</span>
        </div>
        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <button className="btn btn-primary" onClick={fetchDetail}>
            <RotateCcw size={16} /> Retry Fetch
          </button>
          {onBack && (
            <button className="btn btn-back" onClick={onBack}>
              <ArrowLeft size={16} /> Back to Borrower List
            </button>
          )}
        </div>
      </div>
    );
  }

  const b = borrower || demoBorrower;
  const initials = b.name
    ? b.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "B";

  const formattedJoinedDate = b.joinedDate
    ? new Date(b.joinedDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "N/A";

  const isCleared = b.financials?.currentBalance === 0;

  return (
    <div className="borrower-detail-container">
      {/* Navigation & Header Toolbar */}
      <div className="detail-toolbar">
        {onBack && (
          <button className="btn btn-back" onClick={onBack} id="btn-back-to-list">
            <ArrowLeft size={18} /> Back to Borrower List
          </button>
        )}
        <div className="toolbar-actions" style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setActionError("");
              setIsModalOpen(true);
            }}
            id="btn-open-repayment-modal"
            disabled={isCleared}
            title={isCleared ? "Loan is already fully repaid and cleared" : "Record a repayment against this loan"}
          >
            <PlusCircle size={17} /> Record Repayment
          </button>
          <a
            href={b.phone ? `tel:${b.phone}` : "#"}
            className={`btn btn-call ${!b.phone ? "disabled" : ""}`}
          >
            <PhoneCall size={16} /> Call Borrower
          </a>
        </div>
      </div>

      {/* Global Success Banner */}
      {successMessage && (
        <div className="alert alert-success" style={{ marginBottom: "0" }}>
          <CheckCircle2 size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Global Action Error Banner */}
      {actionError && (
        <div className="alert alert-error" style={{ marginBottom: "0" }}>
          <AlertTriangle size={20} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="card profile-header-card">
        <div className="profile-header-content">
          <div className="profile-photo-wrapper">
            {b.photoUrl ? (
              <img src={b.photoUrl} alt={b.name} className="profile-photo-img" />
            ) : (
              <div className="avatar-placeholder">{initials}</div>
            )}
            <span
              className={`status-indicator-dot ${
                b.financials?.status === "Overdue" ? "dot-overdue" : "dot-active"
              }`}
            />
          </div>

          <div className="profile-header-text">
            <div className="header-title-row">
              <h2 className="borrower-name">{b.name || "Unnamed Borrower"}</h2>
              <span className="badge badge-code">{b.borrowerCode || "N/A"}</span>
              {b.kycVerified && (
                <span className="badge badge-verified">
                  <ShieldCheck size={13} /> KYC Verified
                </span>
              )}
              <span
                className={`badge ${
                  b.financials?.status === "Cleared"
                    ? "badge-cleared"
                    : b.financials?.status === "Overdue"
                    ? "badge-overdue"
                    : "badge-active"
                }`}
              >
                {b.financials?.status || "Active"}
              </span>
            </div>

            <div className="meta-subtext">
              <span className="meta-subtext-item">
                <MapPin size={15} color="var(--accent-primary)" />
                {b.village || "Village Not Specified"}
              </span>
              <span className="meta-subtext-item">
                <Calendar size={15} color="var(--text-muted)" /> Member since{" "}
                {formattedJoinedDate}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary Stats Cards Grid */}
      <div className="stats-cards-grid">
        <div className="stat-card">
          <div className="stat-icon-bg icon-blue">
            <IndianRupee size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Capital Borrowed</span>
            <span className="stat-value">
              ₹{(b.financials?.totalBorrowed || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-bg icon-green">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Amount Repaid</span>
            <span className="stat-value text-success">
              ₹{(b.financials?.totalRepaid || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-bg icon-orange">
            <Clock size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Outstanding Balance</span>
            <span className="stat-value text-accent">
              ₹{(b.financials?.currentBalance || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Layout: Profile Fields & Recent Activity */}
      <div className="detail-layout-grid">
        {/* Left Column: Complete Profile & KYC Information */}
        <div className="card info-section-card">
          <div className="card-title-group">
            <h3 className="card-title">
              <User size={20} color="var(--accent-primary)" /> Profile & KYC Details
            </h3>
          </div>

          <div className="info-fields-list">
            <div className="info-field-item">
              <div className="info-field-icon">
                <Phone size={16} />
              </div>
              <div className="info-field-data">
                <span className="field-label">Primary Phone</span>
                <span className="field-value">
                  {b.phone ? b.phone : <em className="text-muted">Not Provided</em>}
                </span>
              </div>
            </div>

            <div className="info-field-item">
              <div className="info-field-icon">
                <Phone size={16} />
              </div>
              <div className="info-field-data">
                <span className="field-label">Secondary / Alternate Contact</span>
                <span className="field-value">
                  {b.secondaryPhone ? (
                    b.secondaryPhone
                  ) : (
                    <em className="text-muted">Not Provided (N/A)</em>
                  )}
                </span>
              </div>
            </div>

            <div className="info-field-item">
              <div className="info-field-icon">
                <MapPin size={16} />
              </div>
              <div className="info-field-data">
                <span className="field-label">Village & Field Address</span>
                <span className="field-value">
                  {b.address || b.village || <em className="text-muted">N/A</em>}
                </span>
              </div>
            </div>

            <div className="info-field-item">
              <div className="info-field-icon">
                <IdCard size={16} />
              </div>
              <div className="info-field-data">
                <span className="field-label">Government ID ({b.kycType || "KYC"})</span>
                <span className="field-value">
                  {b.kycNumber ? (
                    <code className="code-badge">{b.kycNumber}</code>
                  ) : (
                    <em className="text-muted">No ID Recorded</em>
                  )}
                </span>
              </div>
            </div>

            <div className="info-field-item">
              <div className="info-field-icon">
                <Briefcase size={16} />
              </div>
              <div className="info-field-data">
                <span className="field-label">Occupation / Livelihood</span>
                <span className="field-value">
                  {b.occupation ? (
                    b.occupation
                  ) : (
                    <em className="text-muted">Not Specified</em>
                  )}
                </span>
              </div>
            </div>

            <div className="info-field-item">
              <div className="info-field-icon">
                <User size={16} />
              </div>
              <div className="info-field-data">
                <span className="field-label">Emergency Contact / Next of Kin</span>
                <span className="field-value">
                  {b.emergencyContact ? (
                    b.emergencyContact
                  ) : (
                    <em className="text-muted">None Provided</em>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity & Repayment Timeline */}
        <div className="card activity-section-card">
          <div className="card-title-group">
            <h3 className="card-title">
              <Activity size={20} color="var(--accent-primary)" /> Recent Activity Log
            </h3>
            <span className="badge badge-count">
              {b.activities ? b.activities.length : 0} Events
            </span>
          </div>

          {b.activities && b.activities.length > 0 ? (
            <div className="activity-timeline">
              {b.activities.map((act, index) => {
                const actDate = act.date
                  ? new Date(act.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "N/A";

                const isDisbursed = act.type === "Loan Disbursement";

                return (
                  <div className="timeline-item" key={act.id || index}>
                    <div
                      className={`timeline-icon-dot ${
                        isDisbursed ? "timeline-icon-disbursed" : "timeline-icon-repayment"
                      }`}
                    >
                      {isDisbursed ? <FileText size={14} /> : <Receipt size={14} />}
                    </div>

                    <div className="timeline-content">
                      <div className="timeline-header-row">
                        <span className="timeline-title">{act.type}</span>
                        <span className="timeline-amount">
                          {isDisbursed ? "+" : "-"}₹
                          {act.amount ? act.amount.toLocaleString("en-IN") : "0"}
                        </span>
                      </div>

                      <div className="timeline-meta-row">
                        <span>
                          <Calendar size={13} /> {actDate}
                        </span>
                        <span>•</span>
                        <span>{act.mode || "Field Cash"}</span>
                      </div>

                      {act.receiptNo && (
                        <div className="timeline-receipt-badge">
                          Receipt: <code>{act.receiptNo}</code>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-activity-box">
              <Clock size={32} color="var(--text-muted)" />
              <p className="empty-title">No Recent Activity</p>
              <p className="empty-subtitle">
                No repayment installments or loan disbursements recorded for this borrower yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Repayment Modal Dialog Component */}
      <RepaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleRepaymentSubmit}
        borrowerName={b.name}
        borrowerCode={b.borrowerCode}
        currentBalance={b.financials?.currentBalance || 0}
        loading={submitting}
      />
    </div>
  );
}
