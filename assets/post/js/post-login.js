// بوست Post — access code gate for team.html

(function () {
  const CODES = {
    'POST-MGMT-2026':    { role: 'management', section: 'founder', label: 'الإدارة' },
    'POST-TEAM-2026':    { role: 'staff',      section: 'todos',   label: 'الفريق' },
    'POST-PARTNER-2026': { role: 'staff',      section: 'clients', label: 'الشركاء' },
  };

  const form = document.getElementById('login-form');
  const input = document.getElementById('access-code');
  const errorView = document.getElementById('login-error');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = input.value.trim().toUpperCase();
    const match = CODES[code];
    if (!match) {
      errorView.textContent = 'رمز الدخول غير صحيح. حاول مرة أخرى.';
      errorView.style.display = 'block';
      return;
    }
    sessionStorage.setItem('post_auth', JSON.stringify({ ...match, code }));
    window.location.href = 'post-team.html';
  });
})();
