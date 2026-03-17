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
        STATS:            `${API_CONFIG.BASE_URL}/users/stats`,
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
        SUBMIT:   `${API_CONFIG.BASE_URL}/reviews`,
        MINE:     `${API_CONFIG.BASE_URL}/reviews/mine`,
        BY_DEST:  (id) => `${API_CONFIG.BASE_URL}/reviews/destination/${id}`,
    },
    SOUVENIRS: {
        ALL:            `${API_CONFIG.BASE_URL}/souvenirs`,
        BY_DESTINATION: (id) => `${API_CONFIG.BASE_URL}/souvenirs/${id}`,
    },
    SEASONAL: {
        BY_DESTINATION: (name) => `${API_CONFIG.BASE_URL}/seasonal-data/${encodeURIComponent(name)}`,
    },
    EMERGENCY: {
        BY_DESTINATION: (id) => `${API_CONFIG.BASE_URL}/emergency/${id}`,
        ALL:            `${API_CONFIG.BASE_URL}/emergency`,
    },
    CONFIG: {
        MAPS_KEY: `${API_CONFIG.BASE_URL}/config/maps-key`,
    },
    WEATHER: {
        ALERTS:       `${API_CONFIG.BASE_URL}/weather/alerts`,
        UNREAD_COUNT: `${API_CONFIG.BASE_URL}/weather/unread-count`,
        MARK_READ:    (id) => `${API_CONFIG.BASE_URL}/weather/notifications/${id}/read`,
        MARK_ALL_READ:`${API_CONFIG.BASE_URL}/weather/notifications/read-all`,
        LOOKUP:       (name) => `${API_CONFIG.BASE_URL}/weather/lookup?name=${encodeURIComponent(name)}`,
    },
    NOTIFICATIONS: {
        LIST:         `${API_CONFIG.BASE_URL}/notifications`,
        UNREAD_COUNT: `${API_CONFIG.BASE_URL}/notifications/unread-count`,
        MARK_READ:    (id) => `${API_CONFIG.BASE_URL}/notifications/${id}/read`,
        MARK_ALL_READ:`${API_CONFIG.BASE_URL}/notifications/read-all`,
    },
};
