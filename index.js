document.getElementById('continueBtn').addEventListener('click', function() {
            const lang = document.getElementById('lang-select').value;
            localStorage.setItem('archeryAppLang', lang);
            window.location.href = 'app.html';
        });
