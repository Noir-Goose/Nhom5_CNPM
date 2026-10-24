import { useEffect, useState } from "react";
import { getAuditEvent, getAuditLogs } from "../../services/auditLogService";

const PAGE_SIZE = 25;

function localDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function AuditLog() {
  const [filters, setFilters] = useState({ from: "", to: "", actorId: "", action: "", resourceType: "", resourceId: "", outcome: "", q: "" });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, hasNext: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const query = { page, pageSize: PAGE_SIZE, ...appliedFilters };
    for (const key of ["from", "to"]) {
      if (query[key]) query[key] = new Date(query[key]).toISOString();
    }
    getAuditLogs(query).then((data) => {
      if (!cancelled) {
        setResult(data);
        setError("");
        setLoading(false);
      }
    }).catch((err) => {
      if (!cancelled) {
        setError(err.message || "Không thể tải nhật ký hoạt động.");
        setResult({ items: [], total: 0, hasNext: false });
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [appliedFilters, page, refreshKey]);

  async function openEvent(eventId) {
    setDetailLoading(true);
    setSelected(null);
    try {
      setSelected(await getAuditEvent(eventId));
    } catch (err) {
      setError(err.message || "Không thể tải chi tiết sự kiện.");
    } finally {
      setDetailLoading(false);
    }
  }

  function applyFilters(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setPage(1);
    setAppliedFilters({ ...filters });
  }

  function clearFilters() {
    const empty = { from: "", to: "", actorId: "", action: "", resourceType: "", resourceId: "", outcome: "", q: "" };
    setLoading(true);
    setError("");
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  }

  return (
    <section className="admin-section audit-log-page">
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">UC13 · NHẬT KÝ KIỂM TOÁN</span>
          <h1>Audit Log</h1>
          <p>Xem lại các thao tác quản trị và sự kiện đăng nhập gần đây.</p>
        </div>
        <button type="button" className="admin-refresh" onClick={() => { setLoading(true); setError(""); setRefreshKey((value) => value + 1); }} disabled={loading}>Làm mới</button>
      </div>

      <form className="audit-filters" onSubmit={applyFilters}>
        <label>Từ ngày<input type="datetime-local" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></label>
        <label>Đến ngày<input type="datetime-local" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></label>
        <label>Actor ID<input value={filters.actorId} onChange={(e) => setFilters({ ...filters, actorId: e.target.value })} maxLength={100} placeholder="ID người thực hiện" /></label>
        <label>Action<input value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} maxLength={100} placeholder="vd. poi.update" /></label>
        <label>Loại đối tượng<input value={filters.resourceType} onChange={(e) => setFilters({ ...filters, resourceType: e.target.value })} maxLength={80} placeholder="vd. poi" /></label>
        <label>Resource ID<input value={filters.resourceId} onChange={(e) => setFilters({ ...filters, resourceId: e.target.value })} maxLength={200} /></label>
        <label>Kết quả<select value={filters.outcome} onChange={(e) => setFilters({ ...filters, outcome: e.target.value })}><option value="">Tất cả</option><option value="success">Thành công</option><option value="failure">Thất bại</option><option value="denied">Bị từ chối</option></select></label>
        <label className="audit-keyword">Từ khóa<input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} maxLength={100} placeholder="Actor, action, resource hoặc mô tả" /></label>
        <div className="audit-filter-actions"><button className="admin-primary" type="submit">Lọc</button><button type="button" onClick={clearFilters}>Xóa lọc</button></div>
      </form>

      {error && <div className="admin-alert error" role="alert">{error}</div>}
      <div className="audit-table-wrap">
        <table className="audit-table">
          <thead><tr><th>Thời gian</th><th>Actor</th><th>Action</th><th>Đối tượng</th><th>Kết quả</th><th>Mô tả</th><th /></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan="7" className="audit-state">Đang tải nhật ký…</td></tr> : result.items.length === 0 ? <tr><td colSpan="7" className="audit-state">Không có sự kiện phù hợp.</td></tr> : result.items.map((item) => (
              <tr key={item.eventId}>
                <td>{localDateTime(item.occurredAt)}</td>
                <td>{item.actorEmail || item.actorRole || "system"}<small>{item.actorId || ""}</small></td>
                <td><code>{item.action}</code></td>
                <td>{item.resourceType}<small>{item.resourceId || "—"}</small></td>
                <td><span className={`audit-outcome ${item.outcome}`}>{item.outcome}</span></td>
                <td>{item.summary}</td>
                <td><button type="button" className="audit-detail-button" onClick={() => openEvent(item.eventId)}>Chi tiết</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="audit-pagination"><span>{result.total} sự kiện · Trang {page}</span><div><button type="button" onClick={() => { setLoading(true); setPage((value) => Math.max(1, value - 1)); }} disabled={page <= 1 || loading}>Trước</button><button type="button" onClick={() => { setLoading(true); setPage((value) => value + 1); }} disabled={!result.hasNext || loading}>Sau</button></div></div>

      {(detailLoading || selected) && <div className="audit-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
        <section className="audit-modal" role="dialog" aria-modal="true" aria-labelledby="audit-detail-heading">
          <header><h2 id="audit-detail-heading">Chi tiết sự kiện</h2><button type="button" onClick={() => setSelected(null)} aria-label="Đóng">×</button></header>
          {detailLoading ? <p>Đang tải…</p> : selected && <><dl className="audit-detail-grid">{[["Event ID", selected.eventId], ["Thời gian", localDateTime(selected.occurredAt)], ["Actor", selected.actorEmail || selected.actorRole], ["Actor ID", selected.actorId], ["Action", selected.action], ["Resource", `${selected.resourceType}${selected.resourceId ? ` · ${selected.resourceId}` : ""}`], ["Kết quả", selected.outcome], ["Mã lý do", selected.reasonCode], ["Mô tả", selected.summary]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl><h3>Thay đổi được ghi nhận</h3><pre>{JSON.stringify(selected.changes || {}, null, 2)}</pre></>}
        </section>
      </div>}
    </section>
  );
}
