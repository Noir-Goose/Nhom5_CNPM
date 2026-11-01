
import { useState } from "react";
import {
  login,
  loginWithOtp,
  requestLoginOtp,
} from "../services/authService";
import "./LoginPage.css";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [view, setView] = useState("login");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function saveSession(data) {
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));

    if (data.user.role === "admin") {
      window.location.href = "/admin";
    } else if (data.user.role === "poi_owner") {
      window.location.href = "/owner";
    } else {
      setError("Vai trò tài khoản không hợp lệ.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await login(email, password);

      saveSession(data);
    } catch (err) {
      setError(err.message || "Không thể đăng nhập. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRequestOtp(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      const data = await requestLoginOtp(email);
      setView("verify");
      setNotice(data.message);
    } catch (err) {
      setError(err.message || "Không thể gửi mã đăng nhập. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      const data = await loginWithOtp(email, otp);
      saveSession(data);
    } catch (err) {
      setError(err.message || "Mã OTP không hợp lệ hoặc đã hết hạn.");
    } finally {
      setIsLoading(false);
    }
  }

  function returnToLogin() {
    setView("login");
    setOtp("");
    setError("");
    setNotice("");
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="login-brand">
          <span className="brand-icon">Q4</span>
          <span>QUẬN 4 FOOD GUIDE</span>
        </div>

        <div className="hero-content">
          <span className="hero-eyebrow">TASTE THE LOCAL LIFE</span>

          <h1>
            Khám phá
            <br />
            hương vị <span>Quận 4.</span>
          </h1>

          <p>
            Nơi những góc phố bình dị kể câu chuyện về
            ẩm thực, con người và văn hóa địa phương.
          </p>

          <div className="hero-decoration">
            <span>Ẩm thực địa phương</span>
            <span className="decoration-dot">•</span>
            <span>Trải nghiệm chân thực</span>
          </div>
        </div>

        <div className="hero-footer">
          <span>SAIGON, VIETNAM</span>
          <span>10°45&apos; N — 106°42&apos; E</span>
        </div>
      </section>

      <section className="login-section">
        <div className="login-card">
          <div className="mobile-brand">
            <span className="brand-icon">Q4</span>
            <span>QUẬN 4 FOOD GUIDE</span>
          </div>

          <div className="login-heading">
            <span className="section-eyebrow">
              {view === "login" ? "WELCOME BACK" : "EMAIL SIGN-IN"}
            </span>
            <h2>
              {view === "login"
                ? "Chào mừng trở lại!"
                : view === "request"
                  ? "Khôi phục đăng nhập"
                  : "Nhập mã đăng nhập"}
            </h2>
            <p>
              {view === "login"
                ? "Đăng nhập để tiếp tục hành trình của bạn."
                : view === "request"
                  ? "Nhập email tài khoản để nhận mã OTP đăng nhập."
                  : "Nhập mã 6 chữ số được gửi tới email của bạn."}
            </p>
          </div>

          <form
            className="login-form"
            onSubmit={
              view === "login"
                ? handleSubmit
                : view === "request"
                  ? handleRequestOtp
                  : handleVerifyOtp
            }
          >
            <div className="form-field">
              <label htmlFor="email">Địa chỉ email</label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                readOnly={view === "verify"}
                required
              />
            </div>

            {view === "login" && (
              <div className="form-field">
                <div className="password-label">
                  <label htmlFor="password">Mật khẩu</label>
                  <button
                    className="login-inline-button"
                    type="button"
                    onClick={() => {
                      setView("request");
                      setError("");
                      setNotice("");
                    }}
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                <div className="password-input-wrap">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu của bạn"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />

                  <button
                    className="password-toggle"
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? "Ẩn" : "Hiện"}
                  </button>
                </div>
              </div>
            )}

            {view === "verify" && (
              <div className="form-field">
                <label htmlFor="login-otp">Mã OTP</label>
                <input
                  id="login-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="Nhập mã 6 chữ số"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
            )}

            {notice && (
              <div className="login-notice" role="status">
                {notice}
              </div>
            )}

            {error && (
              <div className="login-error" role="alert">
                <span aria-hidden="true">!</span>
                {error}
              </div>
            )}

            <button
              className="login-submit"
              type="submit"
              disabled={isLoading}
            >
              <span>
                {isLoading
                  ? view === "login"
                    ? "Đang đăng nhập..."
                    : view === "request"
                      ? "Đang gửi mã..."
                      : "Đang xác minh..."
                  : view === "login"
                    ? "Đăng nhập"
                    : view === "request"
                      ? "Gửi mã OTP"
                      : "Xác nhận & đăng nhập"}
              </span>
              {!isLoading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          {view !== "login" && (
            <button
              className="login-back-button"
              type="button"
              onClick={returnToLogin}
              disabled={isLoading}
            >
              Quay lại đăng nhập bằng mật khẩu
            </button>
          )}

          <div className="login-divider">
            <span>HOẶC</span>
          </div>

          <p className="register-prompt">
            Bạn muốn trở thành đối tác địa điểm?
          </p>

          <a className="register-link" href="/owner/register">
            Đăng ký POI Owner <span aria-hidden="true">↗</span>
          </a>

          <p className="login-note">
            Bằng việc đăng nhập, bạn đồng ý sử dụng hệ thống
            theo các quy định của Quận 4 Food Guide.
          </p>
        </div>

        <footer className="login-copyright">
          © 2026 Quận 4 Food Guide. Made with care in Saigon.
        </footer>
      </section>
    </main>
  );
}

export default LoginPage;
