// بوست Post — public site behaviour: nav scroll, work filter, contact form.

(function () {
  function scrollToId(id) {
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  document.querySelectorAll('[data-scroll-to]').forEach((node) => {
    node.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToId(node.getAttribute('data-scroll-to'));
    });
  });

  // ---- Work filter ----
  const filterBar = document.querySelector('.work__filters');
  const cards = document.querySelectorAll('.work-card');
  if (filterBar) {
    filterBar.querySelectorAll('.tag').forEach((tag) => {
      tag.addEventListener('click', () => {
        filterBar.querySelectorAll('.tag').forEach((t) => t.classList.remove('is-active'));
        tag.classList.add('is-active');
        const cat = tag.getAttribute('data-cat');
        cards.forEach((card) => {
          const show = cat === 'الكل' || card.getAttribute('data-cat') === cat;
          card.style.display = show ? '' : 'none';
        });
      });
    });
  }

  // ---- Contact form ----
  const form = document.getElementById('contact-form');
  if (form) {
    const sentView = document.getElementById('contact-sent');
    const errorView = document.getElementById('contact-error');
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorView.style.display = 'none';
      submitBtn.disabled = true;
      const original = submitBtn.textContent;
      submitBtn.textContent = '...جاري الإرسال';

      const data = Object.fromEntries(new FormData(form).entries());

      try {
        if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL === 'PASTE_URL_HERE') {
          throw new Error('no-endpoint');
        }
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        form.style.display = 'none';
        sentView.style.display = 'flex';
      } catch (err) {
        errorView.textContent = 'تعذر إرسال الرسالة الآن. تأكد من ربط رابط Google Apps Script في assets/js/config.js';
        errorView.style.display = 'block';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = original;
      }
    });

    const resendBtn = document.getElementById('contact-resend');
    if (resendBtn) {
      resendBtn.addEventListener('click', () => {
        sentView.style.display = 'none';
        form.style.display = 'flex';
        form.reset();
      });
    }
  }
})();
