import React, { useState } from "react";
import "./RegisterUserForm.css";

const RegisterUserForm = ({ onUserRegister }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "officer", // default role
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
  const [statusMessage, setStatusMessage] = useState("");

  // Validate form fields
  const validateForm = () => {
    const newErrors = {};
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters long";
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = "User role is required";
    } else if (!["admin", "lender", "officer"].includes(formData.role)) {
      newErrors.role = "Invalid user role selected";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear field-specific error as user types
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus(null);
    setStatusMessage("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (onUserRegister) {
        // If a registration callback is provided, invoke it
        await onUserRegister(formData);
        setSubmitStatus("success");
        setStatusMessage(`Successfully registered ${formData.name} as a new ${formData.role}.`);
        setFormData({
          name: "",
          email: "",
          role: "officer",
        });
      } else {
        // Mock fallback success state for testing/isolated execution
        await new Promise((resolve) => setTimeout(resolve, 800));
        setSubmitStatus("success");
        setStatusMessage(`[Demo Mode] Successfully registered ${formData.name} (${formData.email}) as ${formData.role}.`);
        setFormData({
          name: "",
          email: "",
          role: "officer",
        });
      }
    } catch (err) {
      setSubmitStatus("error");
      setStatusMessage(err.message || "Failed to register user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-form-card">
      <div className="form-header">
        <h2>Register New User</h2>
        <p className="form-subtitle">Create a new lender or loan officer account</p>
      </div>

      <form onSubmit={handleSubmit} className="register-form" noValidate>
        {/* Full Name Field */}
        <div className={`form-group ${errors.name ? "has-error" : ""}`}>
          <label htmlFor="name" className="form-label">
            Full Name <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. John Doe"
            disabled={isSubmitting}
            className="form-input"
            required
          />
          {errors.name && <span className="error-text">{errors.name}</span>}
        </div>

        {/* Email Address Field */}
        <div className={`form-group ${errors.email ? "has-error" : ""}`}>
          <label htmlFor="email" className="form-label">
            Email Address <span className="required-asterisk">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="e.g. john.doe@microfinance.org"
            disabled={isSubmitting}
            className="form-input"
            required
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>

        {/* Role Field */}
        <div className={`form-group ${errors.role ? "has-error" : ""}`}>
          <label htmlFor="role" className="form-label">
            User Role <span className="required-asterisk">*</span>
          </label>
          <div className="select-wrapper">
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              disabled={isSubmitting}
              className="form-select"
              required
            >
              <option value="officer">Loan Officer (Field Operations)</option>
              <option value="lender">Lender / Underwriter</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          {errors.role && <span className="error-text">{errors.role}</span>}
        </div>

        {/* Status Message Display */}
        {submitStatus && (
          <div className={`status-banner ${submitStatus === "success" ? "status-success" : "status-error"}`}>
            {submitStatus === "success" ? (
              <svg className="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            ) : (
              <svg className="status-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            )}
            <span className="status-message">{statusMessage}</span>
          </div>
        )}

        {/* Submit Button */}
        <button type="submit" className="submit-button" disabled={isSubmitting}>
          {isSubmitting ? (
            <div className="loader-container">
              <span className="spinner"></span>
              <span>Registering...</span>
            </div>
          ) : (
            "Create Account"
          )}
        </button>
      </form>
    </div>
  );
};

export default RegisterUserForm;
