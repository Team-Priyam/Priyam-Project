import React, { useState, useEffect } from "react";
import RegisterUserForm from "./components/RegisterUserForm";
import "./App.css";

function App() {
  // Initial seeded users list
  const [users, setUsers] = useState([
    {
      id: "u-1",
      name: "Admin Priyam",
      email: "admin@villagefinance.org",
      role: "admin",
      status: "Active",
      createdAt: new Date().toLocaleDateString(),
    },
    {
      id: "u-2",
      name: "Ramesh Kumar",
      email: "ramesh.k@villagefinance.org",
      role: "lender",
      status: "Active",
      createdAt: new Date().toLocaleDateString(),
    },
  ]);

  useEffect(() => {
    document.title = "Admin Console | Microfinance Portal";
  }, []);

  // Handle addition of a new user
  const handleUserRegister = async (newUserData) => {
    // Check for duplicates
    const isDuplicate = users.some(
      (user) => user.email.toLowerCase() === newUserData.email.toLowerCase()
    );

    if (isDuplicate) {
      throw new Error(`Email address "${newUserData.email}" is already registered.`);
    }

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const newUser = {
      id: `u-${Date.now()}`,
      name: newUserData.name,
      email: newUserData.email,
      role: newUserData.role,
      status: "Active",
      createdAt: new Date().toLocaleDateString(),
    };

    setUsers((prevUsers) => [newUser, ...prevUsers]);
  };

  // Helper for role badging styling
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case "admin":
        return "badge badge-admin";
      case "lender":
        return "badge badge-lender";
      case "officer":
        return "badge badge-officer";
      default:
        return "badge";
    }
  };

  return (
    <div className="app-container">
      {/* Header Banner */}
      <header className="dashboard-header">
        <div className="logo-section">
          <div className="logo-icon">🏦</div>
          <div>
            <h1>Village Microfinance Portal</h1>
            <p className="admin-status">
              Logged in as <strong className="text-highlight">Admin Priyam</strong> (Administrator)
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="dashboard-grid">
        {/* Left Column: Form Panel */}
        <section className="form-panel">
          <RegisterUserForm onUserRegister={handleUserRegister} />
        </section>

        {/* Right Column: User Management Directory */}
        <section className="directory-panel glass-panel">
          <div className="panel-header">
            <h3>Staff & User Directory</h3>
            <span className="user-count-badge">{users.length} Total Users</span>
          </div>

          <div className="table-responsive">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="table-row">
                    <td>
                      <div className="user-name-cell">
                        <span className="user-avatar">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="user-fullname">{user.name}</span>
                      </div>
                    </td>
                    <td className="user-email">{user.email}</td>
                    <td>
                      <span className={getRoleBadgeClass(user.role)}>
                        {user.role === "admin"
                          ? "Admin"
                          : user.role === "lender"
                          ? "Lender"
                          : "Loan Officer"}
                      </span>
                    </td>
                    <td>
                      <span className="status-indicator">
                        <span className="dot"></span>
                        {user.status}
                      </span>
                    </td>
                    <td className="user-date">{user.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;