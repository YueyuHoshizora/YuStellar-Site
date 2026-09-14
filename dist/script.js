const menuButton = document.querySelector('.menu-button');
const mobileNav = document.querySelector('.mobile-nav');
const emailButton = document.querySelector('.email-button');

function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', '開啟選單');
  mobileNav.hidden = true;
}

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  menuButton.setAttribute('aria-label', isOpen ? '開啟選單' : '關閉選單');
  mobileNav.hidden = isOpen;
});

mobileNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

emailButton.addEventListener('click', async () => {
  const action = emailButton.querySelector('.email-action');
  try {
    await navigator.clipboard.writeText(emailButton.dataset.email);
    action.textContent = '已複製';
    setTimeout(() => { action.textContent = '複製信箱'; }, 1800);
  } catch {
    window.location.href = `mailto:${emailButton.dataset.email}`;
  }
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
document.querySelector('#year').textContent = new Date().getFullYear();
