import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Ensure data-theme and Tailwind dark class are always in sync on initial boot
const savedTheme = localStorage.getItem("theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);
if (savedTheme === "dark") {
  document.documentElement.classList.add("dark");
} else {
  document.documentElement.classList.remove("dark");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
