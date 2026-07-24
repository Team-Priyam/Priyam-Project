import React, { useState } from "react";
import {
  IndianRupee,
  Calendar,
  CreditCard,
  FileText,
  X,
  CheckCircle2,
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
  const [validationError, setValidationError] = useState("");

  if (!isOpen) return null;

  const handleAmountChange = (e) => {
    const val = e.target.value;
    setAmount(val);
    if (validationError) setValidationError("");
  };

  const handleDateChange = (e) => {
    setDate(e.target.value);
    if (validationError) setValidationError("");
  };

  const handleMethodChange = (e) => {
    setPaymentMethod(e.target.value);
    if (validationError) setValidationError("");
  };

  const validateForm = () => {
    const numericAmount = parseFloat(amount);

    if (!amount || isNaN(numericAmount)) {
      setValidationError("Repayment amount is required.");
      return false;
    }

    if (numericAmount <= 0) {
      setValidationError("Repayment amount must be greater than ₹0.");
      return false;
    }

    if (numericAmount > currentBalance && currentBalance > 0) {
      setValidationError(
        `Repayment amount (₹${numericAmount.toLocaleString("en-IN")}) exceeds the remaining balance (₹${currentBalance.toLocaleString("en-IN")}).`
      );
      return false;
    }

    if (!date) {
      setValidationError("Collection date is required.");
      return false;
    }

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (selectedDate > today) {
      setValidationError("Collection date cannot be in the future.");
      return false;
    }

    if (!paymentMethod) {
      setValidationError("Please select a payment method.");
      return false;
    }

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

        {/* Inline Error Message */}
        {validationError && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{validationError}</span>
          </div>
        )}

        {/* Repayment Input Form */}
        <form onSubmit={handleSubmit} className="repayment-form">
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
                  step="1"
                  min="1"
                  max={currentBalance || undefined}
                  className="form-input"
                  placeholder="e.g. 2500"
                  value={amount}
                  onChange={handleAmountChange}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  className="quick-fill-btn"
                  onClick={() => {
                    setAmount(currentBalance.toString());
                    setValidationError("");
                  }}
                  title="Pay Full Balance"
                >
                  Pay Full
                </button>
              </div>
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
                  className="form-input"
                  value={date}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={handleDateChange}
                  required
                />
              </div>
            </div>

            {/* Input 3: Payment Method Dropdown */}
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="payment-method" className="form-label">
                <CreditCard size={15} color="var(--accent-primary)" /> Payment Method *
              </label>
              <select
                id="payment-method"
                className="form-input form-select"
                value={paymentMethod}
                onChange={handleMethodChange}
                required
              >
                <option value="Cash (Field Collection)">Cash (Field Collection)</option>
                <option value="UPI Collection">UPI Collection (PhonePe / GPay / Paytm)</option>
                <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
                <option value="Cheque">Cheque Deposit</option>
              </select>
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
              disabled={loading}
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
