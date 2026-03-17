/**
 * notificationService.js
 * Handles all /api/notifications API calls for UC17 — Send Notification.
 */

const NotificationService = {

    /** Fetch last 20 notifications + unread count for the logged-in user. */
    async getNotifications(token) {
        const res = await fetch(ENDPOINTS.NOTIFICATIONS.LIST, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.status === 401) throw new Error('UNAUTHORIZED');
        if (!res.ok) throw new Error('FETCH_FAILED');
        return res.json(); // { notifications: [...], unreadCount: N }
    },

    /** Fetch only the unread badge count. */
    async getUnreadCount(token) {
        const res = await fetch(ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('FETCH_FAILED');
        const data = await res.json();
        return data.count || 0;
    },

    /** Mark a single notification as read. */
    async markRead(notificationId, token) {
        const res = await fetch(ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId), {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('MARK_FAILED');
        return res.json();
    },

    /** Mark all notifications as read. */
    async markAllRead(token) {
        const res = await fetch(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('MARK_FAILED');
        return res.json();
    },
};
