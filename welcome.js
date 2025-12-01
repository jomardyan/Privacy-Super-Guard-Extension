document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('closeBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.close();
        });
    }
});