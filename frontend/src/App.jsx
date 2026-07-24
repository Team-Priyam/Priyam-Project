import React, { useState } from "react";
import Profile from "./components/Profile";
import BorrowerDetail from "./components/BorrowerDetail";
import BorrowerList from "./components/BorrowerList";
import { Landmark, ShieldCheck, Users, Settings } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("directory");
  const [selectedBorrowerId, setSelectedBorrowerId] = useState(null);

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

  const handleSelectBorrower = (id) => {
    setSelectedBorrowerId(id);
    setActiveTab("directory");
  };

  const handleBackToList = () => {
    setSelectedBorrowerId(null);
  };

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

        {/* Navigation Tabs */}
        <nav style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className={`btn ${activeTab === "directory" ? "btn-primary" : "btn-back"}`}
            onClick={() => {
              setActiveTab("directory");
            }}
            style={{ fontSize: "0.85rem", padding: "0.4rem 0.9rem" }}
          >
            <Users size={16} /> Borrower Directory
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
        {activeTab === "directory" ? (
          selectedBorrowerId ? (
            <BorrowerDetail
              borrowerId={selectedBorrowerId}
              token={token}
              onBack={handleBackToList}
            />
          ) : (
            <BorrowerList
              token={token}
              onSelectBorrower={handleSelectBorrower}
            />
          )
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
