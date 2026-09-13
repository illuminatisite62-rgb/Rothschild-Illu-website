/* ==========================================================================
   Archive Sections — Newsletter & interactive behaviour
   ========================================================================== */

(function () {
  'use strict';

  /* ── Newsletter form ─────────────────────────────────────────────────────── */
  const form = document.getElementById('newsletterForm');
  const msgEl = document.getElementById('newsletterMessage');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const nameVal  = (form.querySelector('#nlName')  || {}).value || '';
      const emailVal = (form.querySelector('#nlEmail') || {}).value || '';

      if (!emailVal || !emailVal.includes('@')) {
        showMsg('Please enter a valid email address.', 'error');
        return;
      }

      /* If Supabase is configured, save to contact_messages table.
         Falls back to a thank-you message when not configured. */
      const supaUrl  = typeof SUPABASE_URL  !== 'undefined' ? SUPABASE_URL  : '';
      const supaKey  = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : '';

      if (supaUrl && supaKey && supaUrl !== 'YOUR_SUPABASE_URL') {
        fetch(`${supaUrl}/rest/v1/contact_messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supaKey,
            'Authorization': `Bearer ${supaKey}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            name:    nameVal  || 'Anonymous',
            email:   emailVal,
            subject: 'Newsletter Subscription',
            message: 'Newsletter subscription request.',
          }),
        })
          .then(function (r) {
            if (r.ok || r.status === 201) {
              onSuccess();
            } else {
              showMsg('Something went wrong. Please try again shortly.', 'error');
            }
          })
          .catch(function () {
            showMsg('Something went wrong. Please try again shortly.', 'error');
          });
      } else {
        /* No Supabase — just show the confirmation message */
        onSuccess();
      }
    });
  }

  function onSuccess() {
    if (form) form.style.opacity = '0.35';
    showMsg(
      'Thank you for subscribing. You will receive updates from the Rothschild Archive.',
      'success'
    );
  }

  function showMsg(text, type) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = 'newsletter-message ' + type;
  }

  /* ── Scroll-reveal: fade-up on scroll ───────────────────────────────────── */
  if ('IntersectionObserver' in window) {
    const revealEls = document.querySelectorAll(
      '.about-archive-inner, .tree-gen-0, .tree-gen-1-item, ' +
      '.archive-panel, .research-pillar, .mission-inner, .newsletter-inner'
    );

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealEls.forEach(function (el) {
      el.classList.add('will-reveal');
      observer.observe(el);
    });
  }

})();
