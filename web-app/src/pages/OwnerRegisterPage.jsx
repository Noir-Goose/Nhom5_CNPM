
import { useState } from "react";
import "./OwnerRegisterPage.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

export default function OwnerRegisterPage() {
  const [step, setStep] = useState("register");
  const [form, setForm] = useState({
    account_name: "",
    full_name: "",
    email: "",
    password: "",
  });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleRegister(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Không thể đăng ký. Vui lòng kiểm tra lại thông tin."
        );
      }

      setStep("verify");
      setMessage(data.message || "Mã xác minh đã được gửi đến email của bạn.");
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Không thể kết nối backend. Hãy kiểm tra server và cấu hình CORS."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/auth/verify-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            otp,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Xác minh thất bại. Vui lòng thử lại."
        );
      }

      setStep("success");
      setMessage(
        data.message ||
          "Email đã được xác minh. Tài khoản đang chờ Admin duyệt."
      );
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Không thể kết nối backend. Hãy kiểm tra server và cấu hình CORS."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/auth/resend-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Không thể gửi lại mã OTP."
        );
      }

      setMessage(data.message || "Mã OTP mới đã được gửi.");
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Không thể kết nối backend. Hãy kiểm tra server và cấu hình CORS."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="owner-register-page">
      <section className="owner-register-card">
        <div className="owner-register-brand">
          <span className="owner-register-icon">⌖</span>
          <span>Q4 Food Guide</span>
        </div>

        {step === "register" && (
          <>
            <p className="owner-register-eyebrow">DÀNH CHO ĐỐI TÁC</p>
            <h1>Đăng ký POI Owner</h1>
            <p className="owner-register-description">
              Đăng ký tài khoản để gửi và quản lý địa điểm trên hệ thống.
            </p>

            <form onSubmit={handleRegister}>
              <label htmlFor="account_name">Tên tài khoản</label>
              <input
                id="account_name"
                name="account_name"
                type="text"
                autoComplete="username"
                placeholder="3–30 ký tự: chữ, số, ., _ hoặc -"
                value={form.account_name}
                onChange={handleChange}
                minLength={3}
                maxLength={30}
                pattern={String.raw`[A-Za-z0-9_.\x2d]+`}
                required
              />

              <label htmlFor="full_name">Họ và tên</label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                autoComplete="name"
                placeholder="Nhập họ và tên"
                value={form.full_name}
                onChange={handleChange}
                minLength={2}
                maxLength={100}
                required
              />

              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />

              <label htmlFor="password">Mật khẩu</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Ít nhất 12 ký tự"
                value={form.password}
                onChange={handleChange}
                minLength={12}
                maxLength={128}
                required
              />

              <button type="submit" disabled={loading}>
                {loading ? "Đang gửi..." : "Đăng ký tài khoản"}
              </button>
            </form>
          </>
        )}

        {step === "verify" && (
          <>
            <p className="owner-register-eyebrow">XÁC MINH TÀI KHOẢN</p>
            <h1>Kiểm tra email</h1>
            <p className="owner-register-description">
              Nhập mã OTP gồm 4 chữ số đã được gửi đến:
            </p>
            <p className="owner-register-email">{form.email}</p>

            <form onSubmit={handleVerify}>
              <label htmlFor="otp">Mã xác minh OTP</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Nhập 4 chữ số"
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 4))
                }
                pattern="[0-9]{4}"
                maxLength={4}
                required
              />

              <button type="submit" disabled={loading}>
                {loading ? "Đang xác minh..." : "Xác minh email"}
              </button>
            </form>

            <button
              type="button"
              className="owner-register-secondary"
              onClick={handleResendOtp}
              disabled={loading}
            >
              Gửi lại mã OTP
            </button>

            <button
              type="button"
              className="owner-register-text-button"
              onClick={() => {
                setStep("register");
                setMessage("");
                setError("");
              }}
              disabled={loading}
            >
              Quay lại thông tin đăng ký
            </button>
          </>
        )}

        {step === "success" && (
          <div className="owner-register-success">
            <div className="owner-register-success-icon">✓</div>
            <h1>Đăng ký thành công!</h1>
            <p>
              Email của bạn đã được xác minh. Tài khoản đang chờ Admin phê
              duyệt trước khi có thể sử dụng các chức năng dành cho POI Owner.
            </p>
          </div>
        )}

        {message && step !== "success" && (
          <p className="owner-register-message" role="status">
            {message}
          </p>
        )}

        {error && (
          <p className="owner-register-error" role="alert">
            {error}
          </p>
        )}

        <p className="owner-register-footer">
          Hệ thống hướng dẫn khám phá ẩm thực Q4
        </p>
      </section>
    </main>
  );
}
