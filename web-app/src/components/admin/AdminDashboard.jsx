import { useCallback, useEffect, useState } from "react";
import { getPoiOwnerRegistrations } from "../../services/adminService";
import { getPoiSubmissions, getSystemPois } from "../../services/adminPoiService";
import { getUsers } from "../../services/adminUserService";

const initialData = {
  pendingOwners: [],
  pendingSubmissions: [],
  pois: [],
  users: [],
};

// [ADMIN-DASH-001] Lấy và chuẩn hóa dữ liệu Dashboard từ các API Admin.
async function requestDashboardData() {
  const [pendingOwners, pendingSubmissions, pois, users] = await Promise.all([
    getPoiOwnerRegistrations("pending"),
    getPoiSubmissions("pending"),
    getSystemPois(),
    getUsers(),
  ]);

  return {
    pendingOwners: Array.isArray(pendingOwners) ? pendingOwners : [],
    pendingSubmissions: Array.isArray(pendingSubmissions) ? pendingSubmissions : [],
    pois: Array.isArray(pois) ? pois : [],
    users: Array.isArray(users) ? users : [],
  };
}

// [ADMIN-DASH-001] Tổng hợp số liệu tổng quan từ các API quản trị hiện có.
function AdminDashboard({ onNavigate }) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // [ADMIN-DASH-002] Tải lại số liệu và danh sách việc đang chờ xử lý.
  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      setData(await requestDashboardData());
    } catch (loadError) {
      setError(loadError.message || "Không thể tải dữ liệu tổng quan.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // [ADMIN-DASH-003] Tự nạp dữ liệu; cập nhật state sau khi request bất đồng bộ hoàn tất.
    let isActive = true;

    requestDashboardData()
      .then((dashboardData) => {
        if (isActive) {
          setData(dashboardData);
          setError("");
        }
      })
      .catch((loadError) => {
        if (isActive) setError(loadError.message || "Không thể tải dữ liệu tổng quan.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const cards = [
    { icon: "📍", label: "Địa điểm trong hệ thống", value: data.pois.length, tone: "green" },
    { icon: "👥", label: "Tài khoản", value: data.users.length, tone: "blue" },
    { icon: "🪪", label: "Chủ địa điểm chờ duyệt", value: data.pendingOwners.length, tone: "orange" },
    { icon: "📝", label: "Địa điểm chờ duyệt", value: data.pendingSubmissions.length, tone: "purple" },
  ];

  return (
    <section className="admin-dashboard">
      <header className="admin-heading">
        <div>
          <span className="admin-eyebrow">TRUNG TÂM QUẢN TRỊ</span>
          <h1>Tổng quan</h1>
          <p>Theo dõi hoạt động và xử lý các yêu cầu mới của Quận 4 Food Guide.</p>
        </div>
        <button className="admin-refresh" type="button" onClick={loadDashboard} disabled={isLoading}>
          {isLoading ? "Đang tải..." : "↻ Làm mới"}
        </button>
      </header>

      {error && <div className="admin-alert error" role="alert">{error}</div>}

      {/* [ADMIN-DASH-004] Thẻ thống kê tổng hợp từ POI, tài khoản và hàng chờ duyệt. */}
      <div className="dashboard-stat-grid">
        {cards.map((card) => (
          <article className="dashboard-stat-card" key={card.label}>
            <span className={`dashboard-stat-icon ${card.tone}`} aria-hidden="true">{card.icon}</span>
            <div>
              <p>{card.label}</p>
              <strong>{isLoading ? "—" : card.value}</strong>
            </div>
          </article>
        ))}
      </div>

      {/* [ADMIN-DASH-005] Lối tắt dẫn tới hai danh sách cần Admin xử lý. */}
      <div className="dashboard-work-grid">
        <section className="admin-card dashboard-work-card">
          <div className="admin-card-heading">
            <div><h2>Đăng ký chủ địa điểm</h2><p>Các tài khoản đã xác minh email và đang chờ duyệt.</p></div>
            <span className="dashboard-count">{isLoading ? "—" : data.pendingOwners.length}</span>
          </div>
          {data.pendingOwners.length > 0 ? (
            <ul className="dashboard-queue-list">
              {data.pendingOwners.slice(0, 4).map((owner) => (
                <li key={owner.id}><span><strong>{owner.fullName || "Chưa cập nhật"}</strong><small>{owner.email}</small></span><span className="admin-status pending">Chờ duyệt</span></li>
              ))}
            </ul>
          ) : <p className="dashboard-queue-empty">{isLoading ? "Đang tải danh sách..." : "Không có đăng ký đang chờ."}</p>}
          <button className="dashboard-link-button" type="button" onClick={() => onNavigate("access-verification")}>Mở danh sách đăng ký <span aria-hidden="true">→</span></button>
        </section>

        <section className="admin-card dashboard-work-card">
          <div className="admin-card-heading">
            <div><h2>Địa điểm chờ xét duyệt</h2><p>Các địa điểm mới do POI Owner gửi lên.</p></div>
            <span className="dashboard-count">{isLoading ? "—" : data.pendingSubmissions.length}</span>
          </div>
          {data.pendingSubmissions.length > 0 ? (
            <ul className="dashboard-queue-list">
              {data.pendingSubmissions.slice(0, 4).map((submission) => (
                <li key={submission.submissionId || submission.id}><span><strong>{submission.name || submission.content?.vi?.name || "Địa điểm mới"}</strong><small>{submission.address || "Chưa có địa chỉ"}</small></span><span className="admin-status pending">Chờ duyệt</span></li>
              ))}
            </ul>
          ) : <p className="dashboard-queue-empty">{isLoading ? "Đang tải danh sách..." : "Không có địa điểm đang chờ."}</p>}
          <button className="dashboard-link-button" type="button" onClick={() => onNavigate("poi-management")}>Mở quản lý POI <span aria-hidden="true">→</span></button>
        </section>
      </div>
    </section>
  );
}

export default AdminDashboard;
