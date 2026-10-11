
import { useState } from "react";
import { login } from "../services/authService";
import "./LoginPage.css";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await login(email, password);

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role === "admin") {
        window.location.href = "/admin";
      } else if (data.user.role === "poi_owner") {
        window.location.href = "/owner";
      } else {
        setError("Vai trò tài khoản không hợp lệ.");
      }
    } catch (err) {
      setError(err.message || "Không thể đăng nhập. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
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
            <span className="section-eyebrow">WELCOME BACK</span>
            <h2>Chào mừng trở lại!</h2>
            <p>Đăng nhập để tiếp tục hành trình của bạn.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label htmlFor="email">Địa chỉ email</label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-field">
              <div className="password-label">
                <label htmlFor="password">Mật khẩu</label>
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
              <span>{isLoading ? "Đang đăng nhập..." : "Đăng nhập"}</span>
              {!isLoading && <span aria-hidden="true">→</span>}
            </button>
          </form>

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
