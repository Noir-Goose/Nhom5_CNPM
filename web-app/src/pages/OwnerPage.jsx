
import { useState } from "react";
import { submitPoiRequest } from "../services/authService";
import LocationPicker from "../components/map/LocationPicker";
import "./OwnerPage.css";

const menuItems = [
  { id: "uc7", icon: "📍", label: "Đăng ký địa điểm" },
  { id: "uc8", icon: "📋", label: "Chức năng 2" },
  { id: "uc9", icon: "🗂️", label: "Chức năng 3" },
];

const emptyForm = {
  name: "",
  categoryKey: "food",
  address: "",
  description: "",
  latitude: "",
  longitude: "",
};

function OwnerPage() {
  const [activeMenu, setActiveMenu] = useState("uc7");
  const [form, setForm] = useState({ ...emptyForm });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (form.latitude === "" || form.longitude === "") {
      setError("Vui lòng chọn vị trí trên bản đồ.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitPoiRequest({
        name: form.name.trim(),
        categoryKey: form.categoryKey,
        address: form.address.trim(),
        description: form.description.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      });

      setMessage(
        `Gửi thành công! Mã yêu cầu: ${result.submissionId}. Trạng thái: ${result.status}.`
      );

      setForm({ ...emptyForm });
    } catch (err) {
      setError(err.message || "Không thể gửi yêu cầu.");
    } finally {
      setIsSubmitting(false);
    }
  }

  let email = "POI Owner";

  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (user?.email) email = user.email;
  } catch {
    // Sử dụng tên mặc định nếu thông tin tài khoản không hợp lệ.
  }

  const selectedMenu = menuItems.find(
    (item) => item.id === activeMenu
  );

  return (
    <div className="owner-layout">
      <aside className="owner-sidebar">
        <div className="owner-brand">
          <div className="owner-brand-icon">📍</div>
          <div>
            <h2>Q4 Food Guide</h2>
            <p>POI OWNER</p>
          </div>
        </div>

        <p className="owner-nav-title">MENU QUẢN LÝ</p>

        <nav className="owner-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`owner-nav-item ${
                activeMenu === item.id ? "active" : ""
              }`}
              onClick={() => {
                setActiveMenu(item.id);
                setMessage("");
                setError("");
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="owner-sidebar-footer">
          <span>Tài khoản đang đăng nhập</span>
          <strong>{email}</strong>
        </div>
      </aside>

      <div className="owner-main">
        <header className="owner-topbar">
          <span>Trang quản lý / {selectedMenu.label}</span>
          <span className="owner-account">👤 POI Owner</span>
        </header>

        <main className="owner-content">
          {activeMenu === "uc7" ? (
            <>
              <section className="owner-heading">
                <div>
                  <span className="owner-eyebrow">
                    QUẢN LÝ ĐỊA ĐIỂM
                  </span>
                  <h1>Đăng ký địa điểm mới</h1>
                  <p>
                    Nhập thông tin địa điểm và chọn vị trí trên bản đồ.
                  </p>
                </div>
                <span className="owner-badge">
                  ● Chờ duyệt sau khi gửi
                </span>
              </section>

              <section className="owner-summary">
                <div className="owner-summary-card">
                  <span className="owner-summary-icon">📍</span>
                  <div>
                    <small>Vị trí địa điểm</small>
                    <strong>Bản đồ tương tác</strong>
                  </div>
                </div>

                <div className="owner-summary-card">
                  <span className="owner-summary-icon">🕒</span>
                  <div>
                    <small>Quy trình</small>
                    <strong>Gửi yêu cầu chờ duyệt</strong>
                  </div>
                </div>
              </section>

              <section className="owner-card">
                <div className="owner-card-heading">
                  <h2>Thông tin địa điểm</h2>
                  <p>Các trường có dấu * là bắt buộc.</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="owner-form-grid">
                    <div className="owner-field">
                      <label htmlFor="name">Tên địa điểm *</label>
                      <input
                        id="name"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Ví dụ: Quán phở ABC"
                        maxLength={200}
                        required
                      />
                    </div>

                    <div className="owner-field">
                      <label htmlFor="categoryKey">Danh mục *</label>
                      <select
                        id="categoryKey"
                        name="categoryKey"
                        value={form.categoryKey}
                        onChange={handleChange}
                        required
                      >
                        <option value="food">Đồ ăn</option>
                        <option value="drink">Đồ uống</option>
                        <option value="dessert">Tráng miệng</option>
                      </select>
                    </div>

                    <div className="owner-field full-width">
                      <label htmlFor="address">Địa chỉ *</label>
                      <input
                        id="address"
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        placeholder="Số nhà, tên đường, phường..."
                        maxLength={500}
                        required
                      />
                    </div>

                    <div className="owner-field full-width">
                      <label htmlFor="description">
                        Mô tả địa điểm *
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        placeholder="Giới thiệu địa điểm..."
                        maxLength={3000}
                        rows={4}
                        required
                      />
                    </div>

                    <div className="owner-field full-width">
                      <label>Chọn vị trí trên bản đồ *</label>
                      <p className="owner-help">
                        Nhấn vào vị trí của quán để đặt ghim.
                        Tọa độ sẽ được cập nhật tự động.
                      </p>

                      <div className="owner-map">
                        <LocationPicker
                          value={{
                            latitude: form.latitude,
                            longitude: form.longitude,
                          }}
                          onChange={({ latitude, longitude }) => {
                            setForm((current) => ({
                              ...current,
                              latitude: String(latitude),
                              longitude: String(longitude),
                            }));
                          }}
                        />
                      </div>

                      <div className="owner-coordinates">
                        <span>
                          Vĩ độ:{" "}
                          <strong>
                            {form.latitude === ""
                              ? "Chưa chọn"
                              : Number(form.latitude).toFixed(6)}
                          </strong>
                        </span>
                        <span>
                          Kinh độ:{" "}
                          <strong>
                            {form.longitude === ""
                              ? "Chưa chọn"
                              : Number(form.longitude).toFixed(6)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="owner-alert error" role="alert">
                      {error}
                    </div>
                  )}

                  {message && (
                    <div className="owner-alert success" role="status">
                      {message}
                    </div>
                  )}

                  <div className="owner-actions">
                    <button
                      className="owner-submit"
                      type="submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? "Đang gửi..."
                        : "Gửi yêu cầu đăng ký →"}
                    </button>
                  </div>
                </form>
              </section>
            </>
          ) : (
            <section className="owner-card owner-coming-soon">
              <div className="owner-summary-icon">
                {selectedMenu.icon}
              </div>
              <h1>{selectedMenu.label}</h1>
              <p>
                Chức năng này sẽ được phát triển sau khi xác định
                yêu cầu nghiệp vụ tương ứng.
              </p>
              <button
                className="owner-submit"
                type="button"
                onClick={() => setActiveMenu("uc7")}
              >
                Quay lại UC7
              </button>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default OwnerPage;

