import React, { useState, useEffect } from "react";

const EditBorrowerForm = ({ borrowerId, token, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    village: "",
    contactNumber: "",
    occupation: "",
    aadhaarNumber: "",
    status: "active",
  });

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Task 1 Requirement: Fetch borrower data by ID and pre-fill form fields
  useEffect(() => {
    let isMounted = true;

    const fetchBorrowerDetails = async () => {
      if (!borrowerId || !token) return;

      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/borrowers/${borrowerId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to fetch borrower profile (Status ${res.status})`);
        }

        const data = await res.json();
        if (data.success && data.borrower && isMounted) {
          const b = data.borrower;
          // Pre-fill form fields with fetched data
          setFormData({
            name: b.name || "",
            village: b.village || "",
            contactNumber: b.contactNumber || "",
            occupation: b.occupation || "",
            aadhaarNumber: b.aadhaarNumber || "",
            status: b.status || "active",
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Error fetching borrower details for editing.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBorrowerDetails();

    return () => {
      isMounted = false;
    };
  }, [borrowerId, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!formData.name.trim()) {
      setError("Borrower Full Name is required.");
      return;
    }

    if (!formData.village.trim()) {
      setError("Village / Location is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/borrowers/${borrowerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          village: formData.village.trim(),
          contactNumber: formData.contactNumber.trim(),
          occupation: formData.occupation.trim(),
          aadhaarNumber: formData.aadhaarNumber.trim(),
          status: formData.status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update borrower profile");
      }

      setSuccessMessage(data.message || "Borrower profile updated successfully!");

      setTimeout(() => {
        if (onSuccess) {
          onSuccess(data.borrower);
        }
        if (onClose) {
          onClose();
        }
      }, 500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Borrower Profile</h3>
          <button className="btn-close" onClick={onClose}>
            &times;
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div className="spinner"></div>
            <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>
              Fetching borrower data by ID...
            </p>
          </div>
        ) : (
          <>
            {successMessage && (
              <div className="alert alert-success" style={{ marginBottom: "1rem" }}>
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  placeholder="Full Name"
                  style={{ paddingLeft: "1rem" }}
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Village / Location *</label>
                <input
                  type="text"
                  name="village"
                  className="form-control"
                  placeholder="Village / Location"
                  style={{ paddingLeft: "1rem" }}
                  value={formData.village}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone Number</label>
                <input
                  type="text"
                  name="contactNumber"
                  className="form-control"
                  placeholder="e.g. +91 98765 43210"
                  style={{ paddingLeft: "1rem" }}
                  value={formData.contactNumber}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Occupation / Primary Income</label>
                <input
                  type="text"
                  name="occupation"
                  className="form-control"
                  placeholder="e.g. Agriculture / Dairy Farming"
                  style={{ paddingLeft: "1rem" }}
                  value={formData.occupation}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Aadhaar / National ID</label>
                <input
                  type="text"
                  name="aadhaarNumber"
                  className="form-control"
                  placeholder="e.g. XXXX-XXXX-1234"
                  style={{ paddingLeft: "1rem" }}
                  value={formData.aadhaarNumber}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Account Status</label>
                <select
                  name="status"
                  className="form-control"
                  style={{ paddingLeft: "1rem" }}
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Profile"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default EditBorrowerForm;
