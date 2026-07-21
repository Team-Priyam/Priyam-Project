import React, { useState } from "react";
import "./BorrowerForm.css";

const BorrowerForm = ({ onCancel, onSubmitSuccess, token }) => {
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    address: "",
    idType: "Aadhaar Card",
    idNumber: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  const [statusMessage, setStatusMessage] = useState("");

  const idTypes = [
    "Aadhaar Card",
    "Voter ID",
    "PAN Card",
    "Ration Card",
    "Driving License",
  ];

  // Helper validation logic
  const validateField = (name, value) => {
    let error = "";

    switch (name) {
      case "name":
        if (!value.trim()) {
          error = "Full Name is required";
        } else if (value.trim().length < 3) {
          error = "Name must be at least 3 characters long";
        } else if (!/^[a-zA-Z\s.]+$/.test(value)) {
          error = "Name should contain only letters, spaces, or dots";
        }
        break;
      case "contact":
        if (!value.trim()) {
          error = "Contact number is required";
        } else {
          // Rural microfinance standard: Check for 10-digit mobile phone
          const phoneRegex = /^[6-9]\d{9}$/;
          if (!phoneRegex.test(value.trim())) {
            error = "Enter a valid 10-digit mobile number starting with 6-9";
          }
        }
        break;
      case "address":
        if (!value.trim()) {
          error = "Residential address is required";
        } else if (value.trim().length < 8) {
          error = "Please enter a detailed address (at least 8 characters)";
        }
        break;
      case "idNumber":
        if (!value.trim()) {
          error = "ID Proof number is required";
        } else {
          // Specific validation rules depending on type selected
          const currentIdType = formData.idType;
          if (currentIdType === "Aadhaar Card") {
            // Aadhaar is 12 digits
            if (!/^\d{12}$/.test(value.trim())) {
              error = "Aadhaar Card number must be exactly 12 digits";
            }
          } else if (currentIdType === "PAN Card") {
            // PAN format: 5 letters, 4 numbers, 1 letter
            if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(value.trim())) {
              error = "Invalid PAN Card format (e.g. ABCDE1234F)";
            }
          } else {
            // Default check
            if (value.trim().length < 5) {
              error = "ID Card number must be at least 5 characters long";
            }
          }
        }
        break;
      default:
        break;
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-update other fields if idType changes
    const updatedForm = { ...formData, [name]: value };
    
    // Clear idNumber error if ID Type changes, as validation rules differ
    if (name === "idType") {
      updatedForm.idNumber = "";
      setErrors((prev) => ({ ...prev, idNumber: "" }));
    }

    setFormData(updatedForm);

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
    setFormData({
      name: "",
      contact: "",
      address: "",
      idType: "Aadhaar Card",
      idNumber: "",
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

    // Validate all fields before submitting
    const formErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) {
        formErrors[key] = error;
      }
    });

    setErrors(formErrors);

    if (Object.keys(formErrors).length > 0) {
      setSubmitStatus("error");
      setStatusMessage("Please fix all form validation errors before saving.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Assemble structured data
      const payload = {
        name: formData.name.trim(),
        contact: formData.contact.trim(),
        address: formData.address.trim(),
        idProof: {
          type: formData.idType,
          number: formData.idNumber.toUpperCase().trim(),
        },
      };

      const response = await fetch("/api/borrowers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus("success");
        setStatusMessage(`Borrower profile for "${formData.name}" has been registered successfully!`);
        
        // Reset state
        setFormData({
          name: "",
          contact: "",
          address: "",
          idType: "Aadhaar Card",
          idNumber: "",
        });
        setErrors({});

        if (onSubmitSuccess) {
          // Delay briefly to show visual success state before navigating or updating
          setTimeout(() => {
            onSubmitSuccess(data.borrower);
          }, 1500);
        }
      } else {
        setSubmitStatus("error");
        setStatusMessage(data.message || "Failed to save borrower profile.");
      }
    } catch (err) {
      setSubmitStatus("error");
      setStatusMessage("Network error: Could not reach the microfinance API server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="borrower-form-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "350px", textAlign: "center", padding: "2rem" }}>
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: "48px", height: "48px", color: "var(--error)", marginBottom: "1rem" }} xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--text-primary)" }}>Session Expired or Unauthorized</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
          Please sign in to access the borrower registration form.
        </p>
      </div>
    );
  }

  return (
    <div className="borrower-form-card">
      <div className="form-header">
        <h2>Register New Borrower</h2>
        <p className="form-subtitle">
          Record essential demographic details and verified identification for new applicants.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="borrower-form" noValidate>
        {/* Full Name Field */}
        <div className={`form-group ${errors.name ? "has-error" : ""}`}>
          <label htmlFor="name" className="form-label">
            Full Name <span className="required-asterisk">*</span>
          </label>
          <div className="input-wrapper">
            <input
              type="text"
              id="name"
              name="name"
              className="form-input"
              placeholder="e.g. Ramesh Kumar"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
              autoComplete="off"
            />
            <svg
              className="field-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          {errors.name && (
            <span className="error-text">
              <svg
                className="error-icon"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {errors.name}
            </span>
          )}
        </div>

        {/* Contact Mobile Number Field */}
        <div className={`form-group ${errors.contact ? "has-error" : ""}`}>
          <label htmlFor="contact" className="form-label">
            Mobile Number <span className="required-asterisk">*</span>
          </label>
          <div className="input-wrapper">
            <input
              type="tel"
              id="contact"
              name="contact"
              className="form-input"
              placeholder="10-digit mobile number (e.g. 9876543210)"
              value={formData.contact}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
              maxLength={10}
            />
            <svg
              className="field-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </div>
          {errors.contact && (
            <span className="error-text">
              <svg
                className="error-icon"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {errors.contact}
            </span>
          )}
        </div>

        {/* Address Field */}
        <div className={`form-group ${errors.address ? "has-error" : ""}`}>
          <label htmlFor="address" className="form-label">
            Residential Address <span className="required-asterisk">*</span>
          </label>
          <div className="input-wrapper">
            <textarea
              id="address"
              name="address"
              className="form-input form-textarea"
              placeholder="Village, Post Office, Block, District, State"
              value={formData.address}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
              rows={3}
            />
            <svg
              className="field-icon textarea-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          {errors.address && (
            <span className="error-text">
              <svg
                className="error-icon"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {errors.address}
            </span>
          )}
        </div>

        {/* Identification Section */}
        <div className="id-proof-section">
          {/* ID Type Select */}
          <div className="form-group">
            <label htmlFor="idType" className="form-label">
              ID Proof Type <span className="required-asterisk">*</span>
            </label>
            <div className="input-wrapper">
              <select
                id="idType"
                name="idType"
                className="form-select"
                value={formData.idType}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                {idTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ID Card Number Input */}
          <div className={`form-group ${errors.idNumber ? "has-error" : ""}`}>
            <label htmlFor="idNumber" className="form-label">
              ID Proof Number <span className="required-asterisk">*</span>
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                id="idNumber"
                name="idNumber"
                className="form-input uppercase-input"
                placeholder={
                  formData.idType === "Aadhaar Card"
                    ? "12-digit number (e.g. 123456789012)"
                    : formData.idType === "PAN Card"
                    ? "10-digit Alphanumeric (e.g. ABCDE1234F)"
                    : "Enter ID Card number"
                }
                value={formData.idNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSubmitting}
                autoComplete="off"
              />
              <svg
                className="field-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                />
              </svg>
            </div>
            {errors.idNumber && (
              <span className="error-text">
                <svg
                  className="error-icon"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {errors.idNumber}
              </span>
            )}
          </div>
        </div>

        {/* Global Submission Status Banner */}
        {submitStatus && (
          <div
            className={`form-status-banner ${
              submitStatus === "success" ? "status-success" : "status-error"
            }`}
          >
            {submitStatus === "success" ? (
              <svg
                className="status-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="status-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Actions Button Grid */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={handleCancelClick}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="btn-loader">
                <span className="spinner"></span>
                Saving...
              </div>
            ) : (
              "Register Borrower"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BorrowerForm;
