/**
 * Modal Consistency Helper
 * Ensures uniform styling across admin and user-side post modals
 */

// Status badge styling consistency
function getStatusBadgeClass(status) {
    switch (Number(status)) {
        case 0: return 'bg-danger';      // Pending
        case 1: return 'bg-warning';     // Ongoing
        case 2:
        case 3: return 'bg-success';     // Resolved
        default: return 'bg-secondary';  // Unknown
    }
}

function getStatusText(status) {
    switch (Number(status)) {
        case 0: return 'Pending';
        case 1: return 'Ongoing';
        case 2:
        case 3: return 'Resolved';
        default: return 'Unknown';
    }
}

// Apply consistent badge styling
function applyStatusBadge(badgeElement, status) {
    if (!badgeElement) return;

    // Clear existing classes
    badgeElement.className = 'badge rounded-pill';

    // Add status-specific class
    badgeElement.classList.add(getStatusBadgeClass(status));

    // Set text
    badgeElement.textContent = getStatusText(status);
}

// Format datetime consistently
function formatDateTime(date, time) {
    if (!date || !time) return '';
    return new Date(date + " " + time).toLocaleString();
}

// Enhanced message bubble rendering for consistency
function createMessageBubble(reply, isOriginalPost = false) {
    const bubble = document.createElement('div');

    if (isOriginalPost) {
        bubble.className = 'message-bubble admin-bg original-post';
        bubble.innerHTML = `
            <div class="message-content">
                <div class="mb-2">
                    <span class="badge bg-secondary">${reply.postType_name || ''}</span>
                    ${reply.inquiry_type ? `<span class="badge bg-info ms-1">${reply.inquiry_type}</span>` : ''}
                </div>
                <h5 class="text-primary mb-3">${reply.post_title || ''}</h5>
                <p class="mb-3">${reply.post_message || reply.reply_message || ''}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">${formatDateTime(reply.post_date || reply.reply_date, reply.post_time || reply.reply_time)}</small>
                    <span class="badge ${getStatusBadgeClass(reply.post_status)}">${getStatusText(reply.post_status)}</span>
                </div>
            </div>
        `;
    } else {
        const isAdminMessage = reply.user_type === 'admin';
        bubble.className = `message-bubble ${isAdminMessage ? 'admin-message' : 'user-message'}`;
        bubble.innerHTML = `
            <div class="message-content">
                <strong class="d-block mb-2">${reply.display_name || reply.user_fullname || ''}</strong>
                <p class="mb-2">${reply.reply_message || ''}</p>
                <small class="opacity-75">${formatDateTime(reply.reply_date, reply.reply_time)}</small>
            </div>
        `;
    }

    return bubble;
}

// Initialize modal consistency on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    // Apply consistent styling to any existing modals
    const modals = document.querySelectorAll('#postDetailsModal, #submissionDetailModal');
    modals.forEach(modal => {
        // Add consistent modal classes
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.borderRadius = '1rem';
            modalContent.style.border = 'none';
            modalContent.style.boxShadow = '0 0.5rem 2rem rgba(0, 0, 0, 0.15)';
        }

        // Style the modal header
        const modalHeader = modal.querySelector('.modal-header');
        if (modalHeader) {
            modalHeader.style.backgroundColor = '#ffffff';
            modalHeader.style.borderBottom = '1px solid #e9ecef';
            modalHeader.style.borderRadius = '1rem 1rem 0 0';
            modalHeader.style.padding = '1.5rem';
        }
    });
});

// Export functions for use in other scripts
if (typeof window !== 'undefined') {
    window.ModalConsistency = {
        getStatusBadgeClass,
        getStatusText,
        applyStatusBadge,
        formatDateTime,
        createMessageBubble
    };
}
