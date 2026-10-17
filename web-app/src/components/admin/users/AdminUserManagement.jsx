import { useCallback, useEffect, useMemo, useState } from "react";
import { createUser, getUsers, setUserActiveStatus, updateUser } from "../../../services/adminUserService";
import "./AdminUserManagement.css";

const EMPTY_FORM = { fullName: "", email: "", role: "poi_owner", password: "" };
const ROLE_LABELS = { admin: "Admin", poi_owner: "POI Owner" };

function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingUser, setEditingUser] = useState(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await getUsers();
      setUsers(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.message || "Không thể tải danh sách người dùng.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getUsers()
      .then((result) => {
        if (!cancelled) setUsers(Array.isArray(result) ? result : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Không thể tải danh sách người dùng.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((user) =>
      [user.fullName, user.email, ROLE_LABELS[user.role], user.role]
        .some((value) => String(value || "").toLowerCase().includes(keyword)),
    );
  }, [users, search]);

  function startEdit(user) {
    setEditingUser(user);
    setForm({ fullName: user.fullName || "", email: user.email || "", role: user.role || "poi_owner", password: "" });
    setError("");
    setMessage("");
  }

  function resetForm() {
    setEditingUser(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    if (fullName.length < 2) return setError("Họ và tên phải có ít nhất 2 ký tự.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Vui lòng nhập email hợp lệ.");
    if (!editingUser && form.password.length < 12) return setError("Mật khẩu phải có ít nhất 12 ký tự.");
    if (editingUser && form.password && form.password.length < 12) return setError("Mật khẩu mới phải có ít nhất 12 ký tự.");

    setIsSaving(true);
    try {
      const payload = { fullName, email, role: form.role };
      if (form.password) payload.password = form.password;
      if (editingUser) {
        await updateUser(editingUser.id, payload);
        setMessage("Đã cập nhật thông tin người dùng.");
      } else {
        payload.password = form.password;
        await createUser(payload);
        setMessage("Đã tạo người dùng mới.");
      }
      resetForm();
      await loadUsers();
    } catch (err) {
      setError(err.message || "Không thể lưu thông tin người dùng.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus(user) {
    const nextIsActive = user.isActive === false;
    const action = nextIsActive ? "mở khóa" : "khóa";
    if (!window.confirm(`Bạn có chắc muốn ${action} tài khoản ${user.email}?`)) return;

    setError("");
    setMessage("");
    try {
      await setUserActiveStatus(user.id, nextIsActive);
      setMessage(nextIsActive ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản. Người dùng sẽ không thể đăng nhập hoặc sử dụng chức năng yêu cầu đăng nhập.");
      await loadUsers();
    } catch (err) {
      setError(err.message || `Không thể ${action} tài khoản.`);
    }
  }

  return (
    <section className="admin-user-management">
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">UC · QUẢN LÝ NGƯỜI DÙNG</span>
          <h1>Quản lý người dùng</h1>
          <p>Xem, tạo, cập nhật, phân quyền và khóa tài khoản không phải Admin.</p>
        </div>
        <button type="button" className="admin-refresh" onClick={loadUsers} disabled={isLoading}>
          {isLoading ? "Đang tải..." : "↻ Làm mới"}
        </button>
      </div>

      {(error || message) && <div className={`admin-alert ${error ? "error" : "success"}`} role={error ? "alert" : "status"}>{error || message}</div>}

      <div className="admin-user-grid">
        <section className="admin-card admin-user-form-card">
          <div className="admin-card-heading">
            <div><h2>{editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng"}</h2><p>Nhập thông tin và vai trò của tài khoản.</p></div>
          </div>
          <form className="admin-user-form" onSubmit={handleSubmit}>
            <label>Họ và tên<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} maxLength={100} required /></label>
            <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={254} required /></label>
            <label>Vai trò<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="poi_owner">POI Owner</option><option value="admin">Admin</option></select></label>
            <label>{editingUser ? "Mật khẩu mới (không bắt buộc)" : "Mật khẩu"}<input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={12} maxLength={128} required={!editingUser} placeholder={editingUser ? "Để trống nếu không đổi" : "Ít nhất 12 ký tự"} /></label>
            <div className="admin-user-form-actions">
              <button className="admin-approve" type="submit" disabled={isSaving}>{isSaving ? "Đang lưu..." : editingUser ? "Lưu thay đổi" : "Tạo người dùng"}</button>
              {editingUser && <button className="admin-reject" type="button" onClick={resetForm} disabled={isSaving}>Hủy</button>}
            </div>
          </form>
        </section>

        <section className="admin-card admin-user-list-card">
          <div className="admin-card-heading"><div><h2>Danh sách người dùng</h2><p>{filteredUsers.length} tài khoản</p></div></div>
          <label className="admin-user-search">Tìm theo tên, email hoặc vai trò<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nhập từ khóa..." /></label>
          {isLoading ? <div className="admin-empty">Đang tải danh sách người dùng...</div> : filteredUsers.length === 0 ? <div className="admin-empty"><h3>Không có người dùng</h3><p>Thử thay đổi từ khóa tìm kiếm.</p></div> : (
            <div className="admin-table-wrapper"><table className="admin-table admin-users-table"><thead><tr><th>Người dùng</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
              {filteredUsers.map((user) => {
                const accountLocked = user.isActive === false;
                const roleStatus = user.role === "poi_owner"
                  ? ({ pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Bị từ chối" }[user.approvalStatus] || "Đã xác minh")
                  : "Hoạt động";
                return (
                  <tr key={user.id}>
                    <td><strong>{user.fullName || "Chưa cập nhật"}</strong><small>{user.email}</small></td>
                    <td>{ROLE_LABELS[user.role] || user.role}</td>
                    <td>
                      <span className={`admin-status ${accountLocked ? "locked" : user.approvalStatus || "approved"}`}>
                        {accountLocked ? "Đã khóa" : roleStatus}
                      </span>
                    </td>
                    <td className="admin-user-row-actions">
                      <button type="button" className="admin-row-edit" onClick={() => startEdit(user)}>Sửa</button>
                      {user.role !== "admin" && (
                        <button
                          type="button"
                          className={`admin-row-status ${accountLocked ? "unlock" : "lock"}`}
                          onClick={() => handleToggleStatus(user)}
                        >
                          {accountLocked ? "Mở khóa" : "Khóa"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody></table></div>
          )}
        </section>
      </div>
    </section>
  );
}

export default AdminUserManagement;
