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

        sessionStorage.setItem('tripify_token', data.token);
        sessionStorage.setItem('tripify_user', JSON.stringify(data.user));
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

        sessionStorage.setItem('tripify_token', data.token);
        sessionStorage.setItem('tripify_user', JSON.stringify(data.user));
        return data;
    },

    logout() {
        sessionStorage.removeItem('tripify_token');
        sessionStorage.removeItem('tripify_user');
        sessionStorage.removeItem('tripify_wishlist');
        window.location.replace('../../../../index.html');
    },

    getToken() {
        return sessionStorage.getItem('tripify_token');
    },

    getCurrentUser() {
        const raw = sessionStorage.getItem('tripify_user');
        return raw ? JSON.parse(raw) : null;
    },

    isLoggedIn() {
        return !!this.getToken();
    },
};

// Redirect to landing page if back-navigation brings up a protected page without a token
window.addEventListener('pageshow', function (e) {
    if (e.persisted && !sessionStorage.getItem('tripify_token')) {
        const path = window.location.pathname;
        const isPublic = path.includes('/auth/') || path.endsWith('index.html') || path.endsWith('/');
        if (!isPublic) {
            window.location.replace('../../../../index.html');
        }
    }
});
