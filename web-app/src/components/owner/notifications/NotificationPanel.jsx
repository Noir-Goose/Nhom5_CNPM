import { useEffect, useState } from "react";
import {
  getMyNotifications,
  getNotificationDetail,
} from "../../../services/notificationService";

function formatDate(value) {
  if (!value) return "Chưa có thông tin";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa có thông tin";
  }

  return date.toLocaleString("vi-VN");
}

const NOTIFICATION_TYPE_LABELS = {
  revision_requested: "Yêu cầu chỉnh sửa",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
  reject: "Bị từ chối",
};

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] =
    useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetailId, setLoadingDetailId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      setLoading(true);
      setError("");

      try {
        const data = await getMyNotifications();

        if (!Array.isArray(data)) {
          throw new Error("Dữ liệu thông báo không hợp lệ.");
        }

        if (!cancelled) {
          setNotifications(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message || "Không thể tải danh sách thông báo."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleOpenNotification(notification) {
    setError("");
    setLoadingDetailId(notification.id);

    try {
      const detail = await getNotificationDetail(notification.id);

      setSelectedNotification(detail);

      setNotifications((current) =>
        current.map((item) =>
          item.id === detail.id ? detail : item
        )
      );
    } catch (err) {
      setError(
        err.message || "Không thể tải chi tiết thông báo."
      );
    } finally {
      setLoadingDetailId(null);
    }
  }

  function closeDetail() {
    setSelectedNotification(null);
  }

  if (loading) {
    return (
      <section className="submission-status">
        <h1>Thông báo</h1>
        <p>Đang tải danh sách thông báo...</p>
      </section>
    );
  }

  return (
    <section className="submission-status">
      <div className="submission-heading">
        <div>
          <h1>Thông báo</h1>
          <p>
            Theo dõi các cập nhật về địa điểm bạn đã đăng ký.
          </p>
        </div>

        <span className="submission-count">
          {notifications.length} thông báo
        </span>
      </div>

      {error && (
        <p className="submission-error" role="alert">
          {error}
        </p>
      )}

      {notifications.length === 0 ? (
        <div className="submission-empty">
          <span aria-hidden="true">🔔</span>
          <h2>Chưa có thông báo nào</h2>
          <p>
            Thông báo sẽ xuất hiện khi Admin xử lý yêu cầu
            địa điểm của bạn.
          </p>
        </div>
      ) : (
        <div className="submission-table-wrapper">
          <table className="submission-table">
            <thead>
              <tr>
                <th>Thông báo</th>
                <th>Ngày nhận</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {notifications.map((notification) => (
                <tr key={notification.id}>
                  <td>
                    <strong>
                      {notification.title || "Thông báo"}
                    </strong>
                    <small>{notification.message}</small>
                  </td>

                  <td>{formatDate(notification.createdAt)}</td>

                  <td>
                    <span
                      className={`submission-status-badge ${
                        notification.isRead
                          ? "approved"
                          : "pending"
                      }`}
                    >
                      {notification.isRead ? "Đã đọc" : "Chưa đọc"}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="submission-detail-button"
                      disabled={loadingDetailId === notification.id}
                      onClick={() =>
                        handleOpenNotification(notification)
                      }
                    >
                      {loadingDetailId === notification.id
                        ? "Đang tải..."
                        : "Chi tiết"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Popup chi tiết: tái sử dụng giao diện modal của UC8 */}
      {selectedNotification && (
        <div
          className="submission-modal-backdrop"
          onClick={closeDetail}
        >
          <section
            className="submission-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="submission-modal-heading">
              <div>
                <p>CHI TIẾT THÔNG BÁO</p>
                <h2 id="notification-detail-title">
                  {selectedNotification.title || "Thông báo"}
                </h2>
              </div>

              <button
                type="button"
                className="submission-close-button"
                onClick={closeDetail}
                aria-label="Đóng chi tiết thông báo"
              >
                ×
              </button>
            </div>

            <div className="submission-detail-content">
              <div className="submission-detail-row">
                <span>Loại thông báo</span>
                <strong>
                  {NOTIFICATION_TYPE_LABELS[
                    selectedNotification.type
                  ] ||
                    selectedNotification.type ||
                    "Thông báo"}
                </strong>
              </div>

              <div className="submission-detail-row">
                <span>Nội dung</span>
                <strong>
                  {selectedNotification.message || "Không có nội dung"}
                </strong>
              </div>

              <div className="submission-detail-row">
                <span>Ngày nhận</span>
                <strong>
                  {formatDate(selectedNotification.createdAt)}
                </strong>
              </div>

              <div className="submission-detail-row">
                <span>Trạng thái</span>
                <strong>
                  {selectedNotification.isRead ? "Đã đọc" : "Chưa đọc"}
                </strong>
              </div>

              {selectedNotification.readAt && (
                <div className="submission-detail-row">
                  <span>Ngày đọc</span>
                  <strong>
                    {formatDate(selectedNotification.readAt)}
                  </strong>
                </div>
              )}

              {selectedNotification.poiId && (
                <div className="submission-detail-row">
                  <span>Mã địa điểm</span>
                  <strong>{selectedNotification.poiId}</strong>
                </div>
              )}

              {selectedNotification.submissionId && (
                <div className="submission-detail-row">
                  <span>Mã yêu cầu</span>
                  <strong>
                    {selectedNotification.submissionId}
                  </strong>
                </div>
              )}
            </div>

            <div className="submission-modal-footer">
              <button
                type="button"
                className="submission-detail-button"
                onClick={closeDetail}
              >
                Đóng
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}