document.getElementById('year').textContent = new Date().getFullYear();

const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
});

const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('in'));
}

// Contact form — stays on page instead of redirecting to Formspree's page
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const form = e.target;
    const statusEl = document.getElementById('contactStatus');
    statusEl.style.color = 'var(--forest)';
    statusEl.textContent = 'Sending...';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      });
      if (response.ok) {
        statusEl.style.color = '#3E7A3E';
        statusEl.textContent = "Message sent — we'll get back to you shortly.";
        form.reset();
      } else {
        throw new Error('Request failed');
      }
    } catch (err) {
      statusEl.style.color = '#B23A2E';
      statusEl.textContent = 'Something went wrong — please email or call us directly instead.';
    }
  });
}
