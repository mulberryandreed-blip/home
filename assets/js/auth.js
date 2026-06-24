(function () {
  const ACCESS_CODE = "MESWEDA2026";
  const KEY = "mesweda_auth";

  if (localStorage.getItem(KEY) === "1") {
    localStorage.setItem("meswedaAccess", "granted");
    window.location.replace("dashboard.html");
    return;
  }

  const form = document.getElementById("login-form");
  const input = document.getElementById("code");
  const error = document.getElementById("error");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const val = (input.value || "").trim();
    if (val === ACCESS_CODE) {
      localStorage.setItem(KEY, "1");
      localStorage.setItem("meswedaAccess", "granted");
      window.location.replace("dashboard.html");
    } else {
      error.hidden = false;
      input.value = "";
      input.focus();
    }
  });
})();
