import React, { useState } from "react";
import Profile from "./components/Profile";
import BorrowerDetail from "./components/BorrowerDetail";
import { Landmark, ShieldCheck, UserCheck, Users, Settings } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("borrower_detail");
  const [selectedBorrowerId, setSelectedBorrowerId] = useState("bw_8842");

  const [currentUser, setCurrentUser] = useState({
    _id: "usr_101",
    name: "Ramesh Sharma",
    email: "ramesh.sharma@village-lending.org",
    role: "Lender",
    village: "Rampur Village",
    phone: "+91 98765 43210",
    createdAt: "2024-01-15T08:30:00.000Z",
  });

  const [token, setToken] = useState(localStorage.getItem("token") || "demo_jwt_token_123");

  const handleUserUpdated = (updatedUser) => {
    setCurrentUser((prev) => ({ ...prev, ...updatedUser }));
    if (updatedUser.token) {
      localStorage.setItem("token", updatedUser.token);
      setToken(updatedUser.token);
    }
  };

  const sampleBorrowers = [
    { id: "bw_8842", label: "Sunita Devi (Active - Complete Profile)" },
    { id: "bw_9910", label: "Ramesh Patel (Cleared - Full Activity)" },
    { id: "bw_5521", label: "Anita Sharma (Overdue - Missing Data & No Activity)" },
  ];

  return (
    <div className="app-container">
      {/* Navbar Header */}
      <header className="header-bar">
        <div className="brand-badge">
          <Landmark size={28} color="#10b981" />
          <div>
            <span>Rural</span> Microfinance
          </div>
        </div>

        {/* View Switcher Tabs */}
        <nav style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className={`btn ${activeTab === "borrower_detail" ? "btn-primary" : "btn-back"}`}
            onClick={() => setActiveTab("borrower_detail")}
            style={{ fontSize: "0.85rem", padding: "0.4rem 0.9rem" }}
          >
            <UserCheck size={16} /> Borrower Detail
          </button>
          <button
            className={`btn ${activeTab === "profile" ? "btn-primary" : "btn-back"}`}
            onClick={() => setActiveTab("profile")}
            style={{ fontSize: "0.85rem", padding: "0.4rem 0.9rem" }}
          >
            <Settings size={16} /> My Account
          </button>
        </nav>

        <div className="user-badge-header">
          <div className="avatar-circle">
            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <div style={{ fontSize: "0.875rem", fontWeight: 700 }}>
              {currentUser.name}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <ShieldCheck size={12} color="#10b981" /> {currentUser.role}
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main>
        {activeTab === "borrower_detail" ? (
          <div>
            {/* Quick Borrower Switcher Bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
              background: "rgba(255,255,255,0.03)",
              padding: "0.75rem 1rem",
              borderRadius: "10px",
              border: "1px solid var(--border-color)"
            }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Users size={16} color="var(--accent-primary)" /> Select Borrower Preview:
              </span>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {sampleBorrowers.map((sb) => (
                  <button
                    key={sb.id}
                    className={`btn ${selectedBorrowerId === sb.id ? "btn-primary" : "btn-back"}`}
                    onClick={() => setSelectedBorrowerId(sb.id)}
                    style={{ fontSize: "0.775rem", padding: "0.35rem 0.75rem" }}
                  >
                    {sb.label}
                  </button>
                ))}
              </div>
            </div>

            <BorrowerDetail
              key={selectedBorrowerId}
              borrowerId={selectedBorrowerId}
              token={token}
              onBack={() => setActiveTab("profile")}
            />
          </div>
        ) : (
          <Profile
            token={token}
            initialUser={currentUser}
            onUserUpdated={handleUserUpdated}
          />
        )}
      </main>
    </div>
  );
}
