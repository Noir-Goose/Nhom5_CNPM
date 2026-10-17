import { useEffect, useState } from "react";
import { getMyPoiSubmissions } from "../../../services/authService";
import "./SubmissionStatus.css";

const STATUS_LABELS = {
  pending: "Chưa duyệt",
  approved: "Đã duyệt",
  reject: "Bị từ chối",
  rejected: "Bị từ chối",
  fixRequest: "Yêu cầu chỉnh sửa",
  revision_requested: "Yêu cầu chỉnh sửa",
};

const STATUS_CLASSES = {
  pending: "pending",
  approved: "approved",
  reject: "rejected",
  rejected: "rejected",
  fixRequest: "revision-requested",
  revision_requested: "revision-requested",
};

const EDITABLE_STATUSES = new Set([
  "fixRequest",
  "revision_requested",
]);

function formatDate(value) {
  if (!value) return "Chưa có thông tin";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa có thông tin";
  }

  return date.toLocaleString("vi-VN");
}

export default function SubmissionStatus({
  onEditSubmission,
}) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSubmission, setSelectedSubmission] =
    useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSubmissions() {
      try {
        setLoading(true);
        setError("");

        const data = await getMyPoiSubmissions();

        if (!cancelled) {
          setSubmissions(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message || "Không thể tải danh sách yêu cầu."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSubmissions();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="submission-status">
        <h1>Trạng thái yêu cầu</h1>
        <p>Đang tải danh sách yêu cầu...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="submission-status">
        <h1>Trạng thái yêu cầu</h1>
        <p className="submission-error" role="alert">
          {error}
        </p>
      </section>
    );
  }

  return (
    <section className="submission-status">
      <div className="submission-heading">
        <div>
          <h1>Trạng thái yêu cầu</h1>
          <p>
            Theo dõi các địa điểm bạn đã gửi đăng ký.
            Chọn một yêu cầu để xem phản hồi từ Admin.
          </p>
        </div>

        <span className="submission-count">
          {submissions.length} yêu cầu
        </span>
      </div>

      {submissions.length === 0 ? (
        <div className="submission-empty">
          <span>📋</span>
          <h2>Chưa có yêu cầu nào</h2>
          <p>
            Các yêu cầu đăng ký địa điểm của bạn sẽ xuất hiện ở đây.
          </p>
        </div>
      ) : (
        <div className="submission-table-wrapper">
          <table className="submission-table">
            <thead>
              <tr>
                <th>Địa điểm</th>
                <th>Danh mục</th>
                <th>Ngày gửi</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {submissions.map((item) => (
                <tr key={item.submissionId}>
                  <td>
                    <strong>{item.name || "Chưa có tên"}</strong>
                    <small>
                      {item.address || "Chưa có địa chỉ"}
                    </small>
                  </td>

                  <td>{item.categoryKey || "—"}</td>

                  <td>{formatDate(item.createdAt)}</td>

                  <td>
                    <span
                      className={`submission-status-badge ${
                        STATUS_CLASSES[item.status] || "unknown"
                      }`}
                    >
                      {STATUS_LABELS[item.status] ||
                        item.status ||
                        "Chưa xác định"}
                    </span>
                  </td>

                  <td>
                    <div className="submission-actions">
                      <button
                        type="button"
                        className="submission-detail-button"
                        onClick={() =>
                          setSelectedSubmission(item)
                        }
                      >
                        Chi tiết
                      </button>

                      {EDITABLE_STATUSES.has(item.status) && (
                        <button
                          type="button"
                          className="submission-edit-button"
                          disabled={!onEditSubmission}
                          onClick={() =>
                            onEditSubmission?.(item)
                          }
                        >
                          Chỉnh sửa
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

      {selectedSubmission && (
        <div
          className="submission-modal-backdrop"
          onClick={() => setSelectedSubmission(null)}
        >
          <section
            className="submission-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="submission-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="submission-modal-heading">
              <div>
                <p>CHI TIẾT YÊU CẦU</p>
                <h2 id="submission-detail-title">
                  {selectedSubmission.name ||
                    "Địa điểm chưa có tên"}
                </h2>
              </div>

              <button
                type="button"
                className="submission-close-button"
                onClick={() => setSelectedSubmission(null)}
                aria-label="Đóng chi tiết"
              >
                ×
              </button>
            </div>

            <div className="submission-detail-content">
              <div className="submission-detail-row">
                <span>Mã yêu cầu</span>
                <strong>
                  {selectedSubmission.submissionId || "—"}
                </strong>
              </div>

              <div className="submission-detail-row">
                <span>Danh mục</span>
                <strong>
                  {selectedSubmission.categoryKey || "—"}
                </strong>
              </div>

              <div className="submission-detail-row">
                <span>Địa chỉ</span>
                <strong>
                  {selectedSubmission.address || "Chưa có địa chỉ"}
                </strong>
              </div>

              <div className="submission-detail-row">
                <span>Ngày gửi</span>
                <strong>
                  {formatDate(selectedSubmission.createdAt)}
                </strong>
              </div>

              <div className="submission-detail-row">
                <span>Cập nhật lần cuối</span>
                <strong>
                  {formatDate(selectedSubmission.updatedAt)}
                </strong>
              </div>

              <div className="submission-detail-row">
                <span>Trạng thái</span>
                <strong>
                  {STATUS_LABELS[selectedSubmission.status] ||
                    selectedSubmission.status ||
                    "Chưa xác định"}
                </strong>
              </div>

              <div className="submission-detail-row">
                <span>Phản hồi từ Admin</span>
                <strong>
                  {selectedSubmission.adminMessage ||
                    "Admin chưa có phản hồi."}
                </strong>
              </div>

              {EDITABLE_STATUSES.has(
                selectedSubmission.status
              ) && (
                <p className="submission-edit-notice">
                  Yêu cầu này cần được chỉnh sửa trước khi gửi lại.
                </p>
              )}
            </div>

            <div className="submission-modal-footer">
              {EDITABLE_STATUSES.has(
                selectedSubmission.status
              ) && (
                <button
                  type="button"
                  className="submission-edit-button"
                  disabled={!onEditSubmission}
                  onClick={() => {
                    onEditSubmission?.(selectedSubmission);
                    setSelectedSubmission(null);
                  }}
                >
                  Chỉnh sửa yêu cầu
                </button>
              )}

              <button
                type="button"
                className="submission-detail-button"
                onClick={() => setSelectedSubmission(null)}
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
