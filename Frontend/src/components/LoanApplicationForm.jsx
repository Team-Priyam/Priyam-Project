import React, { useState } from "react";
import "./LoanApplicationForm.css";

const LoanApplicationForm = ({ onCancel, onSubmitSuccess }) => {
  const [formData, setFormData] = useState({
    borrower: "",
    amount: "",
    term: "",
    purpose: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  const [statusMessage, setStatusMessage] = useState("");

  const loanPurposes = [
    { value: "", label: "-- Select a Purpose --" },
    { value: "agriculture", label: "Agriculture & Farming" },
    { value: "business", label: "Business Start-up / Expansion" },
    { value: "education", label: "Education / Tuition" },
    { value: "medical", label: "Medical Expenses" },
    { value: "housing", label: "Home Construction / Repair" },
    { value: "other", label: "Other / Personal Use" },
  ];

  // Validate inputs
  const validateField = (name, value) => {
    let error = "";
    const strVal = value !== null && value !== undefined ? String(value).trim() : "";
    
    switch (name) {
      case "borrower":
        if (!strVal) {
          error = "Borrower name is required";
        } else if (strVal.length < 3) {
          error = "Borrower name must be at least 3 characters long";
        }
        break;
      case "amount":
        if (!strVal) {
          error = "Loan amount is required";
        } else {
          const numAmount = Number(strVal);
          if (isNaN(numAmount)) {
            error = "Amount must be a numeric value";
          } else if (numAmount <= 0) {
            error = "Amount must be greater than 0";
          } else if (numAmount > 1000000) {
            error = "Amount cannot exceed 1,000,000";
          }
        }
        break;
      case "term":
        if (!strVal) {
          error = "Loan term is required";
        } else {
          const numTerm = Number(strVal);
          if (isNaN(numTerm)) {
            error = "Term must be a numeric value";
          } else if (!Number.isInteger(numTerm) || numTerm <= 0) {
            error = "Term must be a positive whole number of months";
          } else if (numTerm > 120) {
            error = "Term cannot exceed 120 months (10 years)";
          }
        }
        break;
      case "purpose":
        if (!strVal) {
          error = "Please select a loan purpose";
        }
        break;
      default:
        break;
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Perform validation on change if there's an existing error
    if (errors[name]) {
      const fieldError = validateField(name, value);
      setErrors((prev) => ({
        ...prev,
        [name]: fieldError,
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const fieldError = validateField(name, value);
    setErrors((prev) => ({
      ...prev,
      [name]: fieldError,
    }));
  };

  const handleCancelClick = () => {
    // Reset form and errors
    setFormData({
      borrower: "",
      amount: "",
      term: "",
      purpose: "",
    });
    setErrors({});
    setSubmitStatus(null);
    setStatusMessage("");
    if (onCancel) {
      onCancel();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus(null);
    setStatusMessage("");

    // Validate all fields
    const formErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) {
        formErrors[key] = error;
      }
    });

    setErrors(formErrors);

    // If errors exist, stop submission
    if (Object.keys(formErrors).length > 0) {
      setSubmitStatus("error");
      setStatusMessage("Please fix all validation errors before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/loans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          borrower: formData.borrower,
          amount: Number(formData.amount),
          term: Number(formData.term),
          purpose: formData.purpose,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success confirmation state
        setSubmitStatus("success");
        setStatusMessage(`Loan application for "${formData.borrower}" has been successfully submitted!`);
        
        // Reset form input values
        setFormData({
          borrower: "",
          amount: "",
          term: "",
          purpose: "",
        });
        setErrors({});

        if (onSubmitSuccess) {
          onSubmitSuccess(data.loan);
        }
      } else {
        setSubmitStatus("error");
        setStatusMessage(data.message || "Failed to submit loan application.");
      }
    } catch (err) {
      setSubmitStatus("error");
      setStatusMessage("Could not connect to the backend server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }

  };

  return (
    <div className="loan-form-card">
      <div className="form-header">
        <h2>Submit Loan Application</h2>
        <p className="form-subtitle">Capture borrower info, loan principal, term length, and purpose</p>
      </div>

      <form onSubmit={handleSubmit} className="loan-form" noValidate>
        {/* Borrower Name Field */}
        <div className={`form-group ${errors.borrower ? "has-error" : ""}`}>
          <label htmlFor="borrower" className="form-label">
            Borrower Name <span className="required-asterisk">*</span>
          </label>
          <div className="input-wrapper">
            <input
              type="text"
              id="borrower"
              name="borrower"
              value={formData.borrower}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. Aditi Sharma"
              disabled={isSubmitting}
              className="form-input"
              required
            />
            <svg className="field-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          {errors.borrower && <span className="error-text">{errors.borrower}</span>}
        </div>

        {/* Loan Amount Field */}
        <div className={`form-group ${errors.amount ? "has-error" : ""}`}>
          <label htmlFor="amount" className="form-label">
            Loan Amount ($) <span className="required-asterisk">*</span>
          </label>
          <div className="input-wrapper">
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. 5000"
              disabled={isSubmitting}
              className="form-input"
              min="1"
              required
            />
            <span className="currency-symbol">$</span>
          </div>
          {errors.amount && <span className="error-text">{errors.amount}</span>}
        </div>

        {/* Loan Term Field */}
        <div className={`form-group ${errors.term ? "has-error" : ""}`}>
          <label htmlFor="term" className="form-label">
            Term Length (Months) <span className="required-asterisk">*</span>
          </label>
          <div className="input-wrapper">
            <input
              type="number"
              id="term"
              name="term"
              value={formData.term}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="e.g. 12"
              disabled={isSubmitting}
              className="form-input"
              min="1"
              step="1"
              required
            />
            <svg className="field-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          {errors.term && <span className="error-text">{errors.term}</span>}
        </div>

        {/* Loan Purpose Field */}
        <div className={`form-group ${errors.purpose ? "has-error" : ""}`}>
          <label htmlFor="purpose" className="form-label">
            Loan Purpose <span className="required-asterisk">*</span>
          </label>
          <div className="select-wrapper">
            <select
              id="purpose"
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
              className="form-select"
              required
            >
              {loanPurposes.map((p) => (
                <option key={p.value} value={p.value} disabled={p.value === ""}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {errors.purpose && <span className="error-text">{errors.purpose}</span>}
        </div>

        {/* Status Notifications Panel */}
        {submitStatus && (
          <div className={`form-status-banner status-${submitStatus}`}>
            {submitStatus === "success" ? (
              <svg className="status-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="status-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            <span className="status-text">{statusMessage}</span>
          </div>
        )}

        {/* Actions Button Group */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={handleCancelClick}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <div className="btn-loader">
                <span className="spinner"></span>
                <span>Submitting...</span>
              </div>
            ) : (
              <>
                <svg className="btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Submit Application</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoanApplicationForm;
