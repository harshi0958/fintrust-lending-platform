
import { useCallback, useEffect, useMemo, useState } from "react";
import "./CustomerDashboard.css";
import CustomerDocuments from "../components/CustomerDocuments";
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const date = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const getList = (body) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.applications)) return body.applications;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.applications)) return body.data.applications;
  if (Array.isArray(body?.results)) return body.results;
  return [];
};

const initialForm = {
  loanType: "PERSONAL",
  requestedAmount: "200000",
  tenureMonths: "24",
  purpose: "",
  employmentType: "SALARIED",
  monthlyIncome: "",
  employerName: "",
};

const statusClass = (status = "SUBMITTED") =>
  String(status).toLowerCase().replaceAll("_", "-");

export default function CustomerDashboard() {
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [userResponse, applicationResponse] = await Promise.all([
        fetch(`${API}/auth/me`, {
          credentials: "include",
        }),
        fetch(`${API}/loans/applications/my`, {
          credentials: "include",
        }),
      ]);

      const userBody = await userResponse.json().catch(() => ({}));
      const applicationBody = await applicationResponse
        .json()
        .catch(() => ({}));

      if (userResponse.status === 401 || applicationResponse.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!userResponse.ok) {
        throw new Error(userBody.message || "Unable to load your profile.");
      }

      if (!applicationResponse.ok) {
        throw new Error(
          applicationBody.message || "Unable to load loan applications."
        );
      }

      setUser(userBody.user || userBody.data?.user || userBody.data || userBody);
      setApplications(getList(applicationBody));
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(() => {
    const approved = applications.filter(
      (item) => item.status === "APPROVED"
    );
    const pending = applications.filter((item) =>
      ["SUBMITTED", "UNDER_REVIEW", "MORE_INFO_REQUIRED"].includes(item.status)
    );

    return {
      total: applications.length,
      pending: pending.length,
      approved: approved.length,
      approvedAmount: approved.reduce(
        (sum, item) => sum + Number(item.requestedAmount || 0),
        0
      ),
    };
  }, [applications]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submitApplication = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setNotice("");
    setError("");

    try {
      const response = await fetch(`${API}/loans/applications`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          requestedAmount: Number(form.requestedAmount),
          tenureMonths: Number(form.tenureMonths),
          monthlyIncome: Number(form.monthlyIncome),
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        const details = body.errors
          ?.map((item) => item.message)
          .filter(Boolean)
          .join(" ");
        throw new Error(
          details || body.message || "Application submission failed."
        );
      }

      setShowForm(false);
      setForm(initialForm);
      setNotice("Your loan application was submitted successfully.");
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Could not submit your application.");
    } finally {
      setSubmitting(false);
    }
  };

  const name = user?.name || "Customer";
  const firstName = name.trim().split(/\s+/)[0];

  return (
    <div className="ft-dashboard">
      <aside className="ft-sidebar">
        <a className="ft-brand" href="/">
          <span className="ft-brand-mark">F</span>
          <span>
            <strong>FinTrust</strong>
            <small>FINANCE, WITH CONFIDENCE</small>
          </span>
        </a>

        <div className="ft-nav-label">WORKSPACE</div>
        <a className="ft-nav-item active" href="/customer">
          <span>▦</span> Overview
        </a>
        <button
          className="ft-nav-item"
          onClick={() => document.getElementById("ft-applications")?.scrollIntoView({ behavior: "smooth" })}
        >
          <span>▤</span> My applications
        </button>
        <button className="ft-nav-item" onClick={() => setShowForm(true)}>
          <span>＋</span> Apply for a loan
        </button>

        <div className="ft-sidebar-bottom">
          <div className="ft-help-card">
            <span className="ft-help-icon">✦</span>
            <strong>Need assistance?</strong>
            <p>Our team is here to help with your loan journey.</p>
            <a href="mailto:support@fintrust.example">Contact support ↗</a>
          </div>
          <a className="ft-back-home" href="/">← Back to home</a>
        </div>
      </aside>

      <main className="ft-main">
        <header className="ft-topbar">
          <div>
            <span className="ft-breadcrumb">Workspace /</span>
            <strong> Customer overview</strong>
          </div>
          <div className="ft-user">
            <div className="ft-avatar">{firstName.charAt(0).toUpperCase()}</div>
            <div className="ft-user-info">
              <strong>{name}</strong>
              <span>{user?.email || "Customer account"}</span>
            </div>
            <button
              className="ft-logout"
              onClick={async () => {
                await fetch(`${API}/auth/logout`, {
                  method: "POST",
                  credentials: "include",
                }).catch(() => {});
                window.location.assign("/login");
              }}
              title="Log out"
            >
              ↗
            </button>
          </div>
        </header>

        <section className="ft-content">
          <div className="ft-welcome-row">
            <div>
              <div className="ft-eyebrow">YOUR FINANCIAL JOURNEY</div>
              <h1>Good to see you, {firstName} <span>✦</span></h1>
              <p>Track your applications and manage your borrowing journey in one place.</p>
            </div>
            <button className="ft-primary-button" onClick={() => setShowForm(true)}>
              <span>＋</span> New loan application
            </button>
          </div>

          {notice && (
            <div className="ft-alert success">
              <span>✓</span> {notice}
              <button onClick={() => setNotice("")}>×</button>
            </div>
          )}

          {error && (
            <div className="ft-alert error">
              <span>!</span> {error}
              <button onClick={() => setError("")}>×</button>
            </div>
          )}

          <div className="ft-section-heading">
            <div>
              <h2>Your overview</h2>
              <p>A snapshot of your loan activity.</p>
            </div>
            <button className="ft-refresh" onClick={loadDashboard} disabled={loading}>
              ↻ Refresh
            </button>
          </div>

          <div className="ft-stats-grid">
            <article className="ft-stat-card">
              <div className="ft-stat-top"><span>Total applications</span><span className="ft-stat-icon lavender">▤</span></div>
              <strong>{loading ? "—" : stats.total}</strong>
              <small>All applications submitted</small>
            </article>
            <article className="ft-stat-card">
              <div className="ft-stat-top"><span>In progress</span><span className="ft-stat-icon amber">◷</span></div>
              <strong>{loading ? "—" : stats.pending}</strong>
              <small>Awaiting a final decision</small>
            </article>
            <article className="ft-stat-card">
              <div className="ft-stat-top"><span>Approved loans</span><span className="ft-stat-icon green">✓</span></div>
              <strong>{loading ? "—" : stats.approved}</strong>
              <small>Applications approved</small>
            </article>
            <article className="ft-stat-card">
              <div className="ft-stat-top"><span>Approved amount</span><span className="ft-stat-icon blue">₹</span></div>
              <strong className="ft-amount">{loading ? "—" : money(stats.approvedAmount)}</strong>
              <small>Total requested amount of approved applications</small>
            </article>
          </div>

          <section className="ft-applications-panel" id="ft-applications">
            <div className="ft-panel-heading">
              <div>
                <h2>Recent applications</h2>
                <p>Follow the latest updates on your loan requests.</p>
              </div>
              <span className="ft-count">{applications.length} total</span>
            </div>

            {loading ? (
              <div className="ft-state">
                <div className="ft-spinner" />
                <strong>Loading your applications</strong>
                <p>Fetching the latest information from FinTrust.</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="ft-state">
                <div className="ft-empty-icon">▤</div>
                <strong>Your journey starts here</strong>
                <p>You haven't submitted a loan application yet.</p>
                <button className="ft-primary-button" onClick={() => setShowForm(true)}>
                  Start an application →
                </button>
              </div>
            ) : (
              <div className="ft-table-wrap">
                <table className="ft-table">
                  <thead>
                    <tr>
                      <th>APPLICATION</th>
                      <th>LOAN TYPE</th>
                      <th>AMOUNT</th>
                      <th>SUBMITTED</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((item) => (
                      <tr key={item._id || item.applicationNumber}>
                        <td>
                          <strong>{item.applicationNumber || "Application"}</strong>
                          <small>{item.purpose || "Loan request"}</small>
                        </td>
                        <td>
                          {String(item.loanType || "—").replaceAll("_", " ")}
                        </td>
                        <td className="ft-table-amount">{money(item.requestedAmount)}</td>
                        <td>{date(item.createdAt)}</td>
                        <td>
                          <span className={`ft-status ${statusClass(item.status)}`}>
                            <i /> {String(item.status || "SUBMITTED").replaceAll("_", " ")}
                          </span>
                          {item.status === "MORE_INFO_REQUIRED" && item.reviewNotes && (
                            <small className="ft-review-note">{item.reviewNotes}</small>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="ft-bottom-grid">
            <article className="ft-info-card">
              <span className="ft-info-symbol">⌁</span>
              <div>
                <strong>Transparent decisions</strong>
                <p>Follow your application status as it moves through review.</p>
              </div>
            </article>
            <article className="ft-info-card">
              <span className="ft-info-symbol">◇</span>
              <div>
                <strong>Your information matters</strong>
                <p>Keep your application details accurate and up to date.</p>
              </div>
            </article>
          </div>

            <CustomerDocuments
  applications={applications}
  onRefresh={loadDashboard}
/>
          <footer className="ft-footer">
            
            <span>© {new Date().getFullYear()} FinTrust</span>
            <span>Finance, with confidence.</span>
          </footer>
        </section>
      </main>

      {showForm && (
        <div className="ft-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !submitting) setShowForm(false);
        }}>
          <section className="ft-modal" role="dialog" aria-modal="true" aria-labelledby="ft-modal-title">
            <div className="ft-modal-heading">
              <div>
                <div className="ft-eyebrow">GET STARTED</div>
                <h2 id="ft-modal-title">New loan application</h2>
                <p>Share a few details so our team can review your request.</p>
              </div>
              <button className="ft-modal-close" onClick={() => setShowForm(false)} disabled={submitting} aria-label="Close">×</button>
            </div>

            <form className="ft-form" onSubmit={submitApplication}>
              <label>
                Loan type
                <select name="loanType" value={form.loanType} onChange={updateField} required>
                  <option value="PERSONAL">Personal loan</option>
                  <option value="HOME">Home loan</option>
                  <option value="EDUCATION">Education loan</option>
                  <option value="VEHICLE">Vehicle loan</option>
                  <option value="GOLD">Gold loan</option>
                  <option value="PROPERTY">Property loan</option>
                </select>
              </label>

              <div className="ft-form-row">
                <label>
                  Requested amount (₹)
                  <input name="requestedAmount" type="number" min="1" max="100000000" step="1" value={form.requestedAmount} onChange={updateField} required />
                </label>
                <label>
                  Tenure
                  <select name="tenureMonths" value={form.tenureMonths} onChange={updateField} required>
                    {[6, 12, 18, 24, 36, 48, 60, 84, 120, 180, 240, 360].map((months) => (
                      <option key={months} value={months}>{months} months</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Loan purpose
                <textarea name="purpose" minLength="10" maxLength="500" rows="3" value={form.purpose} onChange={updateField} placeholder="Explain how you plan to use the loan (at least 10 characters)." required />
              </label>

              <label>
                Employment type
                <select name="employmentType" value={form.employmentType} onChange={updateField} required>
                  <option value="SALARIED">Salaried</option>
                  <option value="SELF_EMPLOYED">Self-employed</option>
                  <option value="STUDENT">Student</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>

              <div className="ft-form-row">
                <label>
                  Monthly income (₹)
                  <input name="monthlyIncome" type="number" min="0" max="1000000000" step="1" value={form.monthlyIncome} onChange={updateField} required />
                </label>
                <label>
                  Employer / institution
                  <input name="employerName" maxLength="120" value={form.employerName} onChange={updateField} placeholder="Optional" />
                </label>
              </div>

              <div className="ft-form-note">
                Your application will be submitted for review. Approval is subject to the FinTrust review process.
              </div>

              <div className="ft-form-actions">
                <button type="button" className="ft-secondary-button" onClick={() => setShowForm(false)} disabled={submitting}>Cancel</button>
                <button type="submit" className="ft-primary-button" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit application →"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
