import { useCallback, useEffect, useState } from "react";
import {
  getPoiOwnerRegistrations,
  approvePoiOwnerRegistration,
  rejectPoiOwnerRegistration,
  deleteRejectedPoiOwnerRegistration,
} from "../services/adminService";
import "./AdminPage.css";
import AdminPoiManagement from "./AdminPoiManagement";

const menuItems = [
  {
    id: "pending",
    icon: "⏳",
    label: "Chờ duyệt",
    group: "registration",
  },
  {
    id: "rejected",
    icon: "📋",
    label: "Đã từ chối",
    group: "registration",
  },
  {
    id: "poi-management",
    icon: "📍",
    label: "Quản lý POI",
    group: "poi",
  },
];

function AdminPage() {
  const [activeMenu, setActiveMenu] = useState("pending");
  const [registrations, setRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

const loadRegistrations = useCallback(async () => {
  if (activeMenu === "poi-management") return;

  setIsLoading(true);
  setError("");

  try {
    const data = await getPoiOwnerRegistrations(activeMenu);
    setRegistrations(Array.isArray(data) ? data : []);
  } catch (err) {
    setError(
      err.message || "Không thể tải danh sách đăng ký.",
    );
    setRegistrations([]);
  } finally {
    setIsLoading(false);
  }
}, [activeMenu]);


  useEffect(() => {
    if (activeMenu === "poi-management") {
      return;
    }

    let cancelled = false;

    async function fetchRegistrations() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getPoiOwnerRegistrations(activeMenu);

        if (!cancelled) {
          setRegistrations(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message || "Không thể tải danh sách đăng ký.",
          );
          setRegistrations([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchRegistrations();

    return () => {
      cancelled = true;
    };
  }, [activeMenu]);

  async function handleAction(userId, action) {
    const actionLabel =
      action === "approve" ? "duyệt" : "từ chối";

    const confirmed = window.confirm(
      `Bạn có chắc muốn ${actionLabel} đăng ký này?`,
    );

    if (!confirmed) return;

    setProcessingId(userId);
    setError("");
    setMessage("");

    try {
      if (action === "approve") {
        await approvePoiOwnerRegistration(userId);
      } else {
        await rejectPoiOwnerRegistration(userId);
      }

      setMessage(
        action === "approve"
          ? "Đã duyệt đăng ký POI Owner."
          : "Đã từ chối đăng ký POI Owner.",
      );

      await loadRegistrations();
    } catch (err) {
      setError(
        err.message || "Không thể cập nhật trạng thái đăng ký.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  const selectedMenu = menuItems.find(
    (item) => item.id === activeMenu,
  );

  async function handleDelete(userId) {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa vĩnh viễn đăng ký bị từ chối này?",
    );

    if (!confirmed) return;

    setProcessingId(userId);
    setError("");
    setMessage("");

    try {
      await deleteRejectedPoiOwnerRegistration(userId);
      setMessage("Đã xóa đăng ký bị từ chối.");
      await loadRegistrations();
    } catch (err) {
      setError(
        err.message || "Không thể xóa đăng ký bị từ chối.",
      );
    } finally {
      setProcessingId(null);
    }
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

        <p className="admin-nav-title">QUẢN LÝ ĐĂNG KÝ</p>

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
          <span>
            Trang quản lý / {selectedMenu.label}
          </span>
          <span className="admin-account">
            👤 Admin
          </span>
        </header>

        <main className="admin-content">
          {activeMenu === "poi-management" ? (
              <AdminPoiManagement />
            ) : (
              <>
          <section className="admin-heading">
            <div>
              <span className="admin-eyebrow">
                UC10 · QUẢN LÝ POI OWNER
              </span>

              <h1>{selectedMenu.label} đăng ký POI Owner</h1>

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
                <strong>{selectedMenu.label}</strong>
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
                  {activeMenu === "pending"
                    ? "Các tài khoản đang chờ Admin xem xét."
                    : "Các tài khoản đã bị Admin từ chối."}
                </p>
              </div>
            </div>

            {error && (
              <div className="admin-alert error" role="alert">
                {error}
              </div>
            )}

            {message && (
              <div
                className="admin-alert success"
                role="status"
              >
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
                              registration.approvalStatus
                            }`}
                          >
                            {registration.approvalStatus ===
                            "pending"
                              ? "Chờ duyệt"
                              : registration.approvalStatus ===
                                  "rejected"
                                ? "Đã từ chối"
                                : registration.approvalStatus}
                          </span>
                        </td>   
                        <td>
                          <div className="admin-row-actions">
                            {activeMenu === "pending" ? (
                              <>
                                <button
                                  type="button"
                                  className="admin-approve"
                                  disabled={processingId !== null}
                                  onClick={() =>
                                    handleAction(registration.id, "approve")
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
                                    handleAction(registration.id, "reject")
                                  }
                                >
                                  Từ chối
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="admin-reject"
                                disabled={processingId !== null}
                                onClick={() => handleDelete(registration.id)}
                              >
                                {processingId === registration.id
                                  ? "Đang xóa..."
                                  : "Xóa"}
                              </button>
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