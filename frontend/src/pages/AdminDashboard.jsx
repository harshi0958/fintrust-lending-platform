import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const number = (value) => Number(value || 0).toLocaleString("en-IN");

const currency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const date = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const dateTime = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const unwrap = (body) => body?.data?.dashboard ?? body?.dashboard ?? body?.data ?? body;
const getError = (body, fallback) => body?.message || body?.error || fallback;
const humanize = (value) => String(value || "UNKNOWN").replaceAll("_", " ");

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeView, setActiveView] = useState("overview");

  // Recent applications search used on the overview only.
  const [search, setSearch] = useState("");

  // User management state.
  const [managedUsers, setManagedUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPagination, setUsersPagination] = useState({
    page: 1, limit: 10, total: 0, totalPages: 0,
  });
  const [userSearchInput, setUserSearchInput] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [userActionId, setUserActionId] = useState("");
  const [userError, setUserError] = useState("");
  const [userNotice, setUserNotice] = useState("");

  // Application oversight state.
  const [adminApplications, setAdminApplications] = useState([]);
  const [applicationsPage, setApplicationsPage] = useState(1);
  const [applicationsPagination, setApplicationsPagination] = useState({
    page: 1, limit: 10, total: 0, totalPages: 0,
  });
  const [applicationSearchInput, setApplicationSearchInput] = useState("");
  const [applicationSearch, setApplicationSearch] = useState("");
  const [applicationStatusFilter, setApplicationStatusFilter] = useState("");
  const [applicationTypeFilter, setApplicationTypeFilter] = useState("");
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState("");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const loadDashboard = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");

    try {
      const [profileResponse, dashboardResponse] = await Promise.all([
        fetch(`${API}/auth/me`, { credentials: "include" }),
        fetch(`${API}/admin/dashboard`, { credentials: "include" }),
      ]);

      if (profileResponse.status === 401 || dashboardResponse.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      const profileBody = await profileResponse.json();
      const dashboardBody = await dashboardResponse.json();

      if (!profileResponse.ok) {
        throw new Error(getError(profileBody, "Unable to load your account."));
      }
      if (!dashboardResponse.ok) {
        throw new Error(getError(dashboardBody, "Unable to load admin analytics."));
      }

      const user =
        profileBody?.user ??
        profileBody?.data?.user ??
        profileBody?.data ??
        profileBody;

      if (user?.role && user.role !== "ADMIN") {
        navigate("/", { replace: true });
        return;
      }

      setProfile(user);
      setDashboard(unwrap(dashboardBody));
    } catch (err) {
      setError(err.message || "Could not connect to the FinTrust server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUserError("");

    try {
      const params = new URLSearchParams({
        page: String(usersPage),
        limit: "10",
      });
      if (userSearch.trim()) params.set("search", userSearch.trim());
      if (userRoleFilter) params.set("role", userRoleFilter);
      if (userStatusFilter) params.set("status", userStatusFilter);

      const response = await fetch(`${API}/admin/users?${params.toString()}`, {
        credentials: "include",
      });
      const body = await response.json();

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (!response.ok) {
        throw new Error(getError(body, "Unable to load users."));
      }

      const data = body?.data ?? body;
      const list = Array.isArray(data?.users) ? data.users : [];
      setManagedUsers(list);
      setUsersPagination(
        data?.pagination || {
          page: usersPage,
          limit: 10,
          total: list.length,
          totalPages: list.length ? 1 : 0,
        }
      );
    } catch (err) {
      setUserError(err.message || "Could not load users.");
    } finally {
      setUsersLoading(false);
    }
  }, [usersPage, userSearch, userRoleFilter, userStatusFilter, navigate]);

  const loadApplications = useCallback(async () => {
    setApplicationsLoading(true);
    setApplicationsError("");

    try {
      const params = new URLSearchParams({
        page: String(applicationsPage),
        limit: "10",
      });
      if (applicationSearch.trim()) params.set("search", applicationSearch.trim());
      if (applicationStatusFilter) params.set("status", applicationStatusFilter);
      if (applicationTypeFilter) params.set("loanType", applicationTypeFilter);

      const response = await fetch(
        `${API}/admin/applications?${params.toString()}`,
        { credentials: "include" }
      );
      const body = await response.json();

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (!response.ok) {
        throw new Error(getError(body, "Unable to load loan applications."));
      }

      const data = body?.data ?? body;
      const list = Array.isArray(data?.applications) ? data.applications : [];
      setAdminApplications(list);
      setApplicationsPagination(
        data?.pagination || {
          page: applicationsPage,
          limit: 10,
          total: list.length,
          totalPages: list.length ? 1 : 0,
        }
      );
    } catch (err) {
      setApplicationsError(err.message || "Could not load applications.");
    } finally {
      setApplicationsLoading(false);
    }
  }, [
    applicationsPage,
    applicationSearch,
    applicationStatusFilter,
    applicationTypeFilter,
    navigate,
  ]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (activeView === "users") loadUsers();
  }, [activeView, loadUsers]);

  useEffect(() => {
    if (activeView === "applications") loadApplications();
  }, [activeView, loadApplications]);

  const stats = useMemo(() => {
    const data = dashboard || {};
    return {
      totalUsers: data.totalUsers ?? data.users?.total ?? data.userStats?.total ?? 0,
      activeUsers: data.activeUsers ?? data.users?.active ?? data.userStats?.active ?? 0,
      suspendedUsers: data.suspendedUsers ?? data.users?.suspended ?? data.userStats?.suspended ?? 0,
      totalApplications: data.totalApplications ?? data.applications?.total ?? data.applicationStats?.total ?? 0,
      pending: data.pendingApplications ?? data.applications?.pending ?? data.applicationStats?.SUBMITTED ?? 0,
      approved: data.approvedApplications ?? data.applications?.approved ?? data.applicationStats?.APPROVED ?? 0,
      rejected: data.rejectedApplications ?? data.applications?.rejected ?? data.applicationStats?.REJECTED ?? 0,
      totalRequested: data.totalRequestedAmount ?? data.totalLoanAmount ?? data.loanMetrics?.totalRequestedAmount ?? 0,
    };
  }, [dashboard]);

  const recentApplications = useMemo(() => {
    const data = dashboard || {};
    const items =
      data.recentApplications ??
      data.recent?.applications ??
      data.applications?.recent ??
      [];
    const list = Array.isArray(items) ? items : [];
    if (!search.trim()) return list;

    const term = search.toLowerCase();
    return list.filter((item) =>
      [
        item.applicationNumber,
        item.applicant?.name,
        item.applicant?.email,
        item.loanType,
        item.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [dashboard, search]);

  const recentUsers = useMemo(() => {
    const data = dashboard || {};
    const items = data.recentUsers ?? data.recent?.users ?? data.users?.recent ?? [];
    return Array.isArray(items) ? items : [];
  }, [dashboard]);

  const logout = async () => {
    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadDashboard(false);
    if (activeView === "users") await loadUsers();
    if (activeView === "applications") await loadApplications();
  };

  const statusClass = (status) =>
    String(status || "UNKNOWN").toLowerCase().replaceAll("_", "-");

  const applyUserSearch = (event) => {
    event.preventDefault();
    setUsersPage(1);
    setUserSearch(userSearchInput.trim());
    setUserNotice("");
  };

  const resetUserFilters = () => {
    setUserSearchInput("");
    setUserSearch("");
    setUserRoleFilter("");
    setUserStatusFilter("");
    setUsersPage(1);
    setUserError("");
    setUserNotice("");
  };

  const updateAccountStatus = async (user) => {
    const nextStatus = user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    const userId = user._id || user.id;

    if (!userId) {
      setUserError("This user record has no valid ID.");
      return;
    }
    if (String(userId) === String(profile?._id || profile?.id || "")) {
      setUserError("You cannot change your own account status.");
      return;
    }
    if (user.role === "ADMIN") {
      setUserError("Admin accounts cannot be changed here.");
      return;
    }
    if (
      !window.confirm(
        `Are you sure you want to ${nextStatus === "SUSPENDED" ? "suspend" : "activate"} ${user.name || "this user"}?`
      )
    ) return;

    setUserActionId(String(userId));
    setUserError("");
    setUserNotice("");

    try {
      const response = await fetch(
        `${API}/admin/users/${encodeURIComponent(userId)}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      const body = await response.json();

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (!response.ok) {
        throw new Error(getError(body, "Unable to update account status."));
      }

      setUserNotice(body?.message || `Account ${nextStatus.toLowerCase()} successfully.`);
      await loadUsers();
      await loadDashboard(false);
    } catch (err) {
      setUserError(err.message || "Account status could not be updated.");
    } finally {
      setUserActionId("");
    }
  };

  const applyApplicationSearch = (event) => {
    event.preventDefault();
    setApplicationsPage(1);
    setApplicationSearch(applicationSearchInput.trim());
  };

  const resetApplicationFilters = () => {
    setApplicationSearchInput("");
    setApplicationSearch("");
    setApplicationStatusFilter("");
    setApplicationTypeFilter("");
    setApplicationsPage(1);
    setApplicationsError("");
  };

  const openApplicationDetails = async (application) => {
    const id = application?._id || application?.id;
    if (!id) {
      setDetailsError("This application has no valid ID.");
      return;
    }

    setSelectedApplication(application);
    setDetailsLoading(true);
    setDetailsError("");

    try {
      const response = await fetch(
        `${API}/admin/applications/${encodeURIComponent(id)}`,
        { credentials: "include" }
      );
      const body = await response.json();

      if (response.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (!response.ok) {
        throw new Error(getError(body, "Unable to load application details."));
      }

      const data = body?.data ?? body;
      setSelectedApplication(data?.application ?? data);
    } catch (err) {
      setDetailsError(err.message || "Could not load application details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeApplicationDetails = () => {
    setSelectedApplication(null);
    setDetailsError("");
    setDetailsLoading(false);
  };

  const renderApplicationsTable = (items, emptyMessage, showViewButton = false) => (
    <div className="ad-table-wrap">
      <table className="ad-table">
        <thead>
          <tr>
            <th>Application</th>
            <th>Applicant</th>
            <th>Loan type</th>
            <th>Amount requested</th>
            <th>Status</th>
            <th>Submitted</th>
            {showViewButton && <th>Details</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((application, index) => (
            <tr key={application._id || application.id || application.applicationNumber || index}>
              <td>
                <strong>
                  {application.applicationNumber ||
                    String(application._id || application.id || "—").slice(-8)}
                </strong>
              </td>
              <td>
                <div className="ad-applicant">
                  <strong>
                    {application.applicant?.name || application.applicantName || "Applicant"}
                  </strong>
                  <span>{application.applicant?.email || application.email || "—"}</span>
                </div>
              </td>
              <td>{humanize(application.loanType)}</td>
              <td>{currency(application.requestedAmount)}</td>
              <td>
                <span className={`ad-status ${statusClass(application.status)}`}>
                  {humanize(application.status)}
                </span>
              </td>
              <td>{date(application.createdAt)}</td>
              {showViewButton && (
                <td>
                  <button
                    type="button"
                    className="ad-view-details"
                    onClick={() => openApplicationDetails(application)}
                  >
                    View details
                  </button>
                </td>
              )}
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={showViewButton ? 7 : 6} className="ad-empty">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="ad-layout">
      <aside className="ad-sidebar">
        <div className="ad-brand">
          <div className="ad-brand-mark">F</div>
          <div>
            <strong>FinTrust</strong>
            <span>FINANCE, WITH CONFIDENCE</span>
          </div>
        </div>

        <div className="ad-side-label">ADMINISTRATION</div>

        <button
          className={`ad-nav-item ${activeView === "overview" ? "active" : ""}`}
          onClick={() => setActiveView("overview")}
        >
          <span>▦</span> Overview
        </button>

        <button
          className={`ad-nav-item ${activeView === "applications" ? "active" : ""}`}
          onClick={() => setActiveView("applications")}
        >
          <span>▤</span> Applications
        </button>

        <button
          className={`ad-nav-item ${activeView === "users" ? "active" : ""}`}
          onClick={() => setActiveView("users")}
        >
          <span>♙</span> User management
        </button>

        <div className="ad-sidebar-bottom">
          <div className="ad-profile">
            <div className="ad-avatar">
              {(profile?.name || "A").charAt(0).toUpperCase()}
            </div>
            <div className="ad-profile-copy">
              <strong>{profile?.name || "Administrator"}</strong>
              <span>System administrator</span>
            </div>
          </div>
          <button className="ad-logout" onClick={logout}>↪ Sign out</button>
        </div>
      </aside>

      <main className="ad-main">
        <header className="ad-topbar">
          <div>
            <div className="ad-breadcrumb">FinTrust <span>/</span> Administration</div>
            <h1>
              {activeView === "users"
                ? "User management"
                : activeView === "applications"
                ? "Loan applications"
                : "Admin overview"}
            </h1>
          </div>
          <button className="ad-refresh" onClick={refresh} disabled={refreshing || loading}>
            {refreshing ? "Refreshing…" : "↻ Refresh data"}
          </button>
        </header>

        <section className="ad-content">
          {error && (
            <div className="ad-error" role="alert">
              <div>
                <strong>Dashboard couldn't load</strong>
                <p>{error}</p>
              </div>
              <button onClick={() => loadDashboard()}>Try again</button>
            </div>
          )}

          {loading ? (
            <div className="ad-loading">
              <div className="ad-spinner" />
              <p>Loading your administration workspace…</p>
            </div>
          ) : (
            <>
              {activeView === "overview" && (
                <>
                  <div className="ad-welcome">
                    <div>
                      <span className="ad-eyebrow">CONTROL CENTER</span>
                      <h2>
                        Welcome back{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}.
                      </h2>
                      <p>Monitor platform activity and lending operations from one workspace.</p>
                    </div>
                    <div className="ad-welcome-icon">⌘</div>
                  </div>

                  <div className="ad-stats-grid">
                    <article className="ad-stat-card">
                      <div className="ad-stat-top"><span>Total users</span><span className="ad-stat-icon">♙</span></div>
                      <strong>{number(stats.totalUsers)}</strong>
                      <small>{number(stats.activeUsers)} active accounts</small>
                    </article>
                    <article className="ad-stat-card">
                      <div className="ad-stat-top"><span>Loan applications</span><span className="ad-stat-icon">▤</span></div>
                      <strong>{number(stats.totalApplications)}</strong>
                      <small>{number(stats.pending)} awaiting review</small>
                    </article>
                    <article className="ad-stat-card">
                      <div className="ad-stat-top"><span>Approved loans</span><span className="ad-stat-icon">✓</span></div>
                      <strong>{number(stats.approved)}</strong>
                      <small>Applications approved</small>
                    </article>
                    <article className="ad-stat-card">
                      <div className="ad-stat-top"><span>Suspended users</span><span className="ad-stat-icon">!</span></div>
                      <strong>{number(stats.suspendedUsers)}</strong>
                      <small>Accounts not active</small>
                    </article>
                  </div>

                  <div className="ad-insights-grid">
                    <article className="ad-panel ad-loan-summary">
                      <div className="ad-panel-heading">
                        <div><h3>Application overview</h3><p>Current lending portfolio activity</p></div>
                        <span className="ad-live-dot">Live data</span>
                      </div>
                      <div className="ad-summary-amount">{currency(stats.totalRequested)}</div>
                      <p className="ad-muted">Total requested loan amount</p>
                      <div className="ad-progress-list">
                        {[
                          ["Pending review", stats.pending, "pending"],
                          ["Approved", stats.approved, "approved"],
                          ["Rejected", stats.rejected, "rejected"],
                        ].map(([label, value, className]) => (
                          <div className="ad-progress-row" key={className}>
                            <div><span>{label}</span><strong>{number(value)}</strong></div>
                            <div className="ad-progress-track">
                              <div
                                className={className}
                                style={{
                                  width: `${stats.totalApplications ? Math.min(100, (value / stats.totalApplications) * 100) : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className="ad-panel ad-user-summary">
                      <div className="ad-panel-heading">
                        <div><h3>Account health</h3><p>User account status</p></div>
                        <span className="ad-user-icon">♙</span>
                      </div>
                      <div className="ad-health-total">
                        {number(stats.totalUsers)}<span>Total registered users</span>
                      </div>
                      <div className="ad-health-row">
                        <span><i className="ad-dot active-dot" />Active accounts</span>
                        <strong>{number(stats.activeUsers)}</strong>
                      </div>
                      <div className="ad-health-row">
                        <span><i className="ad-dot suspended-dot" />Suspended accounts</span>
                        <strong>{number(stats.suspendedUsers)}</strong>
                      </div>
                      <div className="ad-health-note">
                        Manage customer and loan-manager accounts from User Management.
                      </div>
                    </article>
                  </div>

                  <section className="ad-panel ad-table-panel">
                    <div className="ad-panel-heading ad-table-heading">
                      <div><h3>Recent applications</h3><p>Latest loan applications recorded by FinTrust</p></div>
                      <input
                        className="ad-search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search recent applications…"
                      />
                    </div>
                    {renderApplicationsTable(
                      recentApplications,
                      search ? "No applications match your search." : "No recent applications were returned by the API."
                    )}
                  </section>
                </>
              )}

              {activeView === "applications" && (
                <section className="ad-panel ad-table-panel ad-oversight-panel">
                  <div className="ad-panel-heading ad-table-heading">
                    <div>
                      <h3>All loan applications</h3>
                      <p>Search, filter and inspect applications across FinTrust.</p>
                    </div>
                    <span className="ad-live-dot">
                      {number(applicationsPagination.total)} records
                    </span>
                  </div>

                  <form className="ad-application-filters" onSubmit={applyApplicationSearch}>
                    <input
                      className="ad-search"
                      value={applicationSearchInput}
                      onChange={(event) => setApplicationSearchInput(event.target.value)}
                      placeholder="Search application number or applicant…"
                    />
                    <select
                      className="ad-filter-select"
                      value={applicationStatusFilter}
                      onChange={(event) => {
                        setApplicationsPage(1);
                        setApplicationStatusFilter(event.target.value);
                      }}
                    >
                      <option value="">All statuses</option>
                      <option value="SUBMITTED">Submitted</option>
                      <option value="UNDER_REVIEW">Under review</option>
                      <option value="MORE_INFO_REQUIRED">More info required</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                    <select
                      className="ad-filter-select"
                      value={applicationTypeFilter}
                      onChange={(event) => {
                        setApplicationsPage(1);
                        setApplicationTypeFilter(event.target.value);
                      }}
                    >
                      <option value="">All loan types</option>
                      <option value="PERSONAL">Personal</option>
                      <option value="HOME">Home</option>
                      <option value="EDUCATION">Education</option>
                      <option value="VEHICLE">Vehicle</option>
                      <option value="GOLD">Gold</option>
                      <option value="PROPERTY">Property</option>
                    </select>
                    <button className="ad-filter-button" type="submit">Search</button>
                    <button className="ad-reset-button" type="button" onClick={resetApplicationFilters}>Reset</button>
                  </form>

                  {applicationsError && (
                    <div className="ad-user-error" role="alert">
                      <span>{applicationsError}</span>
                      <button type="button" onClick={loadApplications}>Retry</button>
                    </div>
                  )}

                  {applicationsLoading ? (
                    <div className="ad-loading"><div className="ad-spinner" /><p>Loading applications…</p></div>
                  ) : renderApplicationsTable(
                    adminApplications,
                    "No applications match the selected filters.",
                    true
                  )}

                  <div className="ad-pagination">
                    <span>
                      {applicationsPagination.total === 0
                        ? "No records"
                        : `Showing ${(applicationsPage - 1) * 10 + 1}–${Math.min(applicationsPage * 10, applicationsPagination.total)} of ${number(applicationsPagination.total)} applications`}
                    </span>
                    <div className="ad-pagination-actions">
                      <button
                        type="button"
                        disabled={applicationsPage <= 1 || applicationsLoading}
                        onClick={() => setApplicationsPage((page) => Math.max(1, page - 1))}
                      >Previous</button>
                      <span>Page {applicationsPage} of {Math.max(1, applicationsPagination.totalPages || 1)}</span>
                      <button
                        type="button"
                        disabled={applicationsLoading || applicationsPage >= (applicationsPagination.totalPages || 1)}
                        onClick={() => setApplicationsPage((page) => page + 1)}
                      >Next</button>
                    </div>
                  </div>
                </section>
              )}

              {activeView === "users" && (
                <section className="ad-panel ad-table-panel ad-users-panel">
                  <div className="ad-panel-heading ad-table-heading">
                    <div><h3>User management</h3><p>Search accounts and manage customer or loan-manager access.</p></div>
                    <span className="ad-live-dot">{number(usersPagination.total)} users</span>
                  </div>

                  <form className="ad-user-filters" onSubmit={applyUserSearch}>
                    <input
                      className="ad-search"
                      value={userSearchInput}
                      onChange={(event) => setUserSearchInput(event.target.value)}
                      placeholder="Search name, email or phone…"
                    />
                    <select className="ad-filter-select" value={userRoleFilter} onChange={(event) => {
                      setUsersPage(1);
                      setUserRoleFilter(event.target.value);
                    }}>
                      <option value="">All roles</option>
                      <option value="CUSTOMER">Customer</option>
                      <option value="LOAN_MANAGER">Loan manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <select className="ad-filter-select" value={userStatusFilter} onChange={(event) => {
                      setUsersPage(1);
                      setUserStatusFilter(event.target.value);
                    }}>
                      <option value="">All statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                    <button className="ad-filter-button" type="submit">Search</button>
                    <button className="ad-reset-button" type="button" onClick={resetUserFilters}>Reset</button>
                  </form>

                  {userNotice && <div className="ad-user-notice" role="status">{userNotice}</div>}
                  {userError && <div className="ad-user-error" role="alert"><span>{userError}</span><button type="button" onClick={() => setUserError("")}>×</button></div>}

                  {usersLoading ? (
                    <div className="ad-loading"><div className="ad-spinner" /><p>Loading users…</p></div>
                  ) : (
                    <div className="ad-table-wrap">
                      <table className="ad-table">
                        <thead><tr><th>User</th><th>Phone</th><th>Role</th><th>Status</th><th>Registered</th><th>Action</th></tr></thead>
                        <tbody>
                          {managedUsers.map((user) => {
                            const userId = String(user._id || user.id || "");
                            const isSelf = userId && userId === String(profile?._id || profile?.id || "");
                            const protectedAccount = user.role === "ADMIN" || isSelf;
                            return (
                              <tr key={userId || user.email}>
                                <td>
                                  <div className="ad-managed-user">
                                    <div className="ad-managed-avatar">{(user.name || "U").charAt(0).toUpperCase()}</div>
                                    <div><strong>{user.name || "—"}</strong><span>{user.email || "—"}</span></div>
                                  </div>
                                </td>
                                <td>{user.phone || "—"}</td>
                                <td><span className="ad-role">{humanize(user.role)}</span></td>
                                <td><span className={`ad-status ${statusClass(user.status)}`}>{humanize(user.status)}</span></td>
                                <td>{date(user.createdAt)}</td>
                                <td>
                                  {protectedAccount ? (
                                    <span className="ad-action-unavailable">Protected</span>
                                  ) : (
                                    <button
                                      type="button"
                                      className={`ad-account-action ${user.status === "SUSPENDED" ? "activate" : "suspend"}`}
                                      disabled={userActionId === userId}
                                      onClick={() => updateAccountStatus(user)}
                                    >
                                      {userActionId === userId ? "Saving…" : user.status === "SUSPENDED" ? "Activate" : "Suspend"}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {managedUsers.length === 0 && (
                            <tr><td colSpan="6" className="ad-empty">No users match the selected filters.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="ad-pagination">
                    <span>
                      {usersPagination.total === 0
                        ? "No records"
                        : `Showing ${(usersPage - 1) * 10 + 1}–${Math.min(usersPage * 10, usersPagination.total)} of ${number(usersPagination.total)} users`}
                    </span>
                    <div className="ad-pagination-actions">
                      <button type="button" disabled={usersPage <= 1 || usersLoading} onClick={() => setUsersPage((page) => Math.max(1, page - 1))}>Previous</button>
                      <span>Page {usersPage} of {Math.max(1, usersPagination.totalPages || 1)}</span>
                      <button type="button" disabled={usersLoading || usersPage >= (usersPagination.totalPages || 1)} onClick={() => setUsersPage((page) => page + 1)}>Next</button>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </section>
      </main>

      {selectedApplication && (
        <div className="ad-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeApplicationDetails();
        }}>
          <section className="ad-application-modal" role="dialog" aria-modal="true" aria-labelledby="ad-application-modal-title">
            <div className="ad-modal-header">
              <div>
                <span className="ad-eyebrow">APPLICATION DETAILS</span>
                <h2 id="ad-application-modal-title">
                  {selectedApplication.applicationNumber || `Application ${String(selectedApplication._id || "").slice(-8)}`}
                </h2>
              </div>
              <button type="button" className="ad-modal-close" onClick={closeApplicationDetails} aria-label="Close details">×</button>
            </div>

            {detailsError && <div className="ad-user-error" role="alert">{detailsError}</div>}
            {detailsLoading ? (
              <div className="ad-loading"><div className="ad-spinner" /><p>Loading application details…</p></div>
            ) : (
              <div className="ad-modal-content">
                <div className="ad-detail-status-row">
                  <span className={`ad-status ${statusClass(selectedApplication.status)}`}>{humanize(selectedApplication.status)}</span>
                  <span className="ad-detail-date">Submitted {dateTime(selectedApplication.createdAt)}</span>
                </div>

                <h3>Applicant information</h3>
                <div className="ad-detail-grid">
                  <div><span>Full name</span><strong>{selectedApplication.applicant?.name || selectedApplication.applicantName || "—"}</strong></div>
                  <div><span>Email</span><strong>{selectedApplication.applicant?.email || selectedApplication.email || "—"}</strong></div>
                  <div><span>Phone</span><strong>{selectedApplication.applicant?.phone || selectedApplication.phone || "—"}</strong></div>
                  <div><span>Employment type</span><strong>{humanize(selectedApplication.employmentType)}</strong></div>
                  <div><span>Employer</span><strong>{selectedApplication.employerName || "—"}</strong></div>
                  <div><span>Monthly income</span><strong>{selectedApplication.monthlyIncome == null ? "—" : currency(selectedApplication.monthlyIncome)}</strong></div>
                </div>

                <h3>Loan information</h3>
                <div className="ad-detail-grid">
                  <div><span>Loan type</span><strong>{humanize(selectedApplication.loanType)}</strong></div>
                  <div><span>Requested amount</span><strong>{currency(selectedApplication.requestedAmount)}</strong></div>
                  <div><span>Tenure</span><strong>{selectedApplication.tenureMonths ? `${selectedApplication.tenureMonths} months` : "—"}</strong></div>
                  <div><span>Reviewed by</span><strong>{selectedApplication.reviewedBy?.name || "Not reviewed"}</strong></div>
                </div>

                <div className="ad-detail-description">
                  <span>Purpose</span>
                  <p>{selectedApplication.purpose || "No purpose provided."}</p>
                </div>

                {selectedApplication.reviewNotes && (
                  <div className="ad-detail-description">
                    <span>Review notes</span>
                    <p>{selectedApplication.reviewNotes}</p>
                  </div>
                )}

                {Array.isArray(selectedApplication.decisionHistory) && selectedApplication.decisionHistory.length > 0 && (
                  <>
                    <h3>Decision history</h3>
                    <div className="ad-decision-history">
                      {selectedApplication.decisionHistory.map((item, index) => (
                        <div className="ad-decision-item" key={item._id || `${item.actionAt || "history"}-${index}`}>
                          <span className={`ad-status ${statusClass(item.status || item.action)}`}>{humanize(item.status || item.action)}</span>
                          <strong>{item.actor?.name || item.actorName || "Staff member"}</strong>
                          <span>{dateTime(item.actionAt)}</span>
                          {item.notes && <p>{item.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="ad-modal-footer">
              <button type="button" className="ad-reset-button" onClick={closeApplicationDetails}>Close</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
