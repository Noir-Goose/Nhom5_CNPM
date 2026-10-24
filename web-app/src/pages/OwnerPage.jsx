import NotificationPanel from "../components/owner/notifications/NotificationPanel";
import { useState } from "react";
import { poiCategoryOptions } from "../data/categories";
import {
  submitPoiRequest,
  resubmitPoiRequest,
  translatePoiContent,
} from "../services/authService";
import LocationPicker from "../components/map/LocationPicker";
import SubmissionStatus from "../components/owner/submissions/SubmissionStatus";
import "./OwnerPage.css";

const menuItems = [
  { id: "uc7", icon: "📍", label: "Đăng ký địa điểm" },
  { id: "uc8", icon: "📋", label: "Trạng thái yêu cầu" },
  { id: "uc9", icon: "🔔", label: "Thông báo" },
];

const contentLanguages = [
  { code: "vi", label: "Tiếng Việt" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
];

const createEmptyContent = () =>
  Object.fromEntries(
    contentLanguages.map(({ code }) => [
      code,
      { name: "", description: "", category: "" },
    ])
  );

const emptyForm = {
  categoryKey: "food",
  address: "",
  latitude: "",
  longitude: "",
};

const EDITABLE_STATUSES = new Set([
  "fixRequest",
  "revision_requested",
]);

function OwnerPage() {
  const [activeMenu, setActiveMenu] = useState("uc7");
  const [form, setForm] = useState({ ...emptyForm });
  const [content, setContent] = useState(createEmptyContent);
  const [activeLanguage, setActiveLanguage] = useState("vi");
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [statusRefreshKey, setStatusRefreshKey] = useState(0);

  function clearAlerts() {
    setMessage("");
    setError("");
  }

  function resetForm() {
    setForm({ ...emptyForm });
    setContent(createEmptyContent());
    setActiveLanguage("vi");
    setEditingSubmission(null);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleContentChange(event) {
    const { name, value } = event.target;

    setContent((current) => ({
      ...current,
      [activeLanguage]: {
        ...current[activeLanguage],
        [name]: value,
      },
    }));
  }

  async function handleAutoTranslate() {
    clearAlerts();
    const vietnamese = content.vi;
    if (!vietnamese.name.trim() || !vietnamese.description.trim() || !vietnamese.category.trim()) {
      setError("Vui lòng nhập đủ tên, mô tả và danh mục bằng tiếng Việt trước khi dịch.");
      setActiveLanguage("vi");
      return;
    }
    setIsTranslating(true);
    try {
      const result = await translatePoiContent({
        name: vietnamese.name.trim(),
        description: vietnamese.description.trim(),
        category: vietnamese.category.trim(),
      });
      setContent((current) => ({ ...current, ...result.content }));
      setMessage("Đã dịch nội dung sang tiếng Anh, Trung, Nhật và Hàn. Vui lòng rà soát bản dịch trước khi gửi.");
    } catch (translateError) {
      setError(translateError.message || "Không thể tự dịch nội dung POI.");
    } finally {
      setIsTranslating(false);
    }
  }

  function handleEditSubmission(submission) {
    clearAlerts();

    if (!EDITABLE_STATUSES.has(submission.status)) {
      setError("Yêu cầu này hiện không được phép chỉnh sửa.");
      return;
    }

    const savedContent = submission.content || {};

    setForm({
      categoryKey: submission.categoryKey || "food",
      address: submission.address || "",
      latitude:
        submission.latitude == null
          ? ""
          : String(submission.latitude),
      longitude:
        submission.longitude == null
          ? ""
          : String(submission.longitude),
    });

    setContent(
      Object.fromEntries(
        contentLanguages.map(({ code }) => {
          const languageContent = savedContent[code] || {};

          return [
            code,
            {
              name: languageContent.name || "",
              description: languageContent.description || "",
              category: languageContent.category || "",
            },
          ];
        })
      )
    );

    setActiveLanguage("vi");
    setEditingSubmission(submission);
    setActiveMenu("uc7");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearAlerts();

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (
      form.latitude.trim() === "" ||
      form.longitude.trim() === "" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError(
        "Vui lòng nhập tọa độ hợp lệ hoặc chọn vị trí trên bản đồ."
      );
      return;
    }

    if (!form.address.trim()) {
      setError("Vui lòng nhập địa chỉ địa điểm.");
      return;
    }

    const missingLanguages = contentLanguages.filter(
      ({ code }) => {
        const item = content[code];

        return (
          !item.name.trim() ||
          !item.description.trim() ||
          !item.category.trim()
        );
      }
    );

    if (missingLanguages.length > 0) {
      setError(
        "Vui lòng nhập đủ tên, mô tả và danh mục cho các ngôn ngữ: " +
          missingLanguages.map((item) => item.label).join(", ")
      );

      setActiveLanguage(missingLanguages[0].code);
      return;
    }

    const normalizedContent = Object.fromEntries(
      contentLanguages.map(({ code }) => [
        code,
        {
          name: content[code].name.trim(),
          description: content[code].description.trim(),
          category: content[code].category.trim(),
        },
      ])
    );

    const poiData = {
      name: normalizedContent.vi.name,
      categoryKey: form.categoryKey,
      address: form.address.trim(),
      description: normalizedContent.vi.description,
      latitude,
      longitude,
      content: normalizedContent,
    };

    setIsSubmitting(true);

    try {
      let result;

      if (editingSubmission) {
        result = await resubmitPoiRequest(
          editingSubmission.submissionId,
          poiData
        );

        setMessage(
          `Đã gửi lại yêu cầu ${result.submissionId}. Trạng thái: Chưa duyệt.`
        );
      } else {
        result = await submitPoiRequest(poiData);

        setMessage(
          `Gửi thành công! Mã yêu cầu: ${result.submissionId}. Trạng thái: ${result.status}.`
        );
      }

      resetForm();
      setStatusRefreshKey((current) => current + 1);
    } catch (err) {
      setError(err.message || "Không thể gửi yêu cầu.");
    } finally {
      setIsSubmitting(false);
    }
  }

  let email = "POI Owner";

  try {
    const user = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    if (user?.email) {
      email = user.email;
    }
  } catch {
    // Dùng tên mặc định nếu dữ liệu tài khoản không hợp lệ.
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
                clearAlerts();
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

                  <h1>
                    {editingSubmission
                      ? "Chỉnh sửa địa điểm"
                      : "Đăng ký địa điểm mới"}
                  </h1>

                  <p>
                    {editingSubmission
                      ? "Chỉnh sửa thông tin theo phản hồi của Admin rồi gửi lại để xét duyệt."
                      : "Nhập thông tin địa điểm, nội dung đa ngôn ngữ và chọn vị trí trên bản đồ hoặc nhập tọa độ."}
                  </p>
                </div>

                <span className="owner-badge">
                  ●{" "}
                  {editingSubmission
                    ? "Yêu cầu cần chỉnh sửa"
                    : "Chờ duyệt sau khi gửi"}
                </span>
              </section>

              {editingSubmission && (
                <section className="owner-alert">
                  <strong>
                    Mã yêu cầu: {editingSubmission.submissionId}
                  </strong>

                  <p>
                    Phản hồi của Admin:{" "}
                    {editingSubmission.adminMessage ||
                      "Admin chưa cung cấp nội dung phản hồi."}
                  </p>

                  <button
                    type="button"
                    className="submission-detail-button"
                    onClick={() => {
                      resetForm();
                      clearAlerts();
                    }}
                  >
                    Hủy chỉnh sửa
                  </button>
                </section>
              )}

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
                    <strong>
                      {editingSubmission
                        ? "Gửi lại để Admin duyệt"
                        : "Gửi yêu cầu chờ duyệt"}
                    </strong>
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
                    <div className="owner-field full-width">
                      <label htmlFor="address">
                        Địa chỉ thực tế *
                      </label>

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

                    <div className="owner-field">
                      <label htmlFor="categoryKey">
                        Danh mục hệ thống *
                      </label>

                      <select
                        id="categoryKey"
                        name="categoryKey"
                        value={form.categoryKey}
                        onChange={handleChange}
                        required
                      >
                        {poiCategoryOptions.map((category) => (
                          <option key={category.key} value={category.key}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="owner-field full-width">
                      <h3>Nội dung đa ngôn ngữ</h3>

                      <p className="owner-help">
                        Nhập tên, mô tả và danh mục hiển thị cho đủ
                        5 ngôn ngữ trước khi gửi.
                      </p>

                      <button type="button" className="owner-translate-button" onClick={handleAutoTranslate} disabled={isTranslating || isSubmitting}>
                        {isTranslating ? "Đang dịch..." : "Dịch từ tiếng Việt"}
                      </button>

                      <div
                        className="owner-language-tabs"
                        role="group"
                        aria-label="Chọn ngôn ngữ nội dung"
                      >
                        {contentLanguages.map(({ code, label }) => {
                          const item = content[code];

                          const complete =
                            item.name.trim() !== "" &&
                            item.description.trim() !== "" &&
                            item.category.trim() !== "";

                          return (
                            <button
                              key={code}
                              type="button"
                              className={
                                activeLanguage === code
                                  ? "active"
                                  : ""
                              }
                              onClick={() => setActiveLanguage(code)}
                            >
                              {label}
                              <span>{complete ? " ✓" : " *"}</span>
                            </button>
                          );
                        })}
                      </div>

                      <p className="owner-help">
                        Đang nhập:{" "}
                        <strong>
                          {
                            contentLanguages.find(
                              (item) => item.code === activeLanguage
                            )?.label
                          }
                        </strong>
                      </p>

                      <div className="owner-field">
                        <label htmlFor="content-name">
                          Tên địa điểm *
                        </label>

                        <input
                          id="content-name"
                          name="name"
                          value={content[activeLanguage].name}
                          onChange={handleContentChange}
                          placeholder="Nhập tên theo ngôn ngữ đã chọn"
                          maxLength={200}
                          required
                        />
                      </div>

                      <div className="owner-field">
                        <label htmlFor="content-description">
                          Mô tả *
                        </label>

                        <textarea
                          id="content-description"
                          name="description"
                          value={
                            content[activeLanguage].description
                          }
                          onChange={handleContentChange}
                          placeholder="Nhập mô tả theo ngôn ngữ đã chọn"
                          maxLength={3000}
                          rows={4}
                          required
                        />
                      </div>

                      <div className="owner-field">
                        <label htmlFor="content-category">
                          Danh mục hiển thị *
                        </label>

                        <input
                          id="content-category"
                          name="category"
                          value={content[activeLanguage].category}
                          onChange={handleContentChange}
                          placeholder="Ví dụ: Ẩm thực / Food"
                          maxLength={100}
                          required
                        />
                      </div>
                    </div>

                    <div className="owner-field full-width">
                      <h3>Vị trí địa điểm *</h3>

                      <p className="owner-help">
                        Nhập tọa độ trực tiếp hoặc nhấn vào bản đồ.
                        Hai cách sẽ cập nhật cùng dữ liệu.
                      </p>

                      <div className="owner-form-grid">
                        <div className="owner-field">
                          <label htmlFor="latitude">
                            Vĩ độ (Latitude) *
                          </label>

                          <input
                            id="latitude"
                            name="latitude"
                            type="number"
                            step="any"
                            min="-90"
                            max="90"
                            value={form.latitude}
                            onChange={handleChange}
                            placeholder="Ví dụ: 10.762622"
                            required
                          />
                        </div>

                        <div className="owner-field">
                          <label htmlFor="longitude">
                            Kinh độ (Longitude) *
                          </label>

                          <input
                            id="longitude"
                            name="longitude"
                            type="number"
                            step="any"
                            min="-180"
                            max="180"
                            value={form.longitude}
                            onChange={handleChange}
                            placeholder="Ví dụ: 106.660172"
                            required
                          />
                        </div>
                      </div>

                      <p className="owner-help">
                        Hoặc nhấn vào vị trí mong muốn trên bản đồ
                        để tự điền tọa độ.
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
                    </div>
                  </div>

                  {error && (
                    <div
                      className="owner-alert error"
                      role="alert"
                    >
                      {error}
                    </div>
                  )}

                  {message && (
                    <div
                      className="owner-alert success"
                      role="status"
                    >
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
                        : editingSubmission
                          ? "Gửi lại yêu cầu →"
                          : "Gửi yêu cầu đăng ký →"}
                    </button>
                  </div>
                </form>
              </section>
            </>
          ) : activeMenu === "uc8" ? (
            <SubmissionStatus
              key={statusRefreshKey}
              onEditSubmission={handleEditSubmission}
            />
          ) : activeMenu === "uc9" ? (
            <NotificationPanel />
          ) : (
            <section className="owner-card owner-coming-soon">
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
