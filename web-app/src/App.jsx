
import MapApp from "./MapApp";
import OwnerRegisterPage from "./pages/OwnerRegisterPage";

function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/owner/register") {
    return <OwnerRegisterPage />;
  }

  if (path === "/login") {
    return (
      <main
        style={{
          maxWidth: "460px",
          margin: "100px auto",
          padding: "24px",
          fontFamily: "Arial, sans-serif",
          textAlign: "center",
        }}
      >
        <h1>Đăng nhập</h1>
        <p>Chức năng đăng nhập dành cho POI Owner và Admin sẽ được xây dựng trong UC6.</p>
      </main>
    );
  }

  return <MapApp />;
}

export default App;
