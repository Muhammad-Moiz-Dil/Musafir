const AuthService = {

    async register(payload) {
        const res = await fetch(ENDPOINTS.AUTH.REGISTER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
            // Backend sends { message: "...", errors: {...} }
            throw { status: res.status, ...data };
        }

        return data; // { message, user: { id, email, fullName, userType } }
    },

    async login(email, password) {
        const res = await fetch(ENDPOINTS.AUTH.LOGIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) throw { status: res.status, ...data };

        localStorage.setItem('tripify_token', data.token);
        localStorage.setItem('tripify_user', JSON.stringify(data.user));
        return data;
    },

    async adminLogin(email, password) {
        const res = await fetch(ENDPOINTS.AUTH.ADMIN_LOGIN, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) throw { status: res.status, ...data };

        localStorage.setItem('tripify_token', data.token);
        localStorage.setItem('tripify_user', JSON.stringify(data.user));
        return data;
    },

    logout() {
        localStorage.removeItem('tripify_token');
        localStorage.removeItem('tripify_user');
        window.location.href = '/src/html/pages/auth/login.html';
    },

    getToken() {
        return localStorage.getItem('tripify_token');
    },

    getCurrentUser() {
        const raw = localStorage.getItem('tripify_user');
        return raw ? JSON.parse(raw) : null;
    },

    isLoggedIn() {
        return !!this.getToken();
    },
};
