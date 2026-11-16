
import { useState } from "react";
import {
  login,
  loginWithOtp,
  requestPasswordReset,
  requestLoginOtp,
  resetPassword,
} from "../services/authService";
import "./LoginPage.css";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      setView("login-otp-verify");
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

  async function handleRequestPasswordReset(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      const data = await requestPasswordReset(email);
      setView("password-reset-verify");
      setNotice(data.message);
    } catch (err) {
      setError(err.message || "Không thể gửi mã đặt lại mật khẩu. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsLoading(true);
    try {
      const data = await resetPassword(email, otp, newPassword);
      setView("login");
      setPassword("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice(data.message);
    } catch (err) {
      setError(err.message || "Không thể đặt lại mật khẩu. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }

  function returnToLogin() {
    setView("login");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setNotice("");
  }

  const submitHandlers = {
    login: handleSubmit,
    "login-otp-request": handleRequestOtp,
    "login-otp-verify": handleVerifyOtp,
    "password-reset-request": handleRequestPasswordReset,
    "password-reset-verify": handleResetPassword,
  };
  const viewContent = {
    login: {
      eyebrow: "WELCOME BACK",
      title: "Ch\u00e0o m\u1eebng tr\u1edf l\u1ea1i!",
      description: "\u0110\u0103ng nh\u1eadp \u0111\u1ec3 ti\u1ebfp t\u1ee5c h\u00e0nh tr\u00ecnh c\u1ee7a b\u1ea1n.",
      submit: "\u0110\u0103ng nh\u1eadp",
      loading: "\u0110ang \u0111\u0103ng nh\u1eadp...",
    },
    "login-otp-request": {
      eyebrow: "EMAIL SIGN-IN",
      title: "\u0110\u0103ng nh\u1eadp b\u1eb1ng OTP",
      description: "Nh\u1eadp email t\u00e0i kho\u1ea3n \u0111\u1ec3 nh\u1eadn m\u00e3 OTP \u0111\u0103ng nh\u1eadp.",
      submit: "G\u1eedi m\u00e3 OTP",
      loading: "\u0110ang g\u1eedi m\u00e3...",
    },
    "login-otp-verify": {
      eyebrow: "EMAIL SIGN-IN",
      title: "Nh\u1eadp m\u00e3 \u0111\u0103ng nh\u1eadp",
      description: "Nh\u1eadp m\u00e3 4 ch\u1eef s\u1ed1 \u0111\u01b0\u1ee3c g\u1eedi t\u1edbi email c\u1ee7a b\u1ea1n.",
      submit: "X\u00e1c nh\u1eadn & \u0110\u0103ng nh\u1eadp",
      loading: "\u0110ang x\u00e1c minh...",
    },
    "password-reset-request": {
      eyebrow: "PASSWORD RESET",
      title: "\u0110\u1eb7t l\u1ea1i m\u1eadt kh\u1ea9u",
      description: "Nh\u1eadp email t\u00e0i kho\u1ea3n \u0111\u1ec3 nh\u1eadn m\u00e3 x\u00e1c minh \u0111\u1eb7t l\u1ea1i m\u1eadt kh\u1ea9u.",
      submit: "G\u1eedi m\u00e3 \u0111\u1eb7t l\u1ea1i",
      loading: "\u0110ang g\u1eedi m\u00e3...",
    },
    "password-reset-verify": {
      eyebrow: "PASSWORD RESET",
      title: "T\u1ea1o m\u1eadt kh\u1ea9u m\u1edbi",
      description: "Nh\u1eadp m\u00e3 OTP trong email v\u00e0 t\u1ea1o m\u1eadt kh\u1ea9u m\u1edbi.",
      submit: "L\u01b0u m\u1eadt kh\u1ea9u m\u1edbi",
      loading: "\u0110ang c\u1eadp nh\u1eadt...",
    },
  };

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
            <span className="section-eyebrow">{viewContent[view].eyebrow}</span>
            <h2>{viewContent[view].title}</h2>
            <p>{viewContent[view].description}</p>
          </div>

          <form
            className="login-form"
            onSubmit={submitHandlers[view]}
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
                readOnly={view.endsWith("-verify")}
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
                      setView("login-otp-request");
                      setError("");
                      setNotice("");
                    }}
                  >
                    {"\u0110\u0103ng nh\u1eadp b\u1eb1ng OTP"}
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

            {view === "login" && (
              <button
                className="login-inline-button password-reset-link"
                type="button"
                onClick={() => {
                  setView("password-reset-request");
                  setOtp("");
                  setError("");
                  setNotice("");
                }}
              >
                {"\u0110\u1eb7t l\u1ea1i m\u1eadt kh\u1ea9u"}
              </button>
            )}

            {(view === "login-otp-verify" || view === "password-reset-verify") && (
              <div className="form-field">
                <label htmlFor="login-otp">Mã OTP</label>
                <input
                  id="login-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  placeholder="Nhập mã 4 chữ số"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
            )}

            {view === "password-reset-verify" && (
              <>
                <div className="form-field">
                  <label htmlFor="new-password">{"M\u1eadt kh\u1ea9u m\u1edbi"}</label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="confirm-password">{"X\u00e1c nh\u1eadn m\u1eadt kh\u1ea9u m\u1edbi"}</label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </div>
              </>
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
<span>{isLoading ? viewContent[view].loading : viewContent[view].submit}</span>
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
