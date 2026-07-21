import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import "./BorrowerDirectory.css";

const BorrowerDirectory = () => {
  const { token, logout } = useAuth();

  const [borrowers, setBorrowers] = useState([]);
  const [villages, setVillages] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedVillage, setSelectedVillage] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // "table" | "card"

  // Modal state for adding a new borrower
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBorrower, setNewBorrower] = useState({
    name: "",
    village: "",
    contactNumber: "",
    occupation: "Farmer",
    aadhaarNumber: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Fetch village options for filter dropdown
  const fetchVillages = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/borrowers/villages", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setVillages(data.villages || []);
      }
    } catch (err) {
      console.error("Failed to fetch villages:", err);
    }
  }, [token]);

  // Fetch borrowers with pagination, search, and village filter
  const fetchBorrowers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: search.trim(),
        village: selectedVillage,
      });

      const res = await fetch(`/api/borrowers?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        logout();
        throw new Error("Session expired. Please sign in again.");
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to fetch borrowers (Status ${res.status})`);
      }

      const data = await res.json();
      setBorrowers(data.borrowers || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load borrower directory. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, search, selectedVillage, logout]);

  useEffect(() => {
    fetchVillages();
  }, [fetchVillages]);

  useEffect(() => {
    fetchBorrowers();
  }, [fetchBorrowers]);

  // Reset to page 1 whenever search query or village filter changes
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleVillageChange = (e) => {
    setSelectedVillage(e.target.value);
    setPage(1);
  };

  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value));
    setPage(1);
  };

  // Add new borrower handler
  const handleAddBorrowerSubmit = async (e) => {
    e.preventDefault();
    setModalError("");

    if (!newBorrower.name.trim() || !newBorrower.village.trim()) {
      setModalError("Borrower Full Name and Village/Location are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/borrowers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newBorrower),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to add borrower");
      }

      setShowAddModal(false);
      setNewBorrower({ name: "", village: "", contactNumber: "", occupation: "Farmer", aadhaarNumber: "" });
      fetchVillages();
      fetchBorrowers();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pagination calculation
  const startItem = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalCount);

  return (
    <div className="borrower-directory-container">
      {/* Top Header & Action Controls */}
      <div className="directory-header-card glass-card">
        <div className="header-top-row">
          <div>
            <h2 className="card-title" style={{ marginBottom: "0.25rem" }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="26" height="26">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Borrower Directory
            </h2>
            <p className="subtitle" style={{ marginBottom: 0, fontSize: "0.95rem" }}>
              View and filter registered village borrowers with active loan histories
            </p>
          </div>

          <div className="header-actions">
            {/* View Switcher: Table vs Cards */}
            <div className="view-switch-group">
              <button
                type="button"
                className={`switch-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Table View"
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Table
              </button>
              <button
                type="button"
                className={`switch-btn ${viewMode === "card" ? "active" : ""}`}
                onClick={() => setViewMode("card")}
                title="Cards View"
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Cards
              </button>
            </div>

            <button
              type="button"
              className="btn-add-borrower"
              onClick={() => setShowAddModal(true)}
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="18" height="18">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Borrower
            </button>
          </div>
        </div>

        {/* Search & Filter Control Bar */}
        <div className="filter-bar">
          <div className="search-field">
            <label htmlFor="borrower-search" className="form-label">Search Borrower Name</label>
            <div className="input-wrapper">
              <input
                id="borrower-search"
                type="text"
                className="form-control"
                placeholder="Search by name (e.g. Ramesh, Sita)..."
                value={search}
                onChange={handleSearchChange}
              />
              <svg className="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="filter-field">
            <label htmlFor="village-filter" className="form-label">Village / Location</label>
            <div className="input-wrapper">
              <select
                id="village-filter"
                className="form-control"
                value={selectedVillage}
                onChange={handleVillageChange}
              >
                <option value="">All Villages & Locations</option>
                {villages.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <svg className="input-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
          </div>

          <div className="limit-field">
            <label htmlFor="page-limit" className="form-label">Per Page</label>
            <select
              id="page-limit"
              className="form-control"
              value={limit}
              onChange={handleLimitChange}
              style={{ paddingLeft: "1rem" }}
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area: Loading, Error, or Borrower Display */}
      {loading ? (
        <div className="glass-card loading-container">
          <div className="spinner"></div>
          <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>Loading borrower profiles...</p>
        </div>
      ) : error ? (
        <div className="glass-card error-container">
          <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
            <svg className="alert-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <button type="button" className="btn-submit" style={{ maxWidth: "200px" }} onClick={fetchBorrowers}>
            Retry Request
          </button>
        </div>
      ) : borrowers.length === 0 ? (
        <div className="glass-card empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3>No borrower profiles found</h3>
          <p>No borrower records matched your current search term or village filter criteria.</p>
          {(search || selectedVillage) && (
            <button
              type="button"
              className="btn-reset-filter"
              onClick={() => {
                setSearch("");
                setSelectedVillage("");
                setPage(1);
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        /* Table View */
        <div className="glass-card table-wrapper-card">
          <div className="table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Borrower Name</th>
                  <th>Contact Details</th>
                  <th>Address (Village)</th>
                  <th>Occupation</th>
                  <th>Loans & Borrowed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {borrowers.map((b) => (
                  <tr key={b._id}>
                    <td>
                      <div className="user-name-cell">
                        <div className="user-avatar" style={{ background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)" }}>
                          {b.name ? b.name.charAt(0).toUpperCase() : "B"}
                        </div>
                        <div className="user-details">
                          <span style={{ fontWeight: 600, color: "#ffffff" }}>{b.name}</span>
                          {b.aadhaarNumber && (
                            <span className="user-email">Aadhaar: {b.aadhaarNumber}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{b.contactNumber || "N/A"}</span>
                    </td>
                    <td>
                      <div className="village-badge">
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" width="14" height="14">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        {b.village}
                      </div>
                    </td>
                    <td>
                      <span className="occupation-tag">{b.occupation || "Farmer"}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#34d399" }}>
                        ${Number(b.totalBorrowed || 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {b.totalLoans || 0} loan(s)
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${b.status === "active" ? "approved" : "rejected"}`}>
                        {b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="pagination-bar">
            <div className="pagination-info">
              Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of <strong>{totalCount}</strong> borrowers
            </div>

            <div className="pagination-controls">
              <button
                type="button"
                className="page-nav-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  className={`page-num-btn ${pNum === page ? "active" : ""}`}
                  onClick={() => setPage(pNum)}
                >
                  {pNum}
                </button>
              ))}

              <button
                type="button"
                className="page-nav-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Card View */
        <div className="cards-wrapper">
          <div className="cards-grid">
            {borrowers.map((b) => (
              <div key={b._id} className="glass-card borrower-card">
                <div className="card-top">
                  <div className="user-avatar" style={{ background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", width: "42px", height: "42px" }}>
                    {b.name ? b.name.charAt(0).toUpperCase() : "B"}
                  </div>
                  <div>
                    <h3 className="borrower-name">{b.name}</h3>
                    <span className="occupation-tag">{b.occupation || "Farmer"}</span>
                  </div>
                  <span className={`badge badge-${b.status === "active" ? "approved" : "rejected"}`} style={{ marginLeft: "auto" }}>
                    {b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : "Active"}
                  </span>
                </div>

                <div className="card-body">
                  <div className="info-row">
                    <span className="info-label">Address (Village)</span>
                    <span className="info-val">{b.village}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Contact</span>
                    <span className="info-val">{b.contactNumber || "N/A"}</span>
                  </div>
                  {b.aadhaarNumber && (
                    <div className="info-row">
                      <span className="info-label">Aadhaar ID</span>
                      <span className="info-val">{b.aadhaarNumber}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="info-label">Loans & Principal</span>
                    <span className="info-val" style={{ color: "#34d399", fontWeight: 600 }}>
                      ${Number(b.totalBorrowed || 0).toLocaleString()} ({b.totalLoans || 0} loans)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls for Card View */}
          <div className="glass-card pagination-bar" style={{ marginTop: "1.5rem" }}>
            <div className="pagination-info">
              Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of <strong>{totalCount}</strong> borrowers
            </div>

            <div className="pagination-controls">
              <button
                type="button"
                className="page-nav-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  className={`page-num-btn ${pNum === page ? "active" : ""}`}
                  onClick={() => setPage(pNum)}
                >
                  {pNum}
                </button>
              ))}

              <button
                type="button"
                className="page-nav-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Registering a New Borrower */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Register New Borrower</h3>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>

            {modalError && (
              <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddBorrowerSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Sunita Devi"
                  style={{ paddingLeft: "1rem" }}
                  value={newBorrower.name}
                  onChange={(e) => setNewBorrower({ ...newBorrower, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Village / Location *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Rampur"
                  style={{ paddingLeft: "1rem" }}
                  value={newBorrower.village}
                  onChange={(e) => setNewBorrower({ ...newBorrower, village: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. +91 98765 43210"
                  style={{ paddingLeft: "1rem" }}
                  value={newBorrower.contactNumber}
                  onChange={(e) => setNewBorrower({ ...newBorrower, contactNumber: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Occupation / Primary Income</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Agriculture / Dairy Farming"
                  style={{ paddingLeft: "1rem" }}
                  value={newBorrower.occupation}
                  onChange={(e) => setNewBorrower({ ...newBorrower, occupation: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Aadhaar / National ID</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. XXXX-XXXX-1234"
                  style={{ paddingLeft: "1rem" }}
                  value={newBorrower.aadhaarNumber}
                  onChange={(e) => setNewBorrower({ ...newBorrower, aadhaarNumber: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Borrower Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BorrowerDirectory;
