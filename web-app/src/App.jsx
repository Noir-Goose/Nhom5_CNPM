
import MapApp from "./MapApp";
import OwnerRegisterPage from "./pages/OwnerRegisterPage";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import OwnerPage from "./pages/OwnerPage";
import "./App.css";

function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/owner/register") {
    return <OwnerRegisterPage />;
  }

  if (path === "/login") {
    return <LoginPage />;
  }

  if (path === "/admin") {
    return <AdminPage />;
  }

  if (path === "/owner") {
    return <OwnerPage />;
  }

  return <MapApp />;
}

export default App;
