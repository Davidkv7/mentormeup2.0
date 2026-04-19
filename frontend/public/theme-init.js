(function () {
  try {
    var theme = localStorage.getItem('mentormeup-theme') || 'dark';
    document.documentElement.classList.add(theme);
    document.documentElement.style.backgroundColor = theme === 'light' ? '#F8F9FA' : '#080B14';
  } catch (e) {}
})();
