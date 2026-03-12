const API_CONFIG = {
    BASE_URL: 'http://localhost:8080/api',
    TIMEOUT: 10000,
};

const ENDPOINTS = {
    AUTH: {
        REGISTER:    `${API_CONFIG.BASE_URL}/auth/register`,
        LOGIN:       `${API_CONFIG.BASE_URL}/auth/login`,
        ADMIN_LOGIN: `${API_CONFIG.BASE_URL}/auth/admin/login`,
        LOGOUT:      `${API_CONFIG.BASE_URL}/auth/logout`,
    },
    USER: {
        PROFILE:          `${API_CONFIG.BASE_URL}/users/profile`,
        UPLOAD_AVATAR:    `${API_CONFIG.BASE_URL}/users/profile/avatar`,
        CHANGE_PASSWORD:  `${API_CONFIG.BASE_URL}/users/password`,
        PREFERENCES:      `${API_CONFIG.BASE_URL}/users/preferences`,
        DELETE_ACCOUNT:   `${API_CONFIG.BASE_URL}/users/account`,
    },
};
