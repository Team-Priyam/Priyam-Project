import React, { useState, useEffect } from "react";
import LoanApplicationForm from "./components/LoanApplicationForm";
import LoginForm from "./components/LoginForm";
import { useAuth } from "./context/AuthContext";
import "./App.css";

function App() {
  const { user, isAuthenticated, loading: authLoading, login, logout } = useAuth();
  const [loginError, setLoginError] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  const [activeTab, setActiveTab] = useState("users"); // "users" | "loans" | "review"
  const [loans, setLoans] = useState([]);
  const [pendingLoans, setPendingLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
  });

  const [errors, setErrors] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({});
  const [notification, setNotification] = useState(null);

  const handleLoginSubmit = async (credentials) => {
    setIsSubmittingLogin(true);
    setLoginError("");
    const result = await login(credentials.email, credentials.password);
    setIsSubmittingLogin(false);
    if (!result.success) {
      setLoginError(result.message);
    }
  };



  // Fetch users, loans and pending loans on component mount
  useEffect(() => {
    fetchUsers();
    fetchLoans();
    fetchPendingLoans();
  }, []);


  // Clear notification alert after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        showNotification("error", "Failed to retrieve existing users list.");
      }
    } catch (err) {
      showNotification("error", "Could not connect to the backend server.");
    } finally {
      setLoading(false);
    }
  };

  const fetchLoans = async () => {
    try {
      const res = await fetch("/api/loans");
      if (res.ok) {
        const data = await res.json();
        setLoans(data.loans || []);
      } else {
        showNotification("error", "Failed to retrieve existing loan applications.");
      }
    } catch (err) {
      showNotification("error", "Could not connect to the backend server to fetch loans.");
    }
  };

  const fetchPendingLoans = async () => {
    try {
      const res = await fetch("/api/loans/pending");
      if (res.ok) {
        const data = await res.json();
        setPendingLoans(data.loans || []);
      } else {
        showNotification("error", "Failed to retrieve pending loan applications.");
      }
    } catch (err) {
      showNotification("error", "Could not connect to the backend server to fetch pending loans.");
    }
  };

  const handleReviewAction = async (id, action) => {
    if (!id) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/loans/${id}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note: reviewNote }),
      });

      const data = await res.json();

      if (res.ok) {
        showNotification("success", `Loan application has been successfully ${action}ed.`);
        setReviewNote("");
        setSelectedLoan(null);
        fetchLoans();
        fetchPendingLoans();
      } else {
        showNotification("error", data.message || `Failed to ${action} loan application.`);
      }
    } catch (err) {
      showNotification("error", `Connection failure while attempting to ${action} loan.`);
    } finally {
      setSubmittingReview(false);
    }
  };


  const showNotification = (type, text) => {
    setNotification({ type, text });
  };

  // Regular expression to validate standard emails
  const validateEmail = (emailStr) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  // Perform validation on a single field
  const validateField = (name, value) => {
    let error = "";
    if (name === "name") {
      if (!value.trim()) {
        error = "Full Name is required";
      } else if (value.trim().length < 2) {
        error = "Name must be at least 2 characters long";
      }
    } else if (name === "email") {
      if (!value.trim()) {
        error = "Email address is required";
      } else if (!validateEmail(value)) {
        error = "Please enter a valid email address";
      }
    } else if (name === "role") {
      if (!value) {
        error = "Please select a user role";
      }
    }
    return error;
  };

  // Handle change and update validation errors dynamically
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (touched[name]) {
      const fieldError = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: fieldError }));
    }
  };

  // Validate field on blur
  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const fieldError = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  // Validate the whole form before submitting
  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });
    setErrors(newErrors);
    // Mark all as touched so errors display immediately
    const allTouched = {};
    Object.keys(formData).forEach((field) => {
      allTouched[field] = true;
    });
    setTouched(allTouched);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit to add new user
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showNotification("error", "Please fix all validation errors before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const responseData = await response.json();

      if (response.ok) {
        showNotification("success", `User "${formData.name}" added successfully!`);
        // Reset form states
        setFormData({ name: "", email: "", role: "" });
        setErrors({});
        setTouched({});
        // Add new user to the top of list
        setUsers((prev) => [responseData, ...prev]);
      } else {
        showNotification("error", responseData.message || "Failed to add new user.");
      }
    } catch (err) {
      showNotification("error", "Error contacting the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle user deletion
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/users/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showNotification("success", `User "${name}" has been deleted.`);
        setUsers((prev) => prev.filter((user) => user._id !== id));
      } else {
        const errData = await response.json();
        showNotification("error", errData.message || "Failed to delete user.");
      }
    } catch (err) {
      showNotification("error", "Connection error. User could not be deleted.");
    }
  };

  // Helper to extract initials for user avatar
  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("");
  };

  // Compute stat metrics
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === "Admin").length;
  const managerCount = users.filter((u) => u.role === "Manager").length;

  // Compute loan stat metrics
  const totalLoans = loans.length;
  const totalLoanValue = loans.reduce((sum, loan) => sum + Number(loan.amount), 0);
  const avgTerm = loans.length > 0 ? (loans.reduce((sum, loan) => sum + Number(loan.term), 0) / loans.length).toFixed(1) : 0;

  const handleLoanSubmitSuccess = (newLoan) => {
    setLoans((prev) => [newLoan, ...prev]);
    showNotification("success", `Loan application for "${newLoan.borrower}" submitted successfully!`);
  };

  const handleDeleteLoan = async (id, borrower) => {
    if (!window.confirm(`Are you sure you want to delete the loan application for "${borrower}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/loans/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showNotification("success", `Loan application for "${borrower}" has been deleted.`);
        setLoans((prev) => prev.filter((l) => l._id !== id));
      } else {
        const data = await response.json();
        showNotification("error", data.message || "Failed to delete loan application.");
      }
    } catch (err) {
      showNotification("error", "Connection error. Loan application could not be deleted.");
    }
  };



  if (authLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#0f172a", color: "#ffffff" }}>
        <h3>Loading session...</h3>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLoginSubmit} serverError={loginError} isLoading={isSubmittingLogin} />;
  }

  return (
    <>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Village Microfinance Portal</h1>
          <p className="subtitle">Lender & Loan Officer Management Panel</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {user && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 600, color: "#ffffff" }}>{user.name}</div>
              <div style={{ fontSize: "0.8rem", color: "#34d399", textTransform: "capitalize" }}>{user.role}</div>
            </div>
          )}
          <button
            onClick={logout}
            style={{
              padding: "0.5rem 1rem",
              background: "rgba(239, 68, 68, 0.15)",
              color: "#fca5a5",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Tabs navigation */}
      <div className="navigation-tabs">
        <button
          className={`nav-tab-btn ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>Staff Directory</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === "loans" ? "active" : ""}`}
          onClick={() => setActiveTab("loans")}
        >
          <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Loan Applications</span>
        </button>
        <button
          className={`nav-tab-btn ${activeTab === "review" ? "active" : ""}`}
          onClick={() => setActiveTab("review")}
        >
          <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span>Review Center</span>
        </button>
      </div>

      {activeTab === "users" ? (
        /* Metrics Banner - Users */
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-val">{totalUsers}</span>
              <span className="stat-lbl">Active Accounts</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-val">{adminCount}</span>
              <span className="stat-lbl">Administrators</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-val">{managerCount}</span>
              <span className="stat-lbl">Managers</span>
            </div>
          </div>
        </div>
      ) : activeTab === "loans" ? (
        /* Metrics Banner - Loans */
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-val">{totalLoans}</span>
              <span className="stat-lbl">Total Applications</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16V5" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-val">${totalLoanValue.toLocaleString()}</span>
              <span className="stat-lbl">Total requested principal</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-val">{avgTerm} mo</span>
              <span className="stat-lbl">Average Term Length</span>
            </div>
          </div>
        </div>
      ) : (
        /* Metrics Banner - Review Center */
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-val">{pendingLoans.length}</span>
              <span className="stat-lbl">Pending Review</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-val">{loans.filter(l => l.status === "approved").length}</span>
              <span className="stat-lbl">Approved Applications</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-val">{loans.filter(l => l.status === "rejected").length}</span>
              <span className="stat-lbl">Rejected Applications</span>
            </div>
          </div>
        </div>
      )}

      {/* Global Notifications Alert Banner */}
      {notification && (
        <div className={`alert alert-${notification.type}`} role="alert">
          {notification.type === "success" ? (
            <svg className="alert-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="alert-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {activeTab === "users" ? (
        <main className="dashboard-grid">
          {/* Left Side: Create User Form Card */}
          <section className="glass-card">
            <h2 className="card-title">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Add New User
            </h2>

            <form onSubmit={handleSubmit} noValidate>
              {/* NAME FIELD */}
              <div className="form-group">
                <label htmlFor="name" className="form-label">Full Name</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-control ${touched.name && errors.name ? "is-invalid" : ""}`}
                    placeholder="e.g. Priyam Verma"
                    disabled={submitting}
                    required
                  />
                  <svg className="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                {touched.name && errors.name && (
                  <div className="error-message">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {errors.name}
                  </div>
                )}
              </div>

              {/* EMAIL FIELD */}
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-control ${touched.email && errors.email ? "is-invalid" : ""}`}
                    placeholder="e.g. name@company.com"
                    disabled={submitting}
                    required
                  />
                  <svg className="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                {touched.email && errors.email && (
                  <div className="error-message">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {errors.email}
                  </div>
                )}
              </div>

              {/* ROLE FIELD */}
              <div className="form-group">
                <label htmlFor="role" className="form-label">User Role</label>
                <div className="input-wrapper">
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-control ${touched.role && errors.role ? "is-invalid" : ""}`}
                    disabled={submitting}
                    required
                  >
                    <option value="" disabled>-- Select a Role --</option>
                    <option value="Admin">Admin (Full Access)</option>
                    <option value="Editor">Editor (Write Access)</option>
                    <option value="Manager">Manager (Resource Owner)</option>
                    <option value="Viewer">Viewer (Read Only)</option>
                  </select>
                  <svg className="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                {touched.role && errors.role && (
                  <div className="error-message">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {errors.role}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn-submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Register User
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Right Side: Active Users Directory */}
          <section className="glass-card">
            <div className="list-header">
              <h2 className="card-title">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                User Authorization Directory
              </h2>
              <span className="users-count">{users.length} Users</span>
            </div>

            {loading ? (
              <div className="global-loader">
                <span className="spinner"></span>
              </div>
            ) : users.length === 0 ? (
              <div className="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3>No accounts found</h3>
                <p>Add the first active user using the form configuration panel on the left.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>User Details</th>
                      <th>Selected Role</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id}>
                        <td>
                          <div className="user-name-cell">
                            <div className="user-avatar">
                              {getInitials(user.name)}
                            </div>
                            <div className="user-details">
                              <span style={{ fontWeight: 500 }}>{user.name}</span>
                              <span className="user-email">{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${user.role.toLowerCase()}`}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            onClick={() => handleDelete(user._id, user.name)}
                            className="btn-delete"
                            title="Delete User"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      ) : activeTab === "loans" ? (
        /* Loans Grid */
        <main className="dashboard-grid">
          {/* Left Side: Create Loan Application Card */}
          <section>
            <LoanApplicationForm
              onCancel={() => showNotification("info", "Form inputs cleared.")}
              onSubmitSuccess={handleLoanSubmitSuccess}
            />
          </section>

          {/* Right Side: Submitted Loan Applications Directory */}
          <section className="glass-card">
            <div className="list-header">
              <h2 className="card-title">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Loan Applications Directory
              </h2>
              <span className="users-count">{loans.length} Applications</span>
            </div>

            {loans.length === 0 ? (
              <div className="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3>No applications found</h3>
                <p>Submit the first loan application using the submission form on the left.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Borrower Details</th>
                      <th>Term</th>
                      <th>Purpose</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map((loan) => (
                      <tr key={loan._id}>
                        <td>
                          <div className="user-name-cell">
                            <div className="user-avatar" style={{ background: "linear-gradient(135deg, #10b981 0%, #6366f1 100%)" }}>
                              {loan.borrower.charAt(0).toUpperCase()}
                            </div>
                            <div className="user-details">
                              <span style={{ fontWeight: 500 }}>{loan.borrower}</span>
                              <span className="user-email">${Number(loan.amount).toLocaleString()}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{loan.term} months</span>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>{loan.createdAt}</div>
                        </td>
                        <td>
                          <span className={`badge badge-${loan.purpose}`}>
                            {loan.purpose === "agriculture"
                              ? "Agriculture"
                              : loan.purpose === "business"
                              ? "Business"
                              : loan.purpose === "education"
                              ? "Education"
                              : loan.purpose === "medical"
                              ? "Medical"
                              : loan.purpose === "housing"
                              ? "Housing"
                              : "Other"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${loan.status || 'pending'}`}>
                            {loan.status ? loan.status.charAt(0).toUpperCase() + loan.status.slice(1) : 'Pending'}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            onClick={() => handleDeleteLoan(loan._id, loan.borrower)}
                            className="btn-delete"
                            title="Delete Loan Application"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      ) : (
        /* Review Center Grid */
        <main className="dashboard-grid">
          {/* Left Side: Pending Applications List */}
          <section className="glass-card">
            <div className="list-header">
              <h2 className="card-title">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Pending Applications
              </h2>
              <span className="users-count">{pendingLoans.length} Loans</span>
            </div>

            {pendingLoans.length === 0 ? (
              <div className="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3>Queue is empty</h3>
                <p>All submitted applications have been reviewed.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Borrower Details</th>
                      <th>Requested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingLoans.map((loan) => (
                      <tr
                        key={loan._id}
                        onClick={() => {
                          setSelectedLoan(loan);
                          setReviewNote("");
                        }}
                        className={`pending-item ${selectedLoan?._id === loan._id ? "selected-card" : ""}`}
                        style={{ cursor: "pointer" }}
                      >
                        <td>
                          <div className="user-name-cell">
                            <div className="user-avatar" style={{ background: "linear-gradient(135deg, #10b981 0%, #6366f1 100%)" }}>
                              {loan.borrower.charAt(0).toUpperCase()}
                            </div>
                            <div className="user-details">
                              <span style={{ fontWeight: 500 }}>{loan.borrower}</span>
                              <span className="user-email" style={{ textTransform: "capitalize" }}>{loan.purpose}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>${Number(loan.amount).toLocaleString()}</span>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>{loan.term} months</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Right Side: Application Review Panel */}
          <section className="glass-card">
            {selectedLoan ? (
              <div>
                <h2 className="card-title">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Application Review Panel
                </h2>

                <div className="detail-row">
                  <span className="detail-label">Borrower Name</span>
                  <span className="detail-value">{selectedLoan.borrower}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Loan Amount</span>
                  <span className="detail-value">${Number(selectedLoan.amount).toLocaleString()}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Term Length</span>
                  <span className="detail-value">{selectedLoan.term} months</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Loan Purpose</span>
                  <span className="detail-value" style={{ textTransform: "capitalize" }}>{selectedLoan.purpose}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Current Status</span>
                  <span className="badge badge-pending">Pending Review</span>
                </div>

                <div style={{ marginTop: "1.5rem" }}>
                  <label htmlFor="reviewNote" className="form-label" style={{ fontWeight: 600 }}>
                    Review Notes / Audit Comments (Optional)
                  </label>
                  <textarea
                    id="reviewNote"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Specify authorization reason, risk assessments, or notes..."
                    className="review-notes-area"
                    disabled={submittingReview}
                  />
                </div>

                <div className="action-buttons-group">
                  <button
                    type="button"
                    className="btn-reject"
                    onClick={() => handleReviewAction(selectedLoan._id, "reject")}
                    disabled={submittingReview}
                  >
                    Reject Application
                  </button>
                  <button
                    type="button"
                    className="btn-approve"
                    onClick={() => handleReviewAction(selectedLoan._id, "approve")}
                    disabled={submittingReview}
                  >
                    Approve Application
                  </button>
                </div>

                {/* Audit Timeline */}
                {selectedLoan.statusHistory && selectedLoan.statusHistory.length > 0 && (
                  <div style={{ marginTop: "2rem", borderTop: "1px solid var(--border-color)", paddingTop: "1.5rem" }}>
                    <h4 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>Audit History Log</h4>
                    <div className="history-timeline">
                      {selectedLoan.statusHistory.map((history, idx) => (
                        <div key={idx} className={`timeline-item status-${history.status}`}>
                          <div className="timeline-header">
                            <span style={{ fontWeight: 600, color: history.status === "approved" ? "var(--success)" : history.status === "rejected" ? "var(--error)" : "var(--primary)" }}>
                              {history.action.toUpperCase()}
                            </span>
                            <span>{new Date(history.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="timeline-note">{history.note}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state" style={{ minHeight: "300px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <h3>No Application Selected</h3>
                <p>Select a pending loan application from the left to start the evaluation.</p>
              </div>
            )}
          </section>
        </main>
      )}
    </>
  );
}

export default App;
