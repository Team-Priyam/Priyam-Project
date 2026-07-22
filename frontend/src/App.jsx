import React, { useState } from "react";
import Profile from "./components/Profile";
import { Landmark, ShieldCheck } from "lucide-react";

export default function App() {
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

      {/* Main Profile Page Content */}
      <main>
        <Profile
          token={token}
          initialUser={currentUser}
          onUserUpdated={handleUserUpdated}
        />
      </main>
    </div>
  );
}
