
import { useCallback, useEffect, useMemo, useState } from "react";
import "./ManagerDashboard.css";
import ManagerDocumentVerification from "../components/ManagerDocumentVerification";
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Keep these paths aligned with the mount path in your existing Express app.
const REVIEW_API = `${API}/loans/review`;

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const date = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const listFrom = (body) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.applications)) return body.applications;
  if (Array.isArray(body?.data?.applications)) return body.data.applications;
  if (Array.isArray(body?.data)) return body.data;
  return [];
};

const statusLabel = (value = "SUBMITTED") =>
  String(value).replaceAll("_", " ");

const statusClass = (value = "SUBMITTED") =>
  String(value).toLowerCase().replaceAll("_", "-");

export default function ManagerDashboard() {
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("SUBMITTED");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams();
      if (filter !== "ALL") query.set("status", filter);

      const response = await fetch(
        `${REVIEW_API}/applications?${query.toString()}`,
        { credentials: "include" }
      );
      const body = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(body.message || "Could not load the review queue.");
      }

      setApplications(listFrom(body));
    } catch (err) {
      setError(err.message || "Unable to load applications.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const visibleApplications = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return applications;

    return applications.filter((item) => {
      const applicant = item.applicant || {};
      return [
        item.applicationNumber,
        item.loanType,
        item.purpose,
        applicant.name,
        applicant.email,
        applicant.phone,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [applications, search]);

  const stats = useMemo(() => ({
    count: applications.length,
    amount: applications.reduce(
      (sum, item) => sum + Number(item.requestedAmount || 0),
      0
    ),
    salaried: applications.filter(
      (item) => item.employmentType === "SALARIED"
    ).length,
  }), [applications]);

  const openApplication = async (item) => {
    setSelected(item);
    setNotes("");
    setError("");
    setDetailLoading(true);

    try {
      const response = await fetch(
        `${REVIEW_API}/applications/${item._id}`,
        { credentials: "include" }
      );
      const body = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(body.message || "Could not load application details.");
      }

      const detail =
        body.application || body.data?.application || body.data || body;
      setSelected(detail);
      setNotes(detail.reviewNotes || "");
    } catch (err) {
      setError(err.message || "Unable to load application details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const decide = async (status) => {
    if (!selected?._id) return;

    if (notes.trim().length < 5) {
      setError("Please enter review notes of at least 5 characters.");
      return;
    }

    const action = status === "APPROVED" ? "approve" : "reject";
    if (!window.confirm(`Are you sure you want to ${action} this application?`)) {
      return;
    }

    setDecisionLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${REVIEW_API}/applications/${selected._id}/decision`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, notes: notes.trim() }),
        }
      );

      const body = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(body.message || `Could not ${action} application.`);
      }

      setNotice(
        `Application ${selected.applicationNumber || ""} ${status.toLowerCase()} successfully.`
      );
      setSelected(null);
      await loadApplications();
    } catch (err) {
      setError(err.message || "Decision could not be saved.");
    } finally {
      setDecisionLoading(false);
    }
  };

  const logout = async () => {
    await fetch(`${API}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    window.location.assign("/login");
  };

  return (
    <div className="lm-dashboard">
      <aside className="lm-sidebar">
        <a href="/" className="lm-brand">
          <span className="lm-brand-mark">F</span>
          <span><strong>FinTrust</strong><small>LOAN OPERATIONS</small></span>
        </a>

        <div className="lm-nav-label">MANAGEMENT</div>
        <a href="/manager" className="lm-nav-item active">▦ &nbsp; Review queue</a>
        <button
          className="lm-nav-item"
          onClick={() => {
            setFilter("ALL");
            setSearch("");
          }}
        >
          ▤ &nbsp; All applications
        </button>

        <div className="lm-sidebar-bottom">
          <div className="lm-security-note">
            <span>◇</span>
            <strong>Secure workspace</strong>
            <p>Applicant information is restricted to authorised staff.</p>
          </div>
          <a href="/">← Back to home</a>
        </div>
      </aside>

      <main className="lm-main">
        <header className="lm-topbar">
          <div><span>Workspace /</span><strong> Loan management</strong></div>
          <div className="lm-top-actions">
            <span className="lm-role-badge">LOAN MANAGER</span>
            <button onClick={logout} className="lm-logout">Log out ↗</button>
          </div>
        </header>

        <section className="lm-content">
          <div className="lm-welcome">
            <div>
              <div className="lm-eyebrow">LENDING OPERATIONS</div>
              <h1>Application review</h1>
              <p>Review customer requests, record your findings, and make informed decisions.</p>
            </div>
            <button className="lm-refresh" onClick={loadApplications} disabled={loading}>
              ↻ Refresh queue
            </button>
          </div>

          {notice && <div className="lm-alert success">{notice}<button onClick={() => setNotice("")}>×</button></div>}
          {error && <div className="lm-alert error">{error}<button onClick={() => setError("")}>×</button></div>}

          <div className="lm-stats">
            <article><span>Applications in this view</span><strong>{loading ? "—" : stats.count}</strong><small>Based on the selected filter</small></article>
            <article><span>Requested amount</span><strong>{loading ? "—" : money(stats.amount)}</strong><small>Total amount in this queue</small></article>
            <article><span>Salaried applicants</span><strong>{loading ? "—" : stats.salaried}</strong><small>Within the selected queue</small></article>
          </div>

          <section className="lm-queue">
            <div className="lm-queue-heading">
              <div><h2>Application queue</h2><p>Select an application to review its details.</p></div>
              <span className="lm-total">{visibleApplications.length} records</span>
            </div>

            <div className="lm-toolbar">
              <label className="lm-search">
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search applicant, ID or loan type..."
                />
              </label>
              <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter application status">
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under review</option>
                <option value="MORE_INFO_REQUIRED">More info required</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="ALL">All statuses</option>
              </select>
            </div>

            {loading ? (
              <div className="lm-state"><span className="lm-spinner" /><strong>Loading applications…</strong></div>
            ) : visibleApplications.length === 0 ? (
              <div className="lm-state">
                <span className="lm-empty">▤</span>
                <strong>No applications in this view</strong>
                <p>Try another status filter or clear your search.</p>
                <button className="lm-secondary" onClick={() => { setFilter("ALL"); setSearch(""); }}>View all applications</button>
              </div>
            ) : (
              <div className="lm-table-wrap">
                <table className="lm-table">
                  <thead><tr><th>APPLICANT</th><th>APPLICATION</th><th>LOAN TYPE</th><th>REQUESTED</th><th>SUBMITTED</th><th>STATUS</th><th></th></tr></thead>
                  <tbody>
                    {visibleApplications.map((item) => (
                      <tr key={item._id || item.applicationNumber}>
                        <td>
                          <strong>{item.applicant?.name || "Applicant"}</strong>
                          <small>{item.applicant?.email || "—"}</small>
                        </td>
                        <td><strong>{item.applicationNumber || "—"}</strong></td>
                        <td>{String(item.loanType || "—").replaceAll("_", " ")}</td>
                        <td className="lm-money">{money(item.requestedAmount)}</td>
                        <td>{date(item.createdAt)}</td>
                        <td><span className={`lm-status ${statusClass(item.status)}`}>{statusLabel(item.status)}</span></td>
                        <td><button className="lm-review-button" onClick={() => openApplication(item)}>Review →</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <ManagerDocumentVerification />
          <footer className="lm-footer"><span>© {new Date().getFullYear()} FinTrust</span><span>Internal loan operations workspace</span></footer>
        </section>
      </main>

      {selected && (
        <div className="lm-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !decisionLoading) setSelected(null);
        }}>
          <section className="lm-detail-modal" role="dialog" aria-modal="true" aria-labelledby="lm-detail-title">
            <header className="lm-detail-header">
              <div><div className="lm-eyebrow">APPLICATION REVIEW</div><h2 id="lm-detail-title">{selected.applicationNumber || "Application details"}</h2><p>Review the supplied information before recording a decision.</p></div>
              <button className="lm-close" onClick={() => setSelected(null)} disabled={decisionLoading} aria-label="Close">×</button>
            </header>

            {detailLoading ? (
              <div className="lm-state"><span className="lm-spinner" /><strong>Loading application details…</strong></div>
            ) : (
              <>
                <div className="lm-detail-grid">
                  <div><small>Applicant</small><strong>{selected.applicant?.name || "—"}</strong></div>
                  <div><small>Email</small><strong>{selected.applicant?.email || "—"}</strong></div>
                  <div><small>Phone</small><strong>{selected.applicant?.phone || "—"}</strong></div>
                  <div><small>Loan type</small><strong>{String(selected.loanType || "—").replaceAll("_", " ")}</strong></div>
                  <div><small>Requested amount</small><strong>{money(selected.requestedAmount)}</strong></div>
                  <div><small>Tenure</small><strong>{selected.tenureMonths ? `${selected.tenureMonths} months` : "—"}</strong></div>
                  <div><small>Employment</small><strong>{String(selected.employmentType || "—").replaceAll("_", " ")}</strong></div>
                  <div><small>Monthly income</small><strong>{money(selected.monthlyIncome)}</strong></div>
                  <div><small>Employer / institution</small><strong>{selected.employerName || "—"}</strong></div>
                  <div><small>Submitted</small><strong>{date(selected.createdAt)}</strong></div>
                </div>

                <div className="lm-purpose"><small>LOAN PURPOSE</small><p>{selected.purpose || "No purpose provided."}</p></div>

                {Array.isArray(selected.decisionHistory) && selected.decisionHistory.length > 0 && (
                  <div className="lm-history">
                    <strong>Decision history</strong>
                    {selected.decisionHistory.map((entry, index) => (
                      <div key={`${entry._id || entry.actionAt || index}`} className="lm-history-row">
                        <span className={`lm-status ${statusClass(entry.status)}`}>{statusLabel(entry.status)}</span>
                        <span>{entry.notes || "No notes"}</span>
                        <small>{date(entry.actionAt)}</small>
                      </div>
                    ))}
                  </div>
                )}

                {selected.status === "SUBMITTED" ? (
                  <div className="lm-decision">
                    <label>Review notes <span>(required, at least 5 characters)</span>
                      <textarea value={notes} onChange={(event) => setNotes(event.target.value)} minLength={5} maxLength={1000} rows={3} placeholder="Record the reason for your decision and any relevant findings…" />
                    </label>
                    <div className="lm-decision-actions">
                      <button className="lm-reject" onClick={() => decide("REJECTED")} disabled={decisionLoading}>{decisionLoading ? "Saving…" : "Reject application"}</button>
                      <button className="lm-approve" onClick={() => decide("APPROVED")} disabled={decisionLoading}>{decisionLoading ? "Saving…" : "Approve application ✓"}</button>
                    </div>
                  </div>
                ) : (
                  <div className="lm-readonly-note">
                    This application is currently <strong>{statusLabel(selected.status)}</strong>. The current decision endpoint only accepts applications with SUBMITTED status.
                    {selected.reviewNotes && <p>Previous notes: {selected.reviewNotes}</p>}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
