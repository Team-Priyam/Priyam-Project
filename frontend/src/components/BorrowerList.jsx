import React, { useState, useEffect } from "react";
import {
  Search,
  Users,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Activity,
  AlertTriangle,
  RotateCcw,
  X,
  IndianRupee,
} from "lucide-react";
import { getBorrowers } from "../services/api";

export default function BorrowerList({ token, onSelectBorrower }) {
  const [borrowers, setBorrowers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Demo list for offline fallback
  const demoList = [
    {
      _id: "bw_8842",
      borrowerCode: "BW-2024-8842",
      name: "Sunita Devi",
      village: "East Rampur Village",
      phone: "+91 94123 89012",
      kycVerified: true,
      financials: { totalBorrowed: 50000, currentBalance: 15000, status: "Active" },
    },
    {
      _id: "bw_9910",
      borrowerCode: "BW-2024-9910",
      name: "Ramesh Kumar Patel",
      village: "Central Village",
      phone: "+91 98234 11223",
      kycVerified: true,
      financials: { totalBorrowed: 80000, currentBalance: 0, status: "Cleared" },
    },
    {
      _id: "bw_5521",
      borrowerCode: "BW-2024-5521",
      name: "Anita Sharma",
      village: "North Rampur",
      phone: null,
      kycVerified: false,
      financials: { totalBorrowed: 25000, currentBalance: 20000, status: "Overdue" },
    },
  ];

  const fetchBorrowers = async () => {
    try {
      setLoading(true);
      setError(null);
      if (token) {
        const data = await getBorrowers(searchTerm, token);
        const list = Array.isArray(data) ? data : data?.data || demoList;
        setBorrowers(list);
      } else {
        const filtered = demoList.filter((b) => {
          if (!searchTerm.trim()) return true;
          const s = searchTerm.toLowerCase();
          return (
            b.name.toLowerCase().includes(s) ||
            b.borrowerCode.toLowerCase().includes(s) ||
            (b.village && b.village.toLowerCase().includes(s))
          );
        });
        setBorrowers(filtered);
      }
    } catch (err) {
      console.warn("Error fetching borrowers list:", err.message);
      setError(err.message || "Failed to load borrower list");
      const filtered = demoList.filter((b) => {
        if (!searchTerm.trim()) return true;
        const s = searchTerm.toLowerCase();
        return (
          b.name.toLowerCase().includes(s) ||
          b.borrowerCode.toLowerCase().includes(s) ||
          (b.village && b.village.toLowerCase().includes(s))
        );
      });
      setBorrowers(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBorrowers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, token]);

  return (
    <div className="borrower-list-container">
      {/* Search Header Card */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-title-group">
          <div>
            <h2 className="card-title">
              <Users size={22} color="var(--accent-primary)" /> Village Borrower Directory
            </h2>
            <p className="card-subtitle">
              Search and filter borrowers by name, code, or village location to view complete profiles and loan activity.
            </p>
          </div>
          <span className="badge badge-count">
            {borrowers.length} {borrowers.length === 1 ? "Borrower" : "Borrowers"} Found
          </span>
        </div>

        {/* Search Bar Input */}
        <div className="search-bar-wrapper">
          <Search size={18} className="search-icon" />
          <input
            id="borrower-search-input"
            type="text"
            className="form-input search-input"
            placeholder="Search by borrower name, code (e.g. BW-2024-8842), or village..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchTerm("")}
              title="Clear Search"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card text-center" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
          <Activity size={32} className="spin-icon" color="var(--accent-primary)" style={{ margin: "0 auto" }} />
          <div style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Searching borrower records...
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && !loading && (
        <div className="alert alert-error">
          <AlertTriangle size={18} />
          <span>Notice: {error}. Showing local offline list.</span>
          <button
            className="btn btn-back"
            onClick={fetchBorrowers}
            style={{ marginLeft: "auto", padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
          >
            <RotateCcw size={12} /> Refresh
          </button>
        </div>
      )}

      {/* Borrower Cards List Grid */}
      {!loading && (
        <div className="borrower-grid">
          {borrowers.length > 0 ? (
            borrowers.map((b) => {
              const initials = b.name
                ? b.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                : "B";
              const isOverdue = b.financials?.status === "Overdue";
              const isCleared = b.financials?.status === "Cleared";

              return (
                <div
                  key={b._id || b.borrowerCode}
                  className="card borrower-card-item"
                  onClick={() => onSelectBorrower && onSelectBorrower(b._id || b.borrowerCode)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      onSelectBorrower && onSelectBorrower(b._id || b.borrowerCode);
                    }
                  }}
                >
                  <div className="borrower-card-header">
                    <div className="avatar-placeholder-sm">{initials}</div>
                    <div className="borrower-card-meta">
                      <div className="borrower-card-name-row">
                        <h4 className="borrower-card-name">{b.name}</h4>
                        {b.kycVerified && (
                          <ShieldCheck size={14} color="#10b981" title="KYC Verified" />
                        )}
                      </div>
                      <span className="code-badge-sm">{b.borrowerCode}</span>
                    </div>
                    <span
                      className={`badge ${
                        isOverdue
                          ? "badge-overdue"
                          : isCleared
                          ? "badge-cleared"
                          : "badge-active"
                      }`}
                    >
                      {b.financials?.status || "Active"}
                    </span>
                  </div>

                  <div className="borrower-card-body">
                    <div className="card-info-row">
                      <MapPin size={14} color="var(--text-muted)" />
                      <span>{b.village || "Village Not Specified"}</span>
                    </div>
                    <div className="card-info-row">
                      <IndianRupee size={14} color="var(--text-muted)" />
                      <span>
                        Balance:{" "}
                        <strong className={isOverdue ? "text-danger" : "text-main"}>
                          ₹{(b.financials?.currentBalance || 0).toLocaleString("en-IN")}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="borrower-card-footer">
                    <span className="link-action-text">
                      View Profile Details & Activity
                    </span>
                    <ChevronRight size={16} className="chevron-icon" />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="card empty-search-card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem 1.5rem" }}>
              <Users size={36} color="var(--text-muted)" style={{ margin: "0 auto" }} />
              <h4 style={{ marginTop: "0.75rem", color: "var(--text-main)" }}>No Borrowers Found</h4>
              <p style={{ marginTop: "0.25rem", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                No borrower records matched your search query "{searchTerm}". Try clearing search or entering a different keyword.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
