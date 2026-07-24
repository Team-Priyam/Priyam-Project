import React, { useState } from "react";
import {
  IndianRupee,
  Calendar,
  CreditCard,
  FileText,
  X,
  AlertCircle,
  Clock,
  ShieldCheck,
  Send,
} from "lucide-react";

export default function RepaymentModal({
  isOpen = true,
  onClose,
  onSubmit,
  borrowerName = "Borrower",
  borrowerCode = "BW-2024-XXXX",
  currentBalance = 15000,
  loading = false,
}) {
  // Form input states
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("Cash (Field Collection)");
  const [notes, setNotes] = useState("");

  // Validation & Error states
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState("");

  if (!isOpen) return null;

  // Helper to format today's date in local YYYY-MM-DD format
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Field validation rules
  const validateAmount = (val) => {
    if (val === "" || val === null || val === undefined) {
      return "Repayment amount is required.";
    }
    const num = Number(val);
    if (isNaN(num)) {
      return "Amount must be a valid number.";
    }
    if (num <= 0) {
      return "Amount must be a positive number greater than ₹0.";
    }
    if (currentBalance > 0 && num > currentBalance) {
      return `Amount (₹${num.toLocaleString("en-IN")}) exceeds remaining balance of ₹${currentBalance.toLocaleString("en-IN")}.`;
    }
    return "";
  };

  const validateDate = (val) => {
    if (!val) {
      return "Collection date is required.";
    }
    const selectedDateStr = val.trim();
    const todayStr = getTodayString();

    if (selectedDateStr > todayStr) {
      return "Collection date cannot be in the future.";
    }
    return "";
  };

  const validateMethod = (val) => {
    if (!val || val.trim() === "") {
      return "Payment method is required.";
    }
    return "";
  };

  // Event Handlers with Real-Time Validation
  const handleAmountChange = (e) => {
    const val = e.target.value;
    setAmount(val);
    const err = validateAmount(val);
    setFieldErrors((prev) => ({ ...prev, amount: err }));
    if (generalError) setGeneralError("");
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    setDate(val);
    const err = validateDate(val);
    setFieldErrors((prev) => ({ ...prev, date: err }));
    if (generalError) setGeneralError("");
  };

  const handleMethodChange = (e) => {
    const val = e.target.value;
    setPaymentMethod(val);
    const err = validateMethod(val);
    setFieldErrors((prev) => ({ ...prev, paymentMethod: err }));
    if (generalError) setGeneralError("");
  };

  const handleBlur = (field) => {
    if (field === "amount") {
      setFieldErrors((prev) => ({ ...prev, amount: validateAmount(amount) }));
    } else if (field === "date") {
      setFieldErrors((prev) => ({ ...prev, date: validateDate(date) }));
    } else if (field === "paymentMethod") {
      setFieldErrors((prev) => ({ ...prev, paymentMethod: validateMethod(paymentMethod) }));
    }
  };

  // Comprehensive Form Validation on Submission
  const validateForm = () => {
    const amountErr = validateAmount(amount);
    const dateErr = validateDate(date);
    const methodErr = validateMethod(paymentMethod);

    const errors = {};
    if (amountErr) errors.amount = amountErr;
    if (dateErr) errors.date = dateErr;
    if (methodErr) errors.paymentMethod = methodErr;

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstErr = amountErr || dateErr || methodErr;
      setGeneralError(firstErr);
      return false;
    }

    setGeneralError("");
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const repaymentData = {
      amount: parseFloat(amount),
      date: new Date(date).toISOString(),
      mode: paymentMethod,
      notes: notes.trim(),
    };

    if (onSubmit) {
      onSubmit(repaymentData);
    }
  };

  const todayDateStr = getTodayString();
  const hasErrors = Boolean(fieldErrors.amount || fieldErrors.date || fieldErrors.paymentMethod);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title">
              <IndianRupee size={22} color="var(--accent-primary)" /> Record New Repayment
            </h3>
            <p className="modal-subtitle">
              Logging installment for <strong>{borrowerName}</strong> (<code>{borrowerCode}</code>)
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Current Balance Notice */}
        <div className="balance-info-banner">
          <div className="balance-banner-item">
            <span className="balance-label">Outstanding Balance</span>
            <span className="balance-value">₹{(currentBalance || 0).toLocaleString("en-IN")}</span>
          </div>
          <div className="balance-banner-badge">
            <ShieldCheck size={14} color="#10b981" /> Active Loan Record
          </div>
        </div>

        {/* General Error Banner */}
        {generalError && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{generalError}</span>
          </div>
        )}

        {/* Repayment Input Form */}
        <form onSubmit={handleSubmit} className="repayment-form" noValidate>
          <div className="form-grid">
            {/* Input 1: Repayment Amount */}
            <div className="form-group">
              <label htmlFor="repayment-amount" className="form-label">
                <IndianRupee size={15} color="var(--accent-primary)" /> Repayment Amount (₹) *
              </label>
              <div className="form-input-wrapper">
                <input
                  id="repayment-amount"
                  type="number"
                  step="any"
                  min="0.01"
                  max={currentBalance || undefined}
                  className={`form-input ${fieldErrors.amount ? "input-error" : ""}`}
                  placeholder="e.g. 2500"
                  value={amount}
                  onChange={handleAmountChange}
                  onBlur={() => handleBlur("amount")}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  className="quick-fill-btn"
                  onClick={() => {
                    setAmount(currentBalance.toString());
                    setFieldErrors((prev) => ({ ...prev, amount: "" }));
                    setGeneralError("");
                  }}
                  title="Pay Full Balance"
                >
                  Pay Full
                </button>
              </div>
              {fieldErrors.amount && (
                <span className="field-error-text">{fieldErrors.amount}</span>
              )}
            </div>

            {/* Input 2: Payment Date */}
            <div className="form-group">
              <label htmlFor="repayment-date" className="form-label">
                <Calendar size={15} color="var(--accent-primary)" /> Collection Date *
              </label>
              <div className="form-input-wrapper">
                <input
                  id="repayment-date"
                  type="date"
                  className={`form-input ${fieldErrors.date ? "input-error" : ""}`}
                  value={date}
                  max={todayDateStr}
                  onChange={handleDateChange}
                  onBlur={() => handleBlur("date")}
                  required
                />
              </div>
              {fieldErrors.date && (
                <span className="field-error-text">{fieldErrors.date}</span>
              )}
            </div>

            {/* Input 3: Payment Method Dropdown */}
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="payment-method" className="form-label">
                <CreditCard size={15} color="var(--accent-primary)" /> Payment Method *
              </label>
              <select
                id="payment-method"
                className={`form-input form-select ${fieldErrors.paymentMethod ? "input-error" : ""}`}
                value={paymentMethod}
                onChange={handleMethodChange}
                onBlur={() => handleBlur("paymentMethod")}
                required
              >
                <option value="Cash (Field Collection)">Cash (Field Collection)</option>
                <option value="UPI Collection">UPI Collection (PhonePe / GPay / Paytm)</option>
                <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
                <option value="Cheque">Cheque Deposit</option>
              </select>
              {fieldErrors.paymentMethod && (
                <span className="field-error-text">{fieldErrors.paymentMethod}</span>
              )}
            </div>

            {/* Optional Input: Receipt / Collection Notes */}
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="repayment-notes" className="form-label">
                <FileText size={15} color="var(--text-muted)" /> Field Notes / Reference (Optional)
              </label>
              <input
                id="repayment-notes"
                type="text"
                className="form-input"
                placeholder="e.g. Received via field agent at village center"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-back"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || hasErrors}
              id="btn-submit-repayment"
            >
              {loading ? (
                <>
                  <Clock size={16} className="spin-icon" /> Saving Repayment...
                </>
              ) : (
                <>
                  <Send size={16} /> Save Repayment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
