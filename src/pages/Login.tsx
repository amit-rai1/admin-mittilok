import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Leaf } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const [emailOrPhone, setEmailOrPhone] = useState("admin@mittilok.in");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(emailOrPhone.trim(), password);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-art">
        <div className="brand">
          <span>
            <Leaf size={20} />
          </span>
          <strong>MittiLok</strong>
        </div>
        <div>
          <p className="kicker">Operations console</p>
          <h1>
            Grow the business
            <br />
            <em>behind the garden.</em>
          </h1>
          <p>Manage catalog, orders, services, content, and day-to-day nursery operations from one place.</p>
        </div>
        <small>© {new Date().getFullYear()} MittiLok Nursery</small>
      </div>
      <form className="login-card" onSubmit={(e) => void onSubmit(e)}>
        <p className="kicker">Admin sign in</p>
        <h2>Welcome back</h2>
        <p className="muted">Use your administrator credentials to continue.</p>
        <label>
          Email or phone
          <input
            value={emailOrPhone}
            onChange={(e) => setEmailOrPhone(e.target.value)}
            placeholder="admin@mittilok.in"
            required
            autoComplete="username"
          />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary-button" disabled={submitting}>
          {submitting ? "Signing in…" : "Enter dashboard"} <span>→</span>
        </button>
        <p className="login-hint">Only AdminStaff accounts with RBAC permissions can access this portal.</p>
      </form>
    </main>
  );
}
