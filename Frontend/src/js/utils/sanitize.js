/**
 * sanitize.js — XSS prevention utilities
 *
 * Use escapeHtml() whenever inserting API-sourced text via innerHTML.
 * This converts the five characters that browsers treat as HTML markup
 * into their safe entity equivalents, preventing script injection.
 *
 * Usage:
 *   el.innerHTML = `<p>${escapeHtml(user.comment)}</p>`;
 */

const _escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, c => _escapeMap[c]);
}
