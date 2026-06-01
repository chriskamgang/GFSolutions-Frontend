import api from './api';

let sessionTimer: ReturnType<typeof setTimeout> | null = null;

export const authService = {
  async login(email: string, password: string, totpCode?: string) {
    const { data } = await api.post('/auth/login', { email, password, totpCode });

    // Si 2FA requis, on retourne sans stocker le token
    if (data.requires2FA) {
      return data;
    }

    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('loginAt', Date.now().toString());
    if (data.expiresIn) {
      localStorage.setItem('sessionExpiresIn', data.expiresIn.toString());
    }

    // Demarrer le timer d'expiration
    this.startSessionTimer();

    return data;
  },

  async logoutServer() {
    try {
      await api.post('/auth/logout');
    } catch { /* silent */ }
  },

  logout() {
    this.stopSessionTimer();
    this.logoutServer();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginAt');
    localStorage.removeItem('sessionExpiresIn');
    window.location.href = '/login';
  },

  startSessionTimer() {
    this.stopSessionTimer();
    const expiresIn = parseInt(localStorage.getItem('sessionExpiresIn') || '0');
    const loginAt = parseInt(localStorage.getItem('loginAt') || '0');
    if (!expiresIn || !loginAt) return;

    const elapsed = Math.floor((Date.now() - loginAt) / 1000);
    const remaining = (expiresIn - elapsed) * 1000;

    if (remaining <= 0) {
      this.logout();
      return;
    }

    // Deconnecter automatiquement a l'expiration
    sessionTimer = setTimeout(() => {
      alert('Votre session a expire. Veuillez vous reconnecter.');
      this.logout();
    }, remaining);
  },

  stopSessionTimer() {
    if (sessionTimer) {
      clearTimeout(sessionTimer);
      sessionTimer = null;
    }
  },

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated() {
    const token = localStorage.getItem('token');
    if (!token) return false;

    // Verifier si le token est expire cote client
    const expiresIn = parseInt(localStorage.getItem('sessionExpiresIn') || '0');
    const loginAt = parseInt(localStorage.getItem('loginAt') || '0');
    if (expiresIn && loginAt) {
      const elapsed = Math.floor((Date.now() - loginAt) / 1000);
      if (elapsed >= expiresIn) {
        this.logout();
        return false;
      }
    }

    return true;
  },

  getRemainingTime(): number {
    const expiresIn = parseInt(localStorage.getItem('sessionExpiresIn') || '0');
    const loginAt = parseInt(localStorage.getItem('loginAt') || '0');
    if (!expiresIn || !loginAt) return 0;
    const elapsed = Math.floor((Date.now() - loginAt) / 1000);
    return Math.max(0, expiresIn - elapsed);
  },

  hasPermission(permission: string) {
    const user = this.getUser();
    return user?.permissions?.includes(permission) || false;
  },
};
