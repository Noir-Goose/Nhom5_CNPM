function MapStatus({ loading, error }) {
  if (loading) {
    return (
      <div className="map-status">
        Đang tải bản đồ và địa điểm...
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-status error">
        {error}
      </div>
    );
  }

  return null;
}

export default MapStatus;