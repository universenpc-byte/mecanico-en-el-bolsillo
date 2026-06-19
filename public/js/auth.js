document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form').classList.add('active');
    document.getElementById('auth-error').textContent = '';
  });

  document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-form').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
    document.getElementById('auth-error').textContent = '';
  });

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('auth-error');

    try {
      const res = await fetch(API + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        errEl.textContent = data.error || 'Error al iniciar sesion';
        return;
      }

      setToken(data.token);
      currentUser = data.user;
      showScreen('main');
      updateUserDisplay();
      loadTips();
    } catch (err) {
      errEl.textContent = 'Error de conexion';
    }
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('reg-nombre').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const errEl = document.getElementById('auth-error');

    try {
      const res = await fetch(API + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        errEl.textContent = data.error || 'Error al registrar';
        return;
      }

      setToken(data.token);
      currentUser = data.user;
      showScreen('main');
      updateUserDisplay();
      loadTips();
    } catch (err) {
      errEl.textContent = 'Error de conexion';
    }
  });
});
