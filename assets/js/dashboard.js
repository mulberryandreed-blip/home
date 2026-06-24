(function () {
  const KEY = "mesweda_auth";
  if (localStorage.getItem(KEY) !== "1") {
    window.location.replace("login.html");
    return;
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  document.getElementById("logout").addEventListener("click", function () {
    localStorage.removeItem(KEY);
    localStorage.removeItem("meswedaAccess");
    window.location.replace("login.html");
  });

  const grid = document.getElementById("projects");
  const empty = document.getElementById("empty");
  const search = document.getElementById("search");

  function statusClass(status) {
    const s = (status || "").toLowerCase();
    if (s === "live") return "status-live";
    if (s === "draft") return "status-draft";
    if (s === "archived") return "status-archived";
    return "status-default";
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render(list) {
    grid.innerHTML = "";
    if (!list.length) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    list.forEach(function (p) {
      const a = document.createElement("a");
      a.href = p.url || "#";
      a.className = "project-pill";
      a.innerHTML =
        '<div class="pill-head">' +
          '<span class="pill-category">' + escapeHtml(p.category) + '</span>' +
          '<span class="pill-status ' + statusClass(p.status) + '">' + escapeHtml(p.status) + '</span>' +
        '</div>' +
        '<h3 class="pill-title">' + escapeHtml(p.title) + '</h3>' +
        '<p class="pill-desc">' + escapeHtml(p.description) + '</p>' +
        '<span class="pill-cta">Open project →</span>';
      grid.appendChild(a);
    });
  }

  function filter(q) {
    const s = (q || "").trim().toLowerCase();
    if (!s) return PROJECTS.slice();
    return PROJECTS.filter(function (p) {
      return (
        (p.title || "").toLowerCase().includes(s) ||
        (p.category || "").toLowerCase().includes(s) ||
        (p.status || "").toLowerCase().includes(s) ||
        (p.description || "").toLowerCase().includes(s)
      );
    });
  }

  const list = (typeof PROJECTS !== "undefined" && Array.isArray(PROJECTS)) ? PROJECTS : [];
  if (!list.length) {
    empty.textContent = "No projects yet. Add one in projects.js.";
    empty.hidden = false;
  } else {
    render(list);
  }

  search.addEventListener("input", function (e) {
    render(filter(e.target.value));
  });
})();
