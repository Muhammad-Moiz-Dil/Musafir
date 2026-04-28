const API_CONFIG = {
    // Use window.__TRIPIFY_API_URL__ if set (production override),
    // otherwise fall back to localhost for development.
    BASE_URL: (typeof window !== 'undefined' && window.__TRIPIFY_API_URL__)
        ? window.__TRIPIFY_API_URL__
        : 'http://localhost:8080/api',
};

const ENDPOINTS = {
    AUTH: {
        REGISTER:    `${API_CONFIG.BASE_URL}/auth/register`,
        LOGIN:       `${API_CONFIG.BASE_URL}/auth/login`,
        ADMIN_LOGIN: `${API_CONFIG.BASE_URL}/auth/admin/login`,
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
        BY_DESTINATION:    (name) => `${API_CONFIG.BASE_URL}/seasonal-data/${encodeURIComponent(name)}`,
        ADMIN_BY_DEST_ID:  (id)   => `${API_CONFIG.BASE_URL}/seasonal-data/admin/${id}`,
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
    HOTELS: {
        ALL:          `${API_CONFIG.BASE_URL}/hotels`,
        MY:           `${API_CONFIG.BASE_URL}/hotels/my`,
        BY_ID:        (id) => `${API_CONFIG.BASE_URL}/hotels/${id}`,
        ADMIN_ALL:    `${API_CONFIG.BASE_URL}/hotels/admin/all`,
        MANAGERS:     `${API_CONFIG.BASE_URL}/hotels/managers`,
        CREATE:       `${API_CONFIG.BASE_URL}/hotels`,
        UPDATE:       (id) => `${API_CONFIG.BASE_URL}/hotels/${id}`,
        UPLOAD_IMAGE:     (id) => `${API_CONFIG.BASE_URL}/hotels/${id}/image`,
        UPDATE_DESC:      (id) => `${API_CONFIG.BASE_URL}/hotels/${id}/description`,
        UPDATE_AMENITIES: (id) => `${API_CONFIG.BASE_URL}/hotels/${id}/amenities`,
        UPDATE_INFO:      (id) => `${API_CONFIG.BASE_URL}/hotels/${id}/info`,
        SEARCH:           `${API_CONFIG.BASE_URL}/hotels/search`,
    },
    ROOMS: {
        BY_HOTEL: (hotelId) => `${API_CONFIG.BASE_URL}/rooms/hotel/${hotelId}`,
        MY:       `${API_CONFIG.BASE_URL}/rooms/my`,
        ADD:      `${API_CONFIG.BASE_URL}/rooms`,
        UPDATE:   (id) => `${API_CONFIG.BASE_URL}/rooms/${id}`,
        DELETE:   (id) => `${API_CONFIG.BASE_URL}/rooms/${id}`,
    },
    BOOKINGS: {
        CREATE:    `${API_CONFIG.BASE_URL}/bookings`,
        MY:        `${API_CONFIG.BASE_URL}/bookings/my`,
        ALL:       `${API_CONFIG.BASE_URL}/bookings/all`,
        ADMIN_ALL: `${API_CONFIG.BASE_URL}/bookings/admin/all`,
        CONFIRM:   (id) => `${API_CONFIG.BASE_URL}/bookings/${id}/confirm`,
        CANCEL:    (id) => `${API_CONFIG.BASE_URL}/bookings/${id}/cancel`,
    },
    HOTEL_REVIEWS: {
        SUBMIT:   `${API_CONFIG.BASE_URL}/hotel-reviews`,
        BY_HOTEL: (id) => `${API_CONFIG.BASE_URL}/hotel-reviews/hotel/${id}`,
        MINE:     `${API_CONFIG.BASE_URL}/hotel-reviews/mine`,
    },
    ADMIN: {
        STATISTICS: (start, end) =>
            start && end
                ? `${API_CONFIG.BASE_URL}/admin/statistics?startDate=${start}&endDate=${end}`
                : `${API_CONFIG.BASE_URL}/admin/statistics`,
        USERS:    `${API_CONFIG.BASE_URL}/admin/users`,
        LOGS:     (userId, action) => {
            const p = new URLSearchParams();
            if (userId) p.set('userId', userId);
            if (action)  p.set('action',  action);
            const qs = p.toString();
            return qs ? `${API_CONFIG.BASE_URL}/admin/logs?${qs}` : `${API_CONFIG.BASE_URL}/admin/logs`;
        },
        REVIEWS:         `${API_CONFIG.BASE_URL}/admin/reviews`,
        FLAG:            `${API_CONFIG.BASE_URL}/admin/flag`,
        FLAGS:           `${API_CONFIG.BASE_URL}/admin/flags`,
        FLAG_DISMISS:         (id) => `${API_CONFIG.BASE_URL}/admin/flags/${id}/dismiss`,
        FLAG_RESOLVE:         (id) => `${API_CONFIG.BASE_URL}/admin/flags/${id}/resolve`,
        FLAGS_COUNT:          `${API_CONFIG.BASE_URL}/admin/flags/count`,
        REVIEW_DELETE:        (id) => `${API_CONFIG.BASE_URL}/admin/reviews/${id}`,
        HOTEL_REVIEW_DELETE:  (id) => `${API_CONFIG.BASE_URL}/admin/hotel-reviews/${id}`,
    },
};
