// Apply theme immediately to prevent flash
const savedTheme = localStorage.getItem('theme') || 'dark';
if (savedTheme === 'light') {
  document.documentElement.classList.add('light-theme');
}