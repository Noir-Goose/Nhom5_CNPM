import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getPoiSubmissions,
  approvePoiSubmission,
  rejectPoiSubmission,
  getSystemPois,
  updateSystemPoi,
  requestPoiRevision,
} from "../../../services/adminPoiService";
import "../../../pages/AdminPage.css";
import LocationPicker from "../../map/LocationPicker";
import { poiCategoryOptions } from "../../../data/categories";

const contentLanguages = [
  { code: "vi", label: "Tiếng Việt" },
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
];

const createEditForm = (poi) => {
  const content = Object.fromEntries(
    contentLanguages.map(({ code }) => {
      const languageContent = poi.content?.[code] ?? {};

      return [
        code,
        {
          name: languageContent.name ?? "",
          description: languageContent.description ?? "",
          category: languageContent.category ?? "",
        },
      ];
    })
  );

  return {
    name: poi.name ?? poi.content?.vi?.name ?? "",
    categoryKey: poi.categoryKey ?? "food",
    address: poi.address ?? "",
    description:
      poi.description ?? poi.content?.vi?.description ?? "",
    latitude: String(poi.latitude ?? ""),
    longitude: String(poi.longitude ?? ""),
    isActive: poi.isActive !== false,
    content,
  };
};

function AdminPoiManagement() {
  const [activeTab, setActiveTab] = useState("submissions");
  const [status, setStatus] = useState("pending");
  const [submissions, setSubmissions] = useState([]);
  const [pois, setPois] = useState([]);
  const [poiSearch, setPoiSearch] = useState("");
  const [poiCategory, setPoiCategory] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [editingPoi, setEditingPoi] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editLanguage, setEditLanguage] = useState("vi");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      if (activeTab === "submissions") {
        const data = await getPoiSubmissions(status);
        setSubmissions(Array.isArray(data) ? data : []);
      } else {
        const data = await getSystemPois();
        setPois(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu POI.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, status]);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError("");

      try {
        if (activeTab === "submissions") {
          const data = await getPoiSubmissions(status);

          if (!cancelled) {
            setSubmissions(Array.isArray(data) ? data : []);
          }
        } else {
          const data = await getSystemPois();

          if (!cancelled) {
            setPois(Array.isArray(data) ? data : []);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Không thể tải dữ liệu POI.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [activeTab, status]);

  async function handleApprove(item) {
    const id = item.submissionId;

    if (!id) {
      setError("Không tìm thấy mã yêu cầu POI.");
      return;
    }

    if (!window.confirm(`Duyệt POI "${item.name ?? item.content?.vi?.name ?? ""}"?`)) {
      return;
    }

    setProcessingId(id);
    setError("");
    setMessage("");

    try {
      await approvePoiSubmission(id);
      setMessage("Đã duyệt POI.");
      await loadData();
    } catch (err) {
      setError(err.message || "Không thể duyệt POI.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(item) {
    const id = item.submissionId;

    if (!id) {
      setError("Không tìm thấy mã yêu cầu POI.");
      return;
    }

    const reason = window.prompt("Nhập lý do từ chối POI:");

    if (reason === null) return;

    if (!reason.trim()) {
      setError("Vui lòng nhập lý do từ chối.");
      return;
    }

    setProcessingId(id);
    setError("");
    setMessage("");

    try {
      await rejectPoiSubmission(id, reason.trim());
      setMessage("Đã từ chối POI và gửi lý do.");
      await loadData();
    } catch (err) {
      setError(err.message || "Không thể từ chối POI.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleRequestRevision(item) {
    const id = item._id ?? item.id ?? item.poiId;

    if (!id) {
      setError("Không tìm thấy mã POI.");
      return;
    }

    const reason = window.prompt("Nhập nội dung yêu cầu chỉnh sửa:");

    if (reason === null) return;

    if (!reason.trim()) {
      setError("Vui lòng nhập nội dung yêu cầu chỉnh sửa.");
      return;
    }

    setProcessingId(id);
    setError("");
    setMessage("");

    try {
      await requestPoiRevision(id, reason.trim());
      setMessage("Đã gửi yêu cầu chỉnh sửa POI.");
      await loadData();
    } catch (err) {
      setError(err.message || "Không thể gửi yêu cầu chỉnh sửa.");
    } finally {
      setProcessingId(null);
    }
  }

  // Mở form và nạp toàn bộ dữ liệu hiện có của POI.
  function handleEdit(item) {
    const id = item._id ?? item.id ?? item.poiId;

    if (!id) {
      setError("Không tìm thấy mã POI.");
      return;
    }

    setEditingPoi(item);
    setEditForm(createEditForm(item));
    setEditLanguage("vi");
    setError("");
    setMessage("");
  }

  // Cập nhật trường thông tin chung.
  function handleFormChange(event) {
    const { name, value } = event.target;

    setEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  }
  function handleLocationChange({ latitude, longitude }) {
  setEditForm((current) => ({
    ...current,
    latitude: String(latitude),
    longitude: String(longitude),
  }));
}

  // Cập nhật nội dung của ngôn ngữ đang chọn.
  function handleLanguageContentChange(event) {
    const { name, value } = event.target;

    setEditForm((current) => ({
      ...current,
      content: {
        ...current.content,
        [editLanguage]: {
          ...current.content[editLanguage],
          [name]: value,
        },
      },
    }));
  }

  // Lưu đầy đủ thông tin POI lên API.
  async function handleSaveEdit(event) {
    event.preventDefault();

    if (!editingPoi || !editForm) return;

    const id = editingPoi._id ?? editingPoi.id ?? editingPoi.poiId;

    if (!id) {
      setError("Không tìm thấy mã POI.");
      return;
    }

    const latitude = Number(editForm.latitude);
    const longitude = Number(editForm.longitude);

    if (!editForm.name.trim()) {
      setError("Vui lòng nhập tên POI.");
      return;
    }

    if (!editForm.address.trim()) {
      setError("Vui lòng nhập địa chỉ POI.");
      return;
    }

    if (
      editForm.latitude.trim() === "" ||
      editForm.longitude.trim() === "" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setError("Vĩ độ phải từ -90 đến 90 và kinh độ từ -180 đến 180.");
      return;
    }
    
    const normalizedContent = Object.fromEntries(
      contentLanguages.map(({ code }) => {
        const languageContent = editForm.content[code];

        return [
          code,
          {
            name: languageContent.name.trim(),
            description: languageContent.description.trim(),
            category: languageContent.category.trim(),
          },
        ];
      })
    );

    // Tên và mô tả tiếng Việt đồng bộ với thông tin chung.
    normalizedContent.vi = {
      ...normalizedContent.vi,
      name: editForm.name.trim(),
      description: editForm.description.trim(),
    };

    const payload = {
      name: editForm.name.trim(),
      categoryKey: editForm.categoryKey,
      address: editForm.address.trim(),
      description: editForm.description.trim(),
      latitude,
      longitude,
      isActive: editForm.isActive,
      content: normalizedContent,
    };

    setIsSavingEdit(true);
    setError("");
    setMessage("");

    try {
      await updateSystemPoi(id, payload);

      setEditingPoi(null);
      setEditForm(null);
      setMessage("Đã cập nhật thông tin POI.");

      // Tải lại danh sách sau khi lưu thành công.
      const data = await getSystemPois();
      setPois(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Không thể cập nhật POI.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  function handleCancelEdit() {
    setEditingPoi(null);
    setEditForm(null);
    setError("");
  }

  const filteredPois = useMemo(() => {
    const keyword = poiSearch.trim().toLocaleLowerCase();

    return pois.filter((poi) => {
      if (poiCategory && poi.categoryKey !== poiCategory) return false;
      if (!keyword) return true;

      const localizedContent = Object.values(poi.content ?? {}).flatMap(
        (content) => [content?.name, content?.description, content?.category]
      );
      const searchableText = [
        poi.name,
        poi.address,
        poi.description,
        poi.categoryKey,
        ...localizedContent,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return searchableText.includes(keyword);
    });
  }, [pois, poiSearch, poiCategory]);

  const rows = activeTab === "submissions" ? submissions : filteredPois;

  return (
    <section className="admin-card">
      <div className="admin-card-heading">
        <h2>Quản lý POI</h2>
        <p>Quản lý các POI được gửi lên và POI trên hệ thống.</p>
      </div>

      <div className="poi-tabs">
        <button
          type="button"
          className={activeTab === "submissions" ? "active" : ""}
          onClick={() => {
            setActiveTab("submissions");
            setMessage("");
            setError("");
          }}
        >
          POI chưa phản hồi
        </button>

        <button
          type="button"
          className={activeTab === "system" ? "active" : ""}
          onClick={() => {
            setActiveTab("system");
            setMessage("");
            setError("");
          }}
        >
          POI trên hệ thống
        </button>
      </div>

      {activeTab === "submissions" && (
        <div className="poi-status-filters">
          {[
            ["pending", "Chờ duyệt"],
            ["approved", "Đã duyệt"],
            ["rejected", "Bị từ chối"],
            ["revision_requested", "Yêu cầu sửa"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={status === value ? "active" : ""}
              onClick={() => setStatus(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {activeTab === "system" && (
        <div className="poi-system-filters" aria-label="Tìm kiếm và lọc POI">
          <label className="poi-system-search">
            <span>Tìm POI</span>
            <input
              type="search"
              value={poiSearch}
              onChange={(event) => setPoiSearch(event.target.value)}
              placeholder="Tên, địa chỉ hoặc nội dung..."
            />
          </label>

          <label className="poi-system-category">
            <span>Lọc theo nhóm</span>
            <select
              value={poiCategory}
              onChange={(event) => setPoiCategory(event.target.value)}
            >
              <option value="">Tất cả nhóm</option>
              {poiCategoryOptions.map((category) => (
                <option key={category.key} value={category.key}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <span className="poi-system-count" aria-live="polite">
            {filteredPois.length} / {pois.length} POI
          </span>
        </div>
      )}

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

      {editingPoi && editForm ? (
        <div className="poi-edit-panel">
          <div className="poi-edit-heading">
            <div>
              <h3>Chỉnh sửa POI</h3>
              <p>Các thay đổi chỉ được lưu khi bạn nhấn Lưu thay đổi.</p>
            </div>
          </div>

          <form onSubmit={handleSaveEdit}>
            <div className="poi-edit-grid">
              <label>
                Tên POI
                <input
                  name="name"
                  value={editForm.name}
                  onChange={handleFormChange}
                  required
                />
              </label>

              <label>
                Nhóm POI
                <select
                  name="categoryKey"
                  value={editForm.categoryKey}
                  onChange={handleFormChange}
                  required
                >
                  {poiCategoryOptions.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="poi-edit-full">
                Địa chỉ
                <input
                  name="address"
                  value={editForm.address}
                  onChange={handleFormChange}
                  required
                />
              </label>

              <label className="poi-edit-full">
                Mô tả tiếng Việt
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleFormChange}
                  rows={3}
                />
              </label>

              <label>
                Vĩ độ (Latitude)
                <input
                  name="latitude"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={editForm.latitude}
                  onChange={handleFormChange}
                  required
                />
              </label>

              <label>
                Kinh độ (Longitude)
                <input
                  name="longitude"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={editForm.longitude}
                  onChange={handleFormChange}
                  required
                />
              </label>

              <label>
                Trạng thái POI
                <select
                  name="isActive"
                  value={editForm.isActive ? "active" : "inactive"}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      isActive: event.target.value === "active",
                    }))
                  }
                >
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Đã ẩn</option>
                </select>
              </label>
            </div>

            <div className="poi-language-editor">
              <h4>Nội dung đa ngôn ngữ</h4>

              <div className="poi-language-tabs">
                {contentLanguages.map(({ code, label }) => (
                  <button
                    key={code}
                    type="button"
                    className={editLanguage === code ? "active" : ""}
                    onClick={() => setEditLanguage(code)}
                  >
                    {label}
                  </button>
                ))}
              </div>
                
              <div className="poi-edit-grid">
                <label className="poi-edit-full">
                  Tên ({contentLanguages.find(
                    (language) => language.code === editLanguage
                  )?.label})
                  <input
                    name="name"
                    value={editForm.content[editLanguage].name}
                    onChange={handleLanguageContentChange}
                    required
                  />
                </label>

                <label className="poi-edit-full">
                  Mô tả
                  <textarea
                    name="description"
                    value={editForm.content[editLanguage].description}
                    onChange={handleLanguageContentChange}
                    rows={3}
                  />
                </label>

                <label className="poi-edit-full">
                  Danh mục hiển thị
                  <input
                    name="category"
                    value={editForm.content[editLanguage].category}
                    onChange={handleLanguageContentChange}
                  />
                </label>
              </div>
            </div>
            <div className="poi-edit-full poi-location-picker">
                    <h4>Vị trí trên bản đồ</h4>

                    <p>
                        Nhấn vào bản đồ để chọn vị trí mới cho POI.
                        Vĩ độ và kinh độ sẽ được cập nhật tự động.
                    </p>

                    <LocationPicker
                        value={{
                        latitude: editForm.latitude,
                        longitude: editForm.longitude,
                        }}
                        onChange={handleLocationChange}
                    />
                </div>
            <div className="poi-edit-actions">
              <button
                type="button"
                className="poi-cancel-edit"
                onClick={handleCancelEdit}
                disabled={isSavingEdit}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="admin-approve"
                disabled={isSavingEdit}
              >
                {isSavingEdit ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {isLoading ? (
            <div className="admin-empty">Đang tải dữ liệu POI...</div>
          ) : rows.length === 0 ? (
            <div className="admin-empty">
              {activeTab === "system" && pois.length > 0
                ? "Không tìm thấy POI phù hợp. Thử đổi từ khóa hoặc bộ lọc."
                : "Không có POI trong danh sách này."}
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tên POI</th>
                    <th>Địa chỉ</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((item, index) => {
                    const id =
                      item.submissionId ??
                      item._id ??
                      item.id ??
                      item.poiId ??
                      index;

                    const name =
                      item.name ??
                      item.content?.vi?.name ??
                      "Chưa có tên";

                    const address = item.address ?? "—";

                    return (
                      <tr key={id}>
                        <td><strong>{name}</strong></td>
                        <td>{address}</td>

                        {activeTab === "submissions" ? (
                          <td>
                            {({
                              pending: "Chờ duyệt",
                              approved: "Đã duyệt",
                              rejected: "Bị từ chối",
                              revision_requested: "Yêu cầu sửa",
                            })[item.status] ?? item.status ?? "—"}
                          </td>
                        ) : (
                          <td>
                            <span
                              className={`admin-status ${
                                item.isActive === false ? "inactive" : "approved"
                              }`}
                            >
                              {item.isActive === false ? "Đã ẩn" : "Đang hoạt động"}
                            </span>
                          </td>
                        )}

                        <td>
                          <div className="admin-row-actions">
                            {activeTab === "submissions" &&
                              status === "pending" && (
                                <>
                                  <button
                                    type="button"
                                    className="admin-approve"
                                    disabled={processingId !== null}
                                    onClick={() => handleApprove(item)}
                                  >
                                    {processingId === id
                                      ? "Đang xử lý..."
                                      : "Duyệt"}
                                  </button>

                                  <button
                                    type="button"
                                    className="admin-reject"
                                    disabled={processingId !== null}
                                    onClick={() => handleReject(item)}
                                  >
                                    Từ chối
                                  </button>
                                </>
                              )}

                            {activeTab === "system" && (
                              <>
                                <button
                                  type="button"
                                  className="admin-approve"
                                  disabled={processingId !== null}
                                  onClick={() => handleEdit(item)}
                                >
                                  Chỉnh sửa
                                </button>

                                <button
                                  type="button"
                                  className="admin-reject"
                                  disabled={processingId !== null}
                                  onClick={() => handleRequestRevision(item)}
                                >
                                  Yêu cầu sửa
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="poi-management-footer">
        <button
          type="button"
          className="admin-refresh"
          onClick={loadData}
          disabled={isLoading || Boolean(editingPoi)}
        >
          {isLoading ? "Đang tải..." : "↻ Làm mới"}
        </button>
      </div>
    </section>
  );
}

export default AdminPoiManagement;
