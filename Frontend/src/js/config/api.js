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
        RECOMMENDATIONS:  (limit = 5) => `${API_CONFIG.BASE_URL}/users/recommendations?limit=${limit}`,
        DELETE_ACCOUNT:   `${API_CONFIG.BASE_URL}/users/account`,
    },
    DESTINATIONS: {
        SEARCH: `${API_CONFIG.BASE_URL}/destinations/search`,
        BY_ID:  (id) => `${API_CONFIG.BASE_URL}/destinations/${id}`,
    },
    SOUVENIRS: {
        ALL:            `${API_CONFIG.BASE_URL}/souvenirs`,
        BY_DESTINATION: (id) => `${API_CONFIG.BASE_URL}/souvenirs/${id}`,
    },
    SEASONAL: {
        BY_DESTINATION: (name) => `${API_CONFIG.BASE_URL}/seasonal-data/${encodeURIComponent(name)}`,
    },
};
