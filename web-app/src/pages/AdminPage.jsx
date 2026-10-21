import { useCallback, useEffect, useState } from "react";
import {
  getPoiOwnerRegistrations,
  approvePoiOwnerRegistration,
  rejectPoiOwnerRegistration,
  deleteRejectedPoiOwnerRegistration,
} from "../services/adminService";
import "./AdminPage.css";
import AdminPoiManagement from "../components/admin/poi/AdminPoiManagement";
import AdminUserManagement from "../components/admin/users/AdminUserManagement";
import AdminDashboard from "../components/admin/AdminDashboard";

const menuItems = [
  {
    id: "dashboard",
    icon: "📊",
    label: "Tổng quan",
  },
  {
    id: "access-verification",
    icon: "🛡️",
    label: "Xác thực truy cập",
  },
  {
    id: "poi-management",
    icon: "📍",
    label: "Quản lý POI",
  },
  {
    id: "user-management",
    icon: "👥",
    label: "Quản lý người dùng",
  },
];

const registrationStatuses = [
  { value: "pending", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "rejected", label: "Đã từ chối" },
];

function AdminPage() {
  // [ADMIN-DASH-006] Mở Dashboard tổng quan làm màn hình đầu tiên của Admin.
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [registrationStatus, setRegistrationStatus] = useState("pending");
  const [registrations, setRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedMenu = menuItems.find(
    (item) => item.id === activeMenu,
  );

  const selectedStatusLabel =
    registrationStatuses.find(
      (item) => item.value === registrationStatus,
    )?.label ?? "Chờ duyệt";

  // Tải dữ liệu khi người dùng nhấn Làm mới hoặc sau thao tác.
  const loadRegistrations = useCallback(async () => {
    if (activeMenu !== "access-verification") return;

    setIsLoading(true);
    setError("");

    try {
      const data = await getPoiOwnerRegistrations(registrationStatus);
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Không thể tải danh sách đăng ký.");
      setRegistrations([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeMenu, registrationStatus]);

  // Tự tải danh sách khi vào trang hoặc đổi bộ lọc.
  // Không gọi loadRegistrations trực tiếp trong effect để tránh lỗi lint.
  useEffect(() => {
    if (activeMenu !== "access-verification") return undefined;

    let cancelled = false;

    async function fetchRegistrations() {
      try {
        const data = await getPoiOwnerRegistrations(registrationStatus);

        if (!cancelled) {
          setRegistrations(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Không thể tải danh sách đăng ký.");
          setRegistrations([]);
        }
      }
    }

    fetchRegistrations();

    return () => {
      cancelled = true;
    };
  }, [activeMenu, registrationStatus]);

  async function handleAction(userId, action) {
    const actionLabel = action === "approve" ? "duyệt" : "từ chối";

    if (!window.confirm(`Bạn có chắc muốn ${actionLabel} đăng ký này?`)) {
      return;
    }

    setProcessingId(userId);
    setError("");
    setMessage("");

    try {
      if (action === "approve") {
        await approvePoiOwnerRegistration(userId);
        setMessage("Đã duyệt đăng ký POI Owner.");
      } else {
        await rejectPoiOwnerRegistration(userId);
        setMessage("Đã từ chối đăng ký POI Owner.");
      }

      await loadRegistrations();
    } catch (err) {
      setError(err.message || "Không thể cập nhật trạng thái đăng ký.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDelete(userId) {
    if (
      !window.confirm(
        "Bạn có chắc muốn xóa vĩnh viễn đăng ký bị từ chối này?",
      )
    ) {
      return;
    }

    setProcessingId(userId);
    setError("");
    setMessage("");

    try {
      await deleteRejectedPoiOwnerRegistration(userId);
      setMessage("Đã xóa đăng ký bị từ chối.");
      await loadRegistrations();
    } catch (err) {
      setError(err.message || "Không thể xóa đăng ký bị từ chối.");
    } finally {
      setProcessingId(null);
    }
  }

  function handleStatusChange(status) {
    setRegistrationStatus(status);
    setMessage("");
    setError("");
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">📍</div>
          <div>
            <h2>Q4 Food Guide</h2>
            <p>ADMIN</p>
          </div>
        </div>

        <p className="admin-nav-title">QUẢN LÝ HỆ THỐNG</p>

        <nav className="admin-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`admin-nav-item ${
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

        <div className="admin-sidebar-footer">
          <span>Tài khoản quản trị</span>
          <strong>Administrator</strong>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <span>Trang quản lý / {selectedMenu?.label}</span>
          <span className="admin-account">👤 Admin</span>
        </header>

        <main className="admin-content">
          {activeMenu === "dashboard" ? (
            <AdminDashboard onNavigate={setActiveMenu} />
          ) : activeMenu === "poi-management" ? (
            <AdminPoiManagement />
          ) : activeMenu === "user-management" ? (
            <AdminUserManagement />
          ) : (
            <>
              <section className="admin-heading">
                <div>
                  <span className="admin-eyebrow">
                    UC10 · QUẢN LÝ POI OWNER
                  </span>

                  <h1>Xác thực truy cập</h1>

                  <p>
                    Xem xét và xử lý các yêu cầu đăng ký tài khoản
                    chủ địa điểm.
                  </p>
                </div>

                <button
                  className="admin-refresh"
                  type="button"
                  onClick={loadRegistrations}
                  disabled={isLoading}
                >
                  {isLoading ? "Đang tải..." : "↻ Làm mới"}
                </button>
              </section>

              <section className="admin-summary">
                <div className="admin-summary-card">
                  <span className="admin-summary-icon">📋</span>
                  <div>
                    <small>Trạng thái đang xem</small>
                    <strong>{selectedStatusLabel}</strong>
                  </div>
                </div>

                <div className="admin-summary-card">
                  <span className="admin-summary-icon">👥</span>
                  <div>
                    <small>Số đăng ký</small>
                    <strong>
                      {isLoading ? "…" : registrations.length}
                    </strong>
                  </div>
                </div>
              </section>

              <section className="admin-card">
                <div className="admin-card-heading">
                  <div>
                    <h2>Danh sách đăng ký</h2>
                    <p>
                      {registrationStatus === "pending"
                        ? "Các tài khoản đang chờ Admin xem xét."
                        : registrationStatus === "approved"
                          ? "Các tài khoản đã được Admin phê duyệt."
                          : "Các tài khoản đã bị Admin từ chối."}
                    </p>
                  </div>
                </div>

                <div className="registration-filters">
                  {registrationStatuses.map((status) => (
                    <button
                      key={status.value}
                      type="button"
                      className={
                        registrationStatus === status.value
                          ? "active"
                          : ""
                      }
                      onClick={() => handleStatusChange(status.value)}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="admin-alert error" role="alert">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="admin-alert success" role="status">
                    {message}
                  </div>
                )}

                {isLoading ? (
                  <div className="admin-empty">
                    Đang tải danh sách đăng ký...
                  </div>
                ) : registrations.length === 0 ? (
                  <div className="admin-empty">
                    <span>📭</span>
                    <h3>Chưa có đăng ký nào</h3>
                    <p>
                      Không tìm thấy đăng ký trong trạng thái này.
                    </p>
                  </div>
                ) : (
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Họ và tên</th>
                          <th>Email</th>
                          <th>Ngày đăng ký</th>
                          <th>Trạng thái</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>

                      <tbody>
                        {registrations.map((registration) => (
                          <tr key={registration.id}>
                            <td>
                              <strong>
                                {registration.fullName || "Chưa cập nhật"}
                              </strong>
                            </td>

                            <td>{registration.email || "—"}</td>

                            <td>
                              {registration.createdAt
                                ? new Date(
                                    registration.createdAt,
                                  ).toLocaleString("vi-VN")
                                : "—"}
                            </td>

                            <td>
                              <span
                                className={`admin-status ${
                                  registration.approvalStatus || ""
                                }`}
                              >
                                {registration.approvalStatus === "pending"
                                  ? "Chờ duyệt"
                                  : registration.approvalStatus === "approved"
                                    ? "Đã duyệt"
                                    : registration.approvalStatus === "rejected"
                                      ? "Đã từ chối"
                                      : registration.approvalStatus || "—"}
                              </span>
                            </td>

                            <td>
                              <div className="admin-row-actions">
                                {registrationStatus === "pending" ? (
                                  <>
                                    <button
                                      type="button"
                                      className="admin-approve"
                                      disabled={processingId !== null}
                                      onClick={() =>
                                        handleAction(
                                          registration.id,
                                          "approve",
                                        )
                                      }
                                    >
                                      {processingId === registration.id
                                        ? "Đang xử lý..."
                                        : "Duyệt"}
                                    </button>

                                    <button
                                      type="button"
                                      className="admin-reject"
                                      disabled={processingId !== null}
                                      onClick={() =>
                                        handleAction(
                                          registration.id,
                                          "reject",
                                        )
                                      }
                                    >
                                      Từ chối
                                    </button>
                                  </>
                                ) : registrationStatus === "rejected" ? (
                                  <button
                                    type="button"
                                    className="admin-reject"
                                    disabled={processingId !== null}
                                    onClick={() =>
                                      handleDelete(registration.id)
                                    }
                                  >
                                    {processingId === registration.id
                                      ? "Đang xóa..."
                                      : "Xóa"}
                                  </button>
                                ) : (
                                  <span>—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminPage;
