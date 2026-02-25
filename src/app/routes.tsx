import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { Dashboard } from "./components/Dashboard";
import { Login } from "./components/Login";
import { Signup } from "./components/Signup";
import { ScanResults } from "./components/ScanResults";
import { Alerts } from "./components/Alerts";
import { Settings } from "./components/Settings";
import { Remediation } from "./components/Remediation";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/signup",
    Component: Signup,
  },
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "scans", Component: ScanResults },
      { path: "alerts", Component: Alerts },
      { path: "remediation/:id", Component: Remediation },
      { path: "settings", Component: Settings },
    ],
  },
]);
