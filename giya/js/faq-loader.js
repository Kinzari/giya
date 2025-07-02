document.addEventListener('DOMContentLoaded', function() {
    loadFAQs();
});

async function loadFAQs() {
    const faqContainer = document.getElementById('faqAccordion');
    if (!faqContainer) return;

    try {
        faqContainer.innerHTML = '<div class="text-center my-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Loading FAQs...</p></div>';

        // Get base URL
        let baseURL;
        if (typeof API_URL !== 'undefined') {
            baseURL = API_URL;
        } else if (typeof getBaseURL === 'function') {
            baseURL = getBaseURL();
        } else if (sessionStorage.getItem('baseURL')) {
            baseURL = sessionStorage.getItem('baseURL');
        } else {
            baseURL = window.location.origin + '/';
        }

        const response = await fetch(`${baseURL}faq.php?action=get_published_faqs`);

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
            renderFAQs(data.data);
        } else {
            faqContainer.innerHTML = '<div class="alert alert-info">No FAQs available at the moment.</div>';
        }
    } catch (error) {
        faqContainer.innerHTML = `
            <div class="alert alert-danger">
                <h5>Failed to load FAQs</h5>
                <p>There was a problem connecting to the server.</p>
                <button class="btn btn-sm btn-outline-secondary mt-2" onclick="loadFAQs()">Try Again</button>
            </div>
        `;
    }
}

function renderFAQs(faqs) {
    const faqContainer = document.getElementById('faqAccordion');

    // Sort FAQs by display order
    faqs.sort((a, b) => parseInt(a.display_order) - parseInt(b.display_order));

    // Clear loading indicator
    faqContainer.innerHTML = '';

    // Add FAQ items
    faqs.forEach((faq, index) => {
        const accordionItem = document.createElement('div');
        accordionItem.className = 'accordion-item';

        const headerId = `faqHeading${index}`;
        const collapseId = `faqCollapse${index}`;

        accordionItem.innerHTML = `
            <h2 class="accordion-header" id="${headerId}">
                <button class="accordion-button collapsed" type="button"
                        data-bs-toggle="collapse" data-bs-target="#${collapseId}"
                        aria-expanded="false" aria-controls="${collapseId}">
                    ${faq.question}
                </button>
            </h2>
            <div id="${collapseId}" class="accordion-collapse collapse"
                 aria-labelledby="${headerId}" data-bs-parent="#faqAccordion">
                <div class="accordion-body">
                    ${faq.answer}
                </div>
            </div>
        `;

        faqContainer.appendChild(accordionItem);
    });
}
