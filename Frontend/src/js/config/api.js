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
    DESTINATIONS: {
        SEARCH: `${API_CONFIG.BASE_URL}/destinations/search`,
        BY_ID:  (id) => `${API_CONFIG.BASE_URL}/destinations/${id}`,
    },
    GUIDELINES: {
        DESTINATIONS: `${API_CONFIG.BASE_URL}/guidelines/destinations`,
        BY_DEST:      (destId) => `${API_CONFIG.BASE_URL}/guidelines/${destId}`,
    },
    FAVORITES: {
        LIST:   `${API_CONFIG.BASE_URL}/favorites`,
        IDS:    `${API_CONFIG.BASE_URL}/favorites/ids`,
        ADD:    (destId) => `${API_CONFIG.BASE_URL}/favorites/${destId}`,
        REMOVE: (destId) => `${API_CONFIG.BASE_URL}/favorites/${destId}`,
    },
    TRIPS: {
        LIST:        `${API_CONFIG.BASE_URL}/trips`,
        CREATE:      `${API_CONFIG.BASE_URL}/trips`,
        COMPLETE:    (tripId)           => `${API_CONFIG.BASE_URL}/trips/${tripId}/complete`,
        DELETE:      (tripId)           => `${API_CONFIG.BASE_URL}/trips/${tripId}`,
        ADD_DEST:    (tripId, destId)   => `${API_CONFIG.BASE_URL}/trips/${tripId}/destinations/${destId}`,
        REMOVE_DEST: (tripId, destId)   => `${API_CONFIG.BASE_URL}/trips/${tripId}/destinations/${destId}`,
    },
    REVIEWS: {
        SUBMIT: `${API_CONFIG.BASE_URL}/reviews`,
        MINE:   `${API_CONFIG.BASE_URL}/reviews/mine`,
    },
};
