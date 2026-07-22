import React, { useState, useEffect } from "react";
import LoanApplicationForm from "./components/LoanApplicationForm";
import BorrowerForm from "./components/BorrowerForm";
import LoanStatusTimeline from "./components/LoanStatusTimeline";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("borrowers"); // Default fallback tab
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [isBootstrapped, setIsBootstrapped] = useState(null); // null (checking), true, false
  const [authLoading, setAuthLoading] = useState(true);

  // Auth Form State
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState(""); // for bootstrapping admin
  const [authError, setAuthError] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // App Data States
  const [loans, setLoans] = useState([]);
  const [pendingLoans, setPendingLoans] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedLoanDetails, setSelectedLoanDetails] = useState(null);
  
  // App UI States
  const [reviewNote, setReviewNote] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({});
  const [notification, setNotification] = useState(null);

  // 1. Check if the system has users (bootstrapped) on initial mount
  useEffect(() => {
    const checkBootstrapStatus = async () => {
      try {
        const res = await fetch("/api/auth/check-bootstrap");
        if (res.ok) {
          const data = await res.json();
          setIsBootstrapped(data.bootstrapped);
        } else {
          setIsBootstrapped(true); // Fallback to login in case of check failure
        }
      } catch (err) {
        console.error("Failed to check bootstrap status", err);
        setIsBootstrapped(true);
      } finally {
        setAuthLoading(false);
      }
    };
    checkBootstrapStatus();
  }, []);

  // 2. Clear notification alert after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // 3. Dynamic active tab and resource loading when token/user changes
  useEffect(() => {
    if (token && currentUser) {
      // Direct user to their appropriate default tab
      if (currentUser.role === "admin") {
        setActiveTab("users");
        fetchUsers();
      } else if (currentUser.role === "lender") {
        setActiveTab("borrowers");
      } else if (currentUser.role === "officer") {
        setActiveTab("review");
      }

      // Fetch base platform data
      fetchLoans();
      fetchPendingLoans();
      fetchBorrowers();
    }
  }, [token, currentUser?.role]);

  // Real-time polling updates
  useEffect(() => {
    if (token) {
      const interval = setInterval(() => {
        fetchLoans();
        fetchPendingLoans();
      }, 5000); // poll every 5 seconds for real-time updates
      return () => clearInterval(interval);
    }
  }, [token]);

  // Sync selected loan details and selected review loan with updated list for real-time tracking
  useEffect(() => {
    if (loans.length > 0) {
      if (selectedLoanDetails) {
        const updatedDetails = loans.find((l) => l._id === selectedLoanDetails._id);
        if (updatedDetails) setSelectedLoanDetails(updatedDetails);
      }
      if (selectedLoan) {
        const updatedReview = loans.find((l) => l._id === selectedLoan._id);
        if (updatedReview) setSelectedLoan(updatedReview);
      }
    }
  }, [loans, selectedLoanDetails?._id, selectedLoan?._id]);


  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    
    if (!authEmail.trim() || !authPassword) {
      setAuthError("Please provide both email and password.");
      return;
    }

    setIsSubmittingAuth(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: authEmail.trim(),
          password: authPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.token);
        setCurrentUser(data.user);
        setAuthEmail("");
        setAuthPassword("");
        showNotification("success", `Secure access granted. Welcome, ${data.user.name}!`);
      } else {
        setAuthError(data.message || "Invalid credentials.");
      }
    } catch (err) {
      setAuthError("Could not connect to authentication services.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Bootstrap handler
  const handleBootstrap = async (e) => {
    e.preventDefault();
    setAuthError("");

    if (!authName.trim() || !authEmail.trim() || !authPassword) {
      setAuthError("Please specify a name, email address, and password.");
      return;
    }

    if (authPassword.length < 6) {
      setAuthError("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmittingAuth(true);
    try {
      const res = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: authName.trim(),
          email: authEmail.trim(),
          password: authPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showNotification("success", "First Administrator registered successfully! Please log in.");
        setIsBootstrapped(true);
        setAuthName("");
        setAuthPassword("");
      } else {
        setAuthError(data.message || "Bootstrapping failed.");
      }
    } catch (err) {
      setAuthError("Failed to initialize system administrator.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setCurrentUser(null);
    setLoans([]);
    setPendingLoans([]);
    setBorrowers([]);
    setUsers([]);
    setSelectedLoan(null);
    showNotification("info", "Secure logout completed successfully.");
  };

  // Resource fetching functions
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || data || []);
      } else {
        showNotification("error", "Failed to retrieve system users.");
      }
    } catch (err) {
      showNotification("error", "Connection error trying to fetch user directory.");
    } finally {
      setLoading(false);
    }
  };

  const fetchLoans = async () => {
    try {
      const res = await fetch("/api/loans", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setLoans(data.loans || []);
      }
    } catch (err) {
      showNotification("error", "Error connecting to backend for loan profiles.");
    }
  };

  const fetchPendingLoans = async () => {
    try {
      const res = await fetch("/api/loans/pending", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingLoans(data.loans || []);
      }
    } catch (err) {
      showNotification("error", "Error connecting to backend for pending applications.");
    }
  };

  const fetchBorrowers = async () => {
    try {
      const res = await fetch("/api/borrowers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBorrowers(data.borrowers || []);
      }
    } catch (err) {
      showNotification("error", "Could not connect to platform to retrieve borrowers.");
    }
  };

  // Actions handlers
  const handleReviewAction = async (id, action) => {
    if (!id) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/loans/${id}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
        showNotification("error", data.message || `Failed to evaluate loan application.`);
      }
    } catch (err) {
      showNotification("error", "Network timeout or failure assessing application.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const showNotification = (type, text) => {
    setNotification({ type, text });
  };

  const validateEmail = (emailStr) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (touched[name]) {
      const fieldError = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: fieldError }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const fieldError = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });
    setErrors(newErrors);
    const allTouched = {};
    Object.keys(formData).forEach((field) => {
      allTouched[field] = true;
    });
    setTouched(allTouched);
    return Object.keys(newErrors).length === 0;
  };

  // Add new user submit (Admin panel only)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showNotification("error", "Please fix all validation errors before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/users/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const responseData = await response.json();

      if (response.ok) {
        showNotification("success", `User "${formData.name}" added successfully! Check email onboarding info.`);
        setFormData({ name: "", email: "", role: "" });
        setErrors({});
        setTouched({});
        setUsers((prev) => [responseData.user || responseData, ...prev]);
      } else {
        showNotification("error", responseData.message || "Failed to add new user.");
      }
    } catch (err) {
      showNotification("error", "Error contacting the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Staff user delete
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        showNotification("success", `User "${name}" has been deleted.`);
        setUsers((prev) => prev.filter((user) => user._id !== id));
      } else {
        showNotification("error", data.message || "Failed to delete user.");
      }
    } catch (err) {
      showNotification("error", "Connection error. User could not be deleted.");
    }
  };

  const handleLoanSubmitSuccess = (newLoan) => {
    setLoans((prev) => [newLoan, ...prev]);
    showNotification("success", `Loan application for "${newLoan.borrower}" submitted successfully!`);
    fetchPendingLoans();
  };

  const handleDeleteLoan = async (id, borrower) => {
    if (!window.confirm(`Are you sure you want to delete the loan application for "${borrower}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/loans/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        showNotification("success", `Loan application for "${borrower}" has been deleted.`);
        setLoans((prev) => prev.filter((l) => l._id !== id));
        fetchPendingLoans();
      } else {
        const data = await response.json();
        showNotification("error", data.message || "Failed to delete loan application.");
      }
    } catch (err) {
      showNotification("error", "Connection error. Loan application could not be deleted.");
    }
  };

  const handleBorrowerSubmitSuccess = (newBorrower) => {
    setBorrowers((prev) => [newBorrower, ...prev]);
    showNotification("success", `Borrower Profile registered: "${newBorrower.name}"`);
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("");
  };

  // Metrics calculators
  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role?.toLowerCase() === "admin").length;
  const lenderCount = users.filter((u) => u.role?.toLowerCase() === "lender").length;
  const officerCount = users.filter((u) => u.role?.toLowerCase() === "officer").length;

  const totalLoans = loans.length;
  const totalLoanValue = loans.reduce((sum, loan) => sum + Number(loan.amount), 0);
  const avgTerm = loans.length > 0 ? (loans.reduce((sum, loan) => sum + Number(loan.term), 0) / loans.length).toFixed(1) : 0;

  // Render auth loading spinner
  if (authLoading) {
    return (
      <div className="global-loader" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <span className="spinner"></span>
      </div>
    );
  }

  // Render bootstrap configuration screen if db is empty
  if (isBootstrapped === false) {
    return (
      <div className="auth-container">
        <div className="glass-card auth-card">
          <div className="auth-header">
            <h2>Initialize Platform</h2>
            <p>Create the primary system Administrator account to begin setup.</p>
          </div>
          
          {authError && (
            <div className="auth-error-banner">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleBootstrap} noValidate>
            <div className="form-group">
              <label htmlFor="authName" className="form-label">Full Name</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="authName"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="form-control"
                  placeholder="e.g. Priyam Verma"
                  required
                />
                <svg className="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="authEmail" className="form-label">Email Address</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="authEmail"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="form-control"
                  placeholder="name@company.com"
                  required
                />
                <svg className="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="authPassword" className="form-label">Password</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  id="authPassword"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="form-control"
                  placeholder="Minimum 6 characters"
                  required
                />
                <svg className="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={isSubmittingAuth} style={{ marginTop: "1rem" }}>
              {isSubmittingAuth ? "Bootstrapping..." : "Bootstrap System Admin"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render Login Screen if not authenticated
  if (!token || !currentUser) {
    return (
      <div className="auth-container">
        <div className="glass-card auth-card">
          <div className="auth-header">
            <h2>Authorized Access Only</h2>
            <p>Log in with your microfinance staff credentials to manage applications.</p>
          </div>

          {authError && (
            <div className="auth-error-banner">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{authError}</span>
            </div>
          )}

          {notification && (
            <div className={`alert alert-${notification.type}`} role="alert" style={{ marginBottom: "1.5rem" }}>
              <span>{notification.text}</span>
            </div>
          )}

          <form onSubmit={handleLogin} noValidate>
            <div className="form-group">
              <label htmlFor="authEmail" className="form-label">Email Address</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="authEmail"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="form-control"
                  placeholder="name@company.com"
                  required
                />
                <svg className="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="authPassword" className="form-label">Password</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  id="authPassword"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="form-control"
                  placeholder="Enter secure password"
                  required
                />
                <svg className="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={isSubmittingAuth} style={{ marginTop: "1rem" }}>
              {isSubmittingAuth ? "Signing in..." : "Secure Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated View
  return (
    <>
      <header className="app-header">
        <div>
          <h1>Village Microfinance Portal</h1>
          <p className="subtitle" style={{ margin: 0 }}>
            Active Session: <strong style={{ color: "var(--primary)" }}>{currentUser.name}</strong> ({currentUser.role.toUpperCase()})
          </p>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Secure Logout</span>
        </button>
      </header>

      {/* Dynamic Tabs navigation by Role */}
      <div className="navigation-tabs">
        {currentUser.role === "admin" && (
          <button
            className={`nav-tab-btn ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Staff Directory</span>
          </button>
        )}
        {(currentUser.role === "admin" || currentUser.role === "lender" || currentUser.role === "officer") && (
          <button
            className={`nav-tab-btn ${activeTab === "borrowers" ? "active" : ""}`}
            onClick={() => setActiveTab("borrowers")}
          >
            <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Borrower Profiles</span>
          </button>
        )}
        {(currentUser.role === "admin" || currentUser.role === "lender") && (
          <button
            className={`nav-tab-btn ${activeTab === "loans" ? "active" : ""}`}
            onClick={() => setActiveTab("loans")}
          >
            <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Loan Applications</span>
          </button>
        )}
        {(currentUser.role === "admin" || currentUser.role === "officer") && (
          <button
            className={`nav-tab-btn ${activeTab === "review" ? "active" : ""}`}
            onClick={() => setActiveTab("review")}
          >
            <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span>Review Center</span>
          </button>
        )}
      </div>

      {/* Metrics Banner */}
      {activeTab === "users" && currentUser.role === "admin" ? (
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
              <span className="stat-val">{lenderCount}</span>
              <span className="stat-lbl">Lenders</span>
            </div>
          </div>
        </div>
      ) : activeTab === "borrowers" ? (
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-val">{borrowers.length}</span>
              <span className="stat-lbl">Total Borrowers</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-val">{borrowers.filter(b => b.idProof?.type === "Aadhaar Card").length}</span>
              <span className="stat-lbl">Aadhaar Profiles</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="24" height="24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-val">{borrowers.filter(b => b.idProof?.type === "PAN Card").length}</span>
              <span className="stat-lbl">PAN Profiles</span>
            </div>
          </div>
        </div>
      ) : activeTab === "loans" ? (
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

      {/* Panels rendering depending on Active Tab */}
      {activeTab === "users" && currentUser.role === "admin" ? (
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
                    <option value="admin">Admin (Full Access)</option>
                    <option value="lender">Lender (Create Borrowers/Loans)</option>
                    <option value="officer">Loan Officer (Evaluations)</option>
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
                      <th style={{ textalign: "right" }}>Actions</th>
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
                          <span className={`badge badge-${user.role?.toLowerCase()}`}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ textalign: "right" }}>
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
      ) : activeTab === "borrowers" && (currentUser.role === "admin" || currentUser.role === "lender" || currentUser.role === "officer") ? (
        /* Borrowers Profiles Grid */
        <main className="dashboard-grid">
          {/* Left Side: Create Borrower Form Card */}
          <section>
            {currentUser.role === "admin" || currentUser.role === "lender" ? (
              <BorrowerForm
                token={token}
                onCancel={() => showNotification("info", "Form inputs cleared.")}
                onSubmitSuccess={handleBorrowerSubmitSuccess}
              />
            ) : (
              <div className="glass-card text-center" style={{ padding: "3.5rem 2rem" }}>
                <svg className="status-icon text-center" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: "48px", height: "48px", color: "var(--primary)", margin: "0 auto 1.5rem", display: "block" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem" }}>Registering Restricted</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>Only administrators and lenders have privileges to register new borrower profiles.</p>
              </div>
            )}
          </section>

          {/* Right Side: Registered Borrower Profiles Directory */}
          <section className="glass-card">
            <div className="list-header">
              <h2 className="card-title">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Borrower Directory
              </h2>
              <span className="users-count">{borrowers.length} Borrowers</span>
            </div>

            {borrowers.length === 0 ? (
              <div className="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3>No borrowers found</h3>
                <p>Register the first borrower profile using the configuration panel on the left.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Borrower Details</th>
                      <th>Identification Proof</th>
                      <th>Residential Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {borrowers.map((borrower) => (
                      <tr key={borrower._id}>
                        <td>
                          <div className="user-name-cell">
                            <div className="user-avatar" style={{ background: "linear-gradient(135deg, #10b981 0%, #6366f1 100%)" }}>
                              {borrower.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="user-details">
                              <span style={{ fontWeight: 500 }}>{borrower.name}</span>
                              <span className="user-email">Mobile: {borrower.contact}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{borrower.idProof?.type}</span>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            No: <span style={{ fontFamily: "monospace", letterSpacing: "1px" }}>{borrower.idProof?.number}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={borrower.address}>
                          {borrower.address}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      ) : activeTab === "loans" && (currentUser.role === "admin" || currentUser.role === "lender") ? (
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
                      <th style={{ textalign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map((loan) => (
                      <tr 
                        key={loan._id}
                        onClick={() => setSelectedLoanDetails(loan)}
                        style={{ cursor: "pointer" }}
                        title="Click to view visual status timeline"
                      >
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
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            {loan.createdAt ? new Date(loan.createdAt).toLocaleDateString() : ""}
                          </div>
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
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLoanDetails(loan);
                            }}
                            className="btn-view-timeline"
                            title="View Visual Status Timeline & Details"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "0.4rem 0.75rem",
                              borderRadius: "8px",
                              border: "1px solid rgba(99, 102, 241, 0.3)",
                              background: "rgba(99, 102, 241, 0.12)",
                              color: "#a5b4fc",
                              fontSize: "0.8rem",
                              fontWeight: 500,
                              cursor: "pointer",
                              marginRight: "0.5rem",
                              transition: "all 0.2s ease"
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Timeline
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLoan(loan._id, loan.borrower);
                            }}
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
      ) : activeTab === "review" && (currentUser.role === "admin" || currentUser.role === "officer") ? (
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
                  <span className={`badge badge-${selectedLoan.status || 'pending'}`}>
                    {selectedLoan.status ? selectedLoan.status.charAt(0).toUpperCase() + selectedLoan.status.slice(1) : 'Pending Review'}
                  </span>
                </div>

                {/* Visual Progress Timeline */}
                <div style={{ marginTop: "1.25rem", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border-color)", borderRadius: "16px", padding: "1rem 0.5rem" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem", paddingLeft: "1rem" }}>
                    Visual Application Progress
                  </div>
                  <LoanStatusTimeline loan={selectedLoan} />
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
      ) : (
        /* Unauthorized view or invalid tab for the role */
        <div className="glass-card text-center" style={{ padding: "5rem 2rem" }}>
          <svg className="status-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ width: "64px", height: "64px", color: "var(--error)", margin: "0 auto 1.5rem", display: "block" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2>Access Denied</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>You do not have permission to view this panel. Please switch to an authorized tab.</p>
        </div>
      )}

      {/* Detailed Loan Timeline Modal */}
      {selectedLoanDetails && (
        <div className="modal-backdrop" onClick={() => setSelectedLoanDetails(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedLoanDetails(null)}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem", color: "var(--text-primary)" }}>
              Loan Progress Tracker
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Real-time status tracking for borrower application
            </p>

            {/* Visual Progress Timeline */}
            <LoanStatusTimeline loan={selectedLoanDetails} />

            {/* Detailed parameters */}
            <div className="loan-details-grid">
              <div className="detail-item">
                <span className="detail-item-lbl">Borrower Name</span>
                <span className="detail-item-val">{selectedLoanDetails.borrower}</span>
              </div>
              <div className="detail-item">
                <span className="detail-item-lbl">Requested Principal</span>
                <span className="detail-item-val" style={{ color: "var(--primary)" }}>
                  ${Number(selectedLoanDetails.amount).toLocaleString()}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-item-lbl">Amortization Period</span>
                <span className="detail-item-val">{selectedLoanDetails.term} Months</span>
              </div>
              <div className="detail-item">
                <span className="detail-item-lbl">Loan Purpose / Code</span>
                <span className="detail-item-val" style={{ textTransform: "capitalize" }}>
                  {selectedLoanDetails.purpose}
                </span>
              </div>
            </div>

            {/* Audit timeline details */}
            {selectedLoanDetails.statusHistory && selectedLoanDetails.statusHistory.length > 0 && (
              <div style={{ marginTop: "2rem" }}>
                <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "1rem" }}>
                  Audit History Log
                </h4>
                <div className="history-timeline" style={{ maxHeight: "200px", overflowY: "auto", paddingRight: "0.5rem" }}>
                  {selectedLoanDetails.statusHistory.map((history, idx) => (
                    <div key={idx} className={`timeline-item status-${history.status}`}>
                      <div className="timeline-header">
                        <span style={{ fontWeight: 600, color: history.status === "approved" ? "var(--success)" : history.status === "rejected" ? "var(--error)" : "var(--primary)", fontSize: "0.85rem" }}>
                          {history.action.toUpperCase()}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {new Date(history.timestamp).toLocaleString()} • {history.user}
                        </span>
                      </div>
                      <div className="timeline-note" style={{ fontSize: "0.825rem", marginTop: "4px" }}>
                        {history.note}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
