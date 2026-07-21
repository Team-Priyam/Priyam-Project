import React, { useState, useEffect } from "react";
import RepaymentHistoryTable from "./RepaymentHistoryTable";

/**
 * RepaymentHistoryModal Component
 * Fetches repayment data by borrower ID from API and displays loading, error, and repayment table.
 */
const RepaymentHistoryModal = ({ borrower, token, onClose }) => {
  const [repayments, setRepayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRepaymentHistory = async () => {
      if (!borrower || !borrower._id || !token) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/repayments/borrower/${borrower._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to fetch repayments (Status ${res.status})`);
        }

        const data = await res.json();
        if (data.success && isMounted) {
          setRepayments(data.repayments || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Error connecting to server to retrieve repayments.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRepaymentHistory();

    return () => {
      isMounted = false;
    };
  }, [borrower, token]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card glass-card" style={{ maxWidth: "680px" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Borrower Repayment History</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: 0 }}>
              Full payment ledger for <strong>{borrower.name}</strong> ({borrower.village})
            </p>
          </div>
          <button className="btn-close" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Task 2: Display loading, error, and repayment table */}
        <RepaymentHistoryTable repayments={repayments} loading={loading} error={error} />

        <div className="modal-actions" style={{ marginTop: "1.5rem" }}>
          <button type="button" className="btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RepaymentHistoryModal;
