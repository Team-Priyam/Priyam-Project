import React, { useState } from "react";
import "./LoginForm.css";

const LoginForm = ({ onLogin, serverError, isLoading }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Validate single field or full form
  const validate = (data = formData) => {
    const newErrors = {};

    // Email validation
    if (!data.email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    // Password validation
    if (!data.password) {
      newErrors.password = "Password is required.";
    } else if (data.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedForm = { ...formData, [name]: value };
    setFormData(updatedForm);

    // Dynamic field error update if field has been touched
    if (touched[name]) {
      const fieldErrors = validate(updatedForm);
      setErrors((prev) => ({
        ...prev,
        [name]: fieldErrors[name] || "",
      }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const currentErrors = validate();
    setErrors((prev) => ({
      ...prev,
      [name]: currentErrors[name] || "",
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ email: true, password: true });

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      if (onLogin) {
        onLogin({ email: formData.email.trim(), password: formData.password });
      }
    }
  };

  return (
    <div className="login-card-container">
      <div className="login-card">
        <div className="login-header">
          <span className="login-badge">Microfinance Portal</span>
          <h2>Lender Sign In</h2>
          <p>Enter your credentials to access the village loan portal</p>
          <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.75rem", background: "rgba(99, 102, 241, 0.12)", border: "1px solid rgba(99, 102, 241, 0.25)", borderRadius: "8px", fontSize: "0.8rem", color: "#a5b4fc" }}>
            🔑 <strong>Demo Credentials (.env):</strong><br />
            Email: <code>admin@microfinance.org</code><br />
            Password: <code>Admin123Pass!</code>
          </div>
        </div>

        {serverError && (
          <div className="server-error-alert" role="alert">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{serverError}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <input
                id="email"
                name="email"
                type="email"
                placeholder="lender@microfinance.org"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`input-field ${errors.email && touched.email ? "has-error" : ""}`}
                aria-invalid={!!(errors.email && touched.email)}
                aria-describedby={errors.email && touched.email ? "email-error" : undefined}
                disabled={isLoading}
                required
              />
            </div>
            {errors.email && touched.email && (
              <span className="field-error-message" id="email-error">
                {errors.email}
              </span>
            )}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`input-field ${errors.password && touched.password ? "has-error" : ""}`}
                aria-invalid={!!(errors.password && touched.password)}
                aria-describedby={errors.password && touched.password ? "password-error" : undefined}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && touched.password && (
              <span className="field-error-message" id="password-error">
                {errors.password}
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="spinner" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
