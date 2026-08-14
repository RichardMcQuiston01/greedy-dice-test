/*
 * Floating donate card. The QR code is generated from DONATE_URL at runtime,
 * so changing the link below is the only edit needed - there is no image to
 * regenerate and no chance of the code and the link disagreeing.
 */
(function () {
    'use strict';

    const DONATE_URL = 'https://donate.stripe.com/00w5kD3Gj1Xo9v7gVOcs800';
    const DISMISS_KEY = 'greedy-dice:donate-dismissed';

    // localStorage throws in some privacy modes; the widget must still work.
    function readDismissed() {
        try {
            return window.localStorage.getItem(DISMISS_KEY) === '1';
        } catch (err) {
            return false;
        }
    }

    function storeDismissed() {
        try {
            window.localStorage.setItem(DISMISS_KEY, '1');
        } catch (err) {
            /* ignore - dismissal just won't persist */
        }
    }

    function initialize() {
        const widget = document.getElementById('donate-widget');
        if (!widget) return;

        const link = widget.querySelector('.donate-link');
        const qrLink = widget.querySelector('.donate-qr');
        if (link) link.href = DONATE_URL;
        if (qrLink) qrLink.href = DONATE_URL;

        if (readDismissed()) {
            widget.remove();
            return;
        }

        if (qrLink && typeof QR !== 'undefined') {
            try {
                qrLink.innerHTML = QR.toSvg(DONATE_URL, { quietZone: 2 });
            } catch (err) {
                // A missing QR shouldn't cost us the link next to it.
                qrLink.remove();
            }
        } else if (qrLink) {
            qrLink.remove();
        }

        const closeBtn = widget.querySelector('.donate-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                widget.remove();
                storeDismissed();
            });
        }

        widget.hidden = false;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
