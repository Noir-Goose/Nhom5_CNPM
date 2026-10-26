import { useCallback, useEffect, useState } from "react";
import { getPoiOwnerRegistrations } from "../../services/adminService";
import { getPoiSubmissions, getSystemPois } from "../../services/adminPoiService";
import { getUsers } from "../../services/adminUserService";
import { getActiveVisitors, getTourAnalytics } from "../../services/tourAnalyticsService";

const initialData = {
  pendingOwners: [],
  pendingSubmissions: [],
  pois: [],
  users: [],
  tourAnalytics: null,
  tourAnalyticsError: "",
  activeVisitors: null,
};

// [ADMIN-DASH-001] Lấy và chuẩn hóa dữ liệu Dashboard từ các API Admin.
async function requestDashboardData() {
  const [pendingOwners, pendingSubmissions, pois, users, analyticsResult, activeVisitorResult] = await Promise.all([
    getPoiOwnerRegistrations("pending"),
    getPoiSubmissions("pending"),
    getSystemPois(),
    getUsers(),
    getTourAnalytics(30)
      .then((tourAnalytics) => ({ tourAnalytics, tourAnalyticsError: "" }))
      .catch((error) => ({ tourAnalytics: null, tourAnalyticsError: error.message })),
    getActiveVisitors().catch(() => null),
  ]);

  return {
    pendingOwners: Array.isArray(pendingOwners) ? pendingOwners : [],
    pendingSubmissions: Array.isArray(pendingSubmissions) ? pendingSubmissions : [],
    pois: Array.isArray(pois) ? pois : [],
    users: Array.isArray(users) ? users : [],
    activeVisitors: activeVisitorResult?.activeVisitors ?? null,
    ...analyticsResult,
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

  useEffect(() => {
    let isActive = true;
    const refreshActiveVisitors = async () => {
      try {
        const result = await getActiveVisitors();
        if (isActive) {
          setData((current) => ({ ...current, activeVisitors: result.activeVisitors }));
        }
      } catch {
        // Keep the last successfully loaded count if the analytics endpoint is temporarily unavailable.
      }
    };
    const intervalId = window.setInterval(refreshActiveVisitors, 30_000);
    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const cards = [
    { icon: "📍", label: "Địa điểm trong hệ thống", value: data.pois.length, tone: "green" },
    { icon: "👥", label: "Tài khoản", value: data.users.length, tone: "blue" },
    { icon: "👣", label: "Lượt truy cập (30 ngày)", value: data.tourAnalytics?.summary?.visits ?? 0, tone: "purple" },
    { icon: "🟢", label: "Phiên đang tham gia", value: data.activeVisitors, tone: "green" },
    { icon: "🪪", label: "Chủ địa điểm chờ duyệt", value: data.pendingOwners.length, tone: "orange" },
    { icon: "📝", label: "Địa điểm chờ duyệt", value: data.pendingSubmissions.length, tone: "purple" },
  ];
  const analytics = data.tourAnalytics;
  const dailyActivity = analytics?.daily?.slice(-14) ?? [];
  const maxDailyStarts = Math.max(1, ...dailyActivity.map((day) => day.starts));
  const languageLabels = { vi: "Tiếng Việt", en: "English", zh: "中文", ja: "日本語", ko: "한국어" };

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
              <strong>{isLoading || card.value == null ? "—" : card.value}</strong>
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

      {/* [TOUR-AN-006] Thống kê lượt nghe, hoàn thành, ngôn ngữ và POI phổ biến 30 ngày. */}
      <section className="admin-card tour-analytics-card">
        <div className="admin-card-heading tour-analytics-heading">
          <div>
            <span className="admin-eyebrow">TRẢI NGHIỆM DU KHÁCH · 30 NGÀY</span>
            <h2>Thuyết minh bằng giọng đọc</h2>
            <p>Số liệu tổng hợp ẩn danh từ các lượt nghe trên website.</p>
          </div>
          <span className="tour-analytics-range">30 ngày gần nhất</span>
        </div>

        {data.tourAnalyticsError && (
          <p className="tour-analytics-notice" role="status">
            Thống kê trải nghiệm sẽ hiển thị sau khi backend cập nhật xong.
          </p>
        )}

        <div className="tour-analytics-metrics">
          <article><span>Lượt bắt đầu</span><strong>{isLoading || !analytics ? "—" : analytics.summary.starts}</strong></article>
          <article><span>Nghe hoàn tất</span><strong>{isLoading || !analytics ? "—" : analytics.summary.completions}</strong></article>
          <article><span>Tỷ lệ hoàn tất</span><strong>{isLoading || !analytics ? "—" : `${analytics.summary.completionRate}%`}</strong></article>
          <article><span>Thời lượng TB</span><strong>{isLoading || !analytics ? "—" : `${analytics.summary.averageDurationSeconds}s`}</strong></article>
        </div>

        <div className="tour-analytics-detail-grid">
          <section className="tour-analytics-subsection">
            <h3>Hoạt động theo ngày</h3>
            {dailyActivity.length ? (
              <div className="tour-daily-list">
                {dailyActivity.map((day) => (
                  <div className="tour-daily-row" key={day.date}>
                    <time dateTime={day.date}>{new Date(`${day.date}T00:00:00`).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}</time>
                    <div className="tour-daily-bars" aria-label={`${day.starts} lượt bắt đầu, ${day.completions} lượt hoàn tất`}>
                      <span className="tour-daily-bar starts" style={{ width: `${Math.max(day.starts ? 4 : 0, day.starts / maxDailyStarts * 100)}%` }} title={`${day.starts} lượt bắt đầu`} />
                      <span className="tour-daily-bar completions" style={{ width: `${Math.max(day.completions ? 4 : 0, day.completions / maxDailyStarts * 100)}%` }} title={`${day.completions} lượt hoàn tất`} />
                    </div>
                    <span className="tour-daily-count">{day.starts}</span>
                  </div>
                ))}
              </div>
            ) : <p className="tour-analytics-empty">{isLoading ? "Đang tải thống kê..." : data.tourAnalyticsError ? "Chưa khả dụng ở backend hiện tại." : "Chưa có lượt nghe được ghi nhận."}</p>}
            <div className="tour-chart-legend"><span><i className="starts" />Bắt đầu</span><span><i className="completions" />Hoàn tất</span></div>
          </section>

          <section className="tour-analytics-subsection">
            <h3>Địa điểm được nghe nhiều</h3>
            {analytics?.topPois?.length ? (
              <ol className="tour-ranking-list">
                {analytics.topPois.map((poi, index) => (
                  <li key={poi.poiId}><span className="tour-ranking-index">{index + 1}</span><span className="tour-ranking-name">{poi.name}</span><strong>{poi.count}</strong></li>
                ))}
              </ol>
            ) : <p className="tour-analytics-empty">{isLoading ? "Đang tải thống kê..." : data.tourAnalyticsError ? "Chưa khả dụng ở backend hiện tại." : "Chưa có dữ liệu địa điểm."}</p>}

            <h3 className="tour-language-title">Ngôn ngữ thuyết minh</h3>
            {analytics?.languages?.length ? (
              <ul className="tour-language-list">
                {analytics.languages.map((item) => (
                  <li key={item.language}><span>{languageLabels[item.language] || item.language}</span><strong>{item.count}</strong></li>
                ))}
              </ul>
            ) : <p className="tour-analytics-empty">{data.tourAnalyticsError ? "Chưa khả dụng ở backend hiện tại." : "Chưa có ngôn ngữ được ghi nhận."}</p>}
          </section>
        </div>
      </section>
    </section>
  );
}

export default AdminDashboard;
