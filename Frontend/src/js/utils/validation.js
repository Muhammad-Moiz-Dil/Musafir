const Validator = {

    required(value) {
        return value !== null && value !== undefined && String(value).trim().length > 0;
    },

    email(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
    },

    // Only letters, spaces, dots, hyphens, apostrophes — no numbers
    name(value) {
        return /^[a-zA-Z\s.\-']+$/.test(String(value).trim());
    },

    minLength(value, min) {
        return String(value).trim().length >= min;
    },

    maxLength(value, max) {
        return String(value).trim().length <= max;
    },

    // Pakistani phone: 03XX-XXXXXXX or +923XXXXXXXXX
    phone(value) {
        return /^(\+92|0092|0)?3[0-9]{9}$/.test(String(value).replace(/[-\s]/g, ''));
    },

    // Pakistani CNIC: XXXXX-XXXXXXX-X
    cnic(value) {
        return /^\d{5}-\d{7}-\d$/.test(String(value).trim());
    },

    passwordStrength(value) {
        let score = 0;
        const pw = String(value);
        if (pw.length >= 8)  score++;
        if (pw.length >= 12) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;
        // Returns 0-4 (weak → strong)
        if (score <= 1) return { level: 0, label: 'Too weak', color: '#dc2626' };
        if (score === 2) return { level: 1, label: 'Weak',     color: '#f97316' };
        if (score === 3) return { level: 2, label: 'Fair',     color: '#f5a623' };
        if (score === 4) return { level: 3, label: 'Strong',   color: '#16a34a' };
        return             { level: 4, label: 'Very strong', color: '#0f4a28' };
    },

    passwordsMatch(pw1, pw2) {
        return pw1 === pw2;
    },

    // Format CNIC input as user types: XXXXX-XXXXXXX-X
    formatCNIC(value) {
        const digits = value.replace(/\D/g, '').slice(0, 13);
        if (digits.length <= 5)  return digits;
        if (digits.length <= 12) return `${digits.slice(0,5)}-${digits.slice(5)}`;
        return `${digits.slice(0,5)}-${digits.slice(5,12)}-${digits.slice(12)}`;
    },

    // Format phone as user types: 0300-0000000
    formatPhone(value) {
        const digits = value.replace(/\D/g, '').slice(0, 11);
        if (digits.length <= 4) return digits;
        return `${digits.slice(0,4)}-${digits.slice(4)}`;
    },
};
