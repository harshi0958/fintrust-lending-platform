
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileCheck2,
  Fingerprint,
  HandCoins,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";

import api, { getApiError } from "./lib/api";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";
import CustomerDashboard from "./pages/CustomerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";

const roleHomes = {
  CUSTOMER: "/customer",
  LOAN_MANAGER: "/manager",
  ADMIN: "/admin",
};

function Brand({ light = false }) {
  return (
    <Link to="/" className={`brand ${light ? "brand-light" : ""}`}>
      <span className="brand-mark">
        <HandCoins size={23} strokeWidth={2.2} />
      </span>
      <span>
        FinTrust
        <small>FINANCE, WITH CONFIDENCE</small>
      </span>
    </Link>
  );
}

function PublicNav() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <header className="site-header">
      <div className="container nav-inner">
        <Brand />
        <button
          className="mobile-menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <nav className={`nav-links ${menuOpen ? "nav-open" : ""}`}>
          <a href="/#solutions" onClick={() => setMenuOpen(false)}>
            Solutions
          </a>
          <a href="/#how-it-works" onClick={() => setMenuOpen(false)}>
            How it works
          </a>
          <a href="/#trust" onClick={() => setMenuOpen(false)}>
            Why FinTrust
          </a>

          {user ? (
            <>
              <Link
                className="button button-primary nav-cta"
                to={roleHomes[user.role] || "/"}
              >
                My dashboard <ArrowRight size={16} />
              </Link>
              <button className="button button-quiet" onClick={handleLogout}>
                <LogOut size={16} /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link className="nav-login" to="/login">
                Log in
              </Link>
              <Link className="button button-primary nav-cta" to="/register">
                Get started <ArrowRight size={16} />
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function LandingPage() {
  const { user } = useAuth();

  return (
    <>
      <PublicNav />
      <main>
        <section className="hero-section">
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">
                <Sparkles size={15} /> A smarter way to borrow
              </div>
              <h1>
                Your goals deserve
                <br />
                <span>a stronger</span> financial future.
              </h1>
              <p className="hero-description">
                Explore flexible loan options, track your application, and
                manage your borrowing journey in one secure place.
              </p>

              <div className="hero-actions">
                <Link
                  className="button button-primary button-large"
                  to={user ? roleHomes[user.role] || "/login" : "/register"}
                >
                  {user ? "Open dashboard" : "Start your application"}
                  <ArrowRight size={18} />
                </Link>
                <a className="text-link" href="#how-it-works">
                  See how it works <ChevronRight size={17} />
                </a>
              </div>

              <div className="hero-proof">
                <span className="proof-icon">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <strong>Security-first experience</strong>
                  <p>Designed around transparency and control</p>
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="visual-glow" />
              <div className="finance-card">
                <div className="finance-card-top">
                  <div>
                    <span className="muted-label">YOUR FINANCIAL JOURNEY</span>
                    <h3>Built around you.</h3>
                  </div>
                  <span className="card-icon"><Wallet size={22} /></span>
                </div>
                <div className="visual-chart">
                  <div className="chart-caption">
                    <span>Plan with clarity</span>
                    <span className="chart-trend"><ArrowUpRight size={14} /> Stay informed</span>
                  </div>
                  <svg viewBox="0 0 400 140" role="img" aria-label="Illustrative financial progress chart">
                    <defs>
                      <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#83d8b1" stopOpacity=".4" />
                        <stop offset="100%" stopColor="#83d8b1" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[30, 65, 100, 135].map((y) => (
                      <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#e9efeb" strokeDasharray="4 6" />
                    ))}
                    <path d="M0 112 C35 108 45 82 82 91 S130 101 164 65 S220 78 253 48 S315 65 350 23 S382 32 400 10 L400 140 L0 140Z" fill="url(#chartFill)" />
                    <path d="M0 112 C35 108 45 82 82 91 S130 101 164 65 S220 78 253 48 S315 65 350 23 S382 32 400 10" fill="none" stroke="#16845d" strokeWidth="3.5" strokeLinecap="round" />
                    <circle cx="350" cy="23" r="5" fill="#16845d" stroke="white" strokeWidth="3" />
                  </svg>
                </div>
                <div className="visual-stat-row">
                  <div className="visual-stat">
                    <span>Application</span>
                    <strong><FileCheck2 size={16} /> Trackable</strong>
                  </div>
                  <div className="visual-stat">
                    <span>Process</span>
                    <strong><ShieldCheck size={16} /> Transparent</strong>
                  </div>
                </div>
              </div>

              <div className="floating-note floating-note-top">
                <span className="floating-note-icon"><CheckCircle2 size={18} /></span>
                <span><strong>One clear journey</strong><small>From application to decision</small></span>
              </div>
              <div className="floating-note floating-note-bottom">
                <span className="floating-note-icon purple"><LockKeyhole size={18} /></span>
                <span><strong>Your data matters</strong><small>Protected account access</small></span>
              </div>
            </div>
          </div>
          <div className="hero-bottom-line" />
        </section>

        <section className="trust-strip" id="trust">
          <div className="container trust-strip-inner">
            <span>FINANCIAL CLARITY, BUILT IN</span>
            <div><ShieldCheck size={19} /> Security-conscious</div>
            <div><FileCheck2 size={19} /> Clear application status</div>
            <div><Users size={19} /> A guided experience</div>
          </div>
        </section>

        <section className="section solutions-section" id="solutions">
          <div className="container">
            <div className="section-heading">
              <div>
                <div className="eyebrow"><Sparkles size={14} /> Lending solutions</div>
                <h2>Finance for what<br />comes next.</h2>
              </div>
              <p>
                Start with the goal. Explore the options. Keep your application
                journey organised from one place.
              </p>
            </div>

            <div className="solution-grid">
              <SolutionCard
                icon={<BriefcaseBusiness size={22} />}
                tag="PERSONAL FINANCE"
                title="Personal loans"
                description="Explore financing for planned expenses and important life milestones."
                tone="green"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              />
              <SolutionCard
                icon={<Banknote size={22} />}
                tag="PROPERTY FINANCE"
                title="Property loans"
                description="Organise your property-finance application and supporting documents."
                tone="blue"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              />
              <SolutionCard
                icon={<Fingerprint size={22} />}
                tag="SECURED FINANCE"
                title="Gold-backed loans"
                description="Explore a secured-loan workflow with clear review and status tracking."
                tone="gold"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              />
            </div>
            <p className="prototype-note">
              FinTrust is an academic project prototype. Product terms, eligibility
              and approvals are illustrative and require verification before any
              real-world use.
            </p>
          </div>
        </section>

        <section className="section process-section" id="how-it-works">
          <div className="container process-layout">
            <div className="process-intro">
              <div className="eyebrow"><BadgeCheck size={15} /> Simple by design</div>
              <h2>A clearer path from plan to progress.</h2>
              <p>
                Keep the important steps together. Your dashboard helps you
                follow the process without losing track of the details.
              </p>
              <Link className="button button-dark" to={user ? roleHomes[user.role] || "/login" : "/register"}>
                Explore your workspace <ArrowRight size={17} />
              </Link>
            </div>

            <div className="process-steps">
              <ProcessStep number="01" title="Create your account" text="Set up your secure account and access your workspace." />
              <ProcessStep number="02" title="Submit your application" text="Provide application details and the requested documents." />
              <ProcessStep number="03" title="Follow the review" text="Track the application as the authorised team reviews it." />
              <ProcessStep number="04" title="Stay up to date" text="See status updates and next steps from your dashboard." />
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="container cta-inner">
            <div>
              <span className="cta-kicker">YOUR NEXT STEP STARTS HERE</span>
              <h2>Make room for what matters.</h2>
              <p>Bring your application journey into one organised workspace.</p>
            </div>
            <Link className="button button-white button-large" to={user ? roleHomes[user.role] || "/login" : "/register"}>
              {user ? "Go to dashboard" : "Create your account"} <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <Brand light />
          <span>Â© {new Date().getFullYear()} FinTrust Â· Academic project prototype</span>
          <a href="#trust">Built around trust <ShieldCheck size={15} /></a>
        </div>
      </footer>
    </>
  );
}

function SolutionCard({ icon, tag, title, description, tone, onClick }) {
  return (
    <button className="solution-card" onClick={onClick}>
      <span className={`solution-icon ${tone}`}>{icon}</span>
      <span className="solution-tag">{tag}</span>
      <strong>{title}</strong>
      <span className="solution-description">{description}</span>
      <span className="solution-link">Explore process <ArrowUpRight size={17} /></span>
    </button>
  );
}

function ProcessStep({ number, title, text }) {
  return (
    <div className="process-step">
      <span className="process-number">{number}</span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <ChevronRight className="process-chevron" size={20} />
    </div>
  );
}

function AuthLayout({ mode }) {
  const isLogin = mode === "login";
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!isLogin && form.password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }

    setBusy(true);

    try {
      const user = isLogin
        ? await login({
    identifier: form.email,
    password: form.password,
  })
        : await register({
            name: form.name,
            email: form.email,
            phone: form.phone,
            password: form.password,
          });

      navigate(roleHomes[user.role] || "/", { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-topbar">
        <Brand />
        <Link className="auth-back-link" to="/">
          <ArrowRight size={15} className="back-arrow" /> Back to home
        </Link>
      </div>

      <div className="auth-layout">
        <section className="auth-promo">
          <div className="auth-promo-content">
            <span className="auth-promo-label"><ShieldCheck size={16} /> YOUR FINANCIAL WORKSPACE</span>
            <h1>{isLogin ? "Good to have you back." : "A better way to move forward."}</h1>
            <p>
              {isLogin
                ? "Sign in to pick up where you left off and keep your application journey on track."
                : "Create your account to organise your details and begin your lending journey."}
            </p>

            <div className="auth-feature-list">
              <div><span><FileCheck2 size={18} /></span><div><strong>One organised workspace</strong><small>Your application and its progress in one place</small></div></div>
              <div><span><LockKeyhole size={18} /></span><div><strong>Protected sign-in</strong><small>Secure, cookie-based account sessions</small></div></div>
              <div><span><Clock3 size={18} /></span><div><strong>Clear next steps</strong><small>Keep track of what happens next</small></div></div>
            </div>
          </div>
          <div className="auth-promo-footer"><span>FINTRUST</span><span>FINANCE, WITH CONFIDENCE</span></div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-form-wrap">
            <span className="form-overline">{isLogin ? "WELCOME BACK" : "GET STARTED"}</span>
            <h2>{isLogin ? "Sign in to FinTrust" : "Create your account"}</h2>
            <p className="auth-subtitle">
              {isLogin
                ? "Enter your account details below."
                : "It only takes a few details to get started."}
            </p>

            {error && (
              <div className="form-error" role="alert">
                <CircleHelp size={18} /> <span>{error}</span>
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
              {!isLogin && (
                <label className="field-label">
                  Full name
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </label>
              )}

              <label className="field-label">
  {isLogin ? "Username or email address" : "Email address"}
  <input
    name="email"
    type={isLogin ? "text" : "email"}
    value={form.email}
    onChange={updateField}
    placeholder={
      isLogin ? "Enter username or email" : "you@example.com"
    }
    autoComplete={isLogin ? "username" : "email"}
    maxLength={254}
    required
  />
</label>

              {!isLogin && (
                <label className="field-label">
                  Mobile number
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={updateField}
                    placeholder="Enter your mobile number"
                    autoComplete="tel"
                    minLength={8}
                    maxLength={20}
                    required
                  />
                </label>
              )}

              <label className="field-label">
                Password
                <span className="password-input-wrap">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={updateField}
                    placeholder={isLogin ? "Enter your password" : "At least 8 characters"}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    minLength={isLogin ? undefined : 8}
                    maxLength={72}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </span>
              </label>

              {!isLogin && (
                <p className="terms-note">
                  By creating an account, you agree to use this academic prototype
                  responsibly. Do not upload real financial or identity documents.
                </p>
              )}

              <button className="button button-primary auth-submit" disabled={busy}>
                {busy ? (
                  <><span className="button-spinner" /> Please wait...</>
                ) : (
                  <>{isLogin ? "Sign in securely" : "Create account"} <ArrowRight size={17} /></>
                )}
              </button>
            </form>

            <p className="auth-switch">
              {isLogin ? "New to FinTrust?" : "Already have an account?"}{" "}
              <Link to={isLogin ? "/register" : "/login"}>
                {isLogin ? "Create an account" : "Sign in"}
              </Link>
            </p>
            <p className="auth-security-note"><LockKeyhole size={14} /> Your password is never returned by the API.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate("/", { replace: true });
    }
  }

  const roleNames = {
    CUSTOMER: "Customer workspace",
    LOAN_MANAGER: "Loan management",
    ADMIN: "Administration",
  };

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Brand />
        <div className="sidebar-workspace-label">WORKSPACE</div>
        <div className="sidebar-current">
          <LayoutDashboard size={18} />
          <span>{roleNames[user.role]}</span>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-profile">
            <div className="avatar">{user.name?.charAt(0)?.toUpperCase() || "F"}</div>
            <div className="sidebar-profile-text">
              <strong>{user.name}</strong>
              <span>{user.role.replaceAll("_", " ")}</span>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <span className="dashboard-breadcrumb">FINTRUST / WORKSPACE</span>
            <h1>{roleNames[user.role]}</h1>
          </div>
          <div className="dashboard-top-actions">
            <span className="secure-indicator"><ShieldCheck size={16} /> Secure session</span>
            <div className="avatar avatar-small">{user.name?.charAt(0)?.toUpperCase() || "F"}</div>
          </div>
        </header>
        <div className="dashboard-content">
          <div className="welcome-banner">
            <div>
              <span className="welcome-overline">YOUR FINTRUST OVERVIEW</span>
              <h2>Welcome, {user.name?.split(" ")[0] || "there"}.</h2>
              <p>Your workspace is ready. Here is where your lending journey will live.</p>
            </div>
            <div className="welcome-decoration"><HandCoins size={76} strokeWidth={1.1} /></div>
          </div>

          {user.role === "CUSTOMER" && <CustomerDashboard />}
          {user.role === "LOAN_MANAGER" && <ManagerDashboard />}
          {user.role === "ADMIN" && <AdminDashboard />}

          <div className="dashboard-footnote">
            <ShieldCheck size={16} />
            <span>FinTrust is an academic prototype. This dashboard does not represent a real loan approval or financial offer.</span>
          </div>
        </div>
      </main>
    </div>
  );
}




function AppRoutes() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          loading ? (
            <div className="app-loading"><div className="loading-spinner" /><p>Loading FinTrust...</p></div>
          ) : (
            <LandingPage />
          )
        }
      />
      <Route
        path="/login"
        element={
          loading ? <div className="app-loading"><div className="loading-spinner" /></div>
          : user ? <Navigate to={roleHomes[user.role] || "/"} replace />
          : <AuthLayout mode="login" />
        }
      />
      <Route
        path="/register"
        element={
          loading ? <div className="app-loading"><div className="loading-spinner" /></div>
          : user ? <Navigate to={roleHomes[user.role] || "/"} replace />
          : <AuthLayout mode="register" />
        }
      />

      <Route element={<ProtectedRoute allowedRoles={["CUSTOMER"]} />}>
        <Route path="/customer" element={<DashboardLayout />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["LOAN_MANAGER"]} />}>
        <Route path="/manager" element={<DashboardLayout />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
        <Route path="/admin" element={<DashboardLayout />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

