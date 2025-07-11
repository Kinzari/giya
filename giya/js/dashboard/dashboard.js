const dashboardState = {
    startDate: moment().subtract(30, 'days').format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD'),
    departmentId: '',
    campusId: '',
    postType: '',
    status: '',
    charts: {
        postTypes: null,
        status: null
    }
};


document.addEventListener('DOMContentLoaded', function() {

    setupApiEndpoint();


    initDateFields();

    // Load departments for filter dropdown
    loadDepartments();

    // Load campuses for filter dropdown
    loadCampuses();


    initDashboard();


    setupFilterHandlers();


    checkPOCStatus();
});

function setupApiEndpoint() {
    if (!GiyaSession.get(GIYA_SESSION_KEYS.BASE_URL) && typeof getBaseURL !== 'function') {
        toastr.warning('API URL not found. You may need to login again.');
    }
}

/**
 * Initialize the date input fields
 */
function initDateFields() {
    // Set default values (30 days ago to today)
    document.getElementById('start-date').value = dashboardState.startDate;
    document.getElementById('end-date').value = dashboardState.endDate;
}

/**
 * Helper function to make API calls with consistent configuration
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Additional options for axios
 * @returns {Promise} - Axios promise
 */
async function apiCall(endpoint, options = {}) {
    // Use centralized base URL management
    const baseURL = GiyaSession.get(GIYA_SESSION_KEYS.BASE_URL);

    if (!baseURL) {
        toastr.error('API URL not found. Please login again.');
        throw new Error('Base URL not found');
    }

    const url = `${baseURL}${endpoint}`;

    // Default params
    const params = options.params || {};

    // Add cache busting parameter
    params._t = new Date().getTime();

    // Default config with centralized headers
    const config = {
        params,
        headers: {
            ...GiyaUtils.getApiHeaders(),
            ...(options.headers || {})
        }
    };

    return axios.get(url, config);
}

/**
 * Load departments for the filter dropdown
 */
async function loadDepartments() {
    try {
        const response = await apiCall('masterfile.php', {
            params: { action: 'departments' }
        });

        if (response.data && response.data.success && Array.isArray(response.data.data)) {
            const departmentSelect = document.getElementById('department-filter');

            // Clear existing options except the first one
            const defaultOption = departmentSelect.options[0];
            departmentSelect.innerHTML = '';
            departmentSelect.appendChild(defaultOption);

            // Add department options
            response.data.data.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.department_id;
                option.textContent = dept.department_name;
                departmentSelect.appendChild(option);
            });

            // For POC users, automatically select their department
            const userData = GiyaSession.getUserData();
            if (userData.user_id && userData.user_typeId == 5 && userData.user_departmentId) {
                departmentSelect.value = userData.user_departmentId;
                dashboardState.departmentId = userData.user_departmentId;

                // Disable changing department for POC users
                departmentSelect.disabled = true;

                // Add visual indicator
                const departmentContainer = document.getElementById('department-filter-container');
                if (departmentContainer) {
                    departmentContainer.classList.add('poc-locked');
                    const lockIcon = document.createElement('div');
                    lockIcon.className = 'poc-lock-icon';
                    lockIcon.innerHTML = '<i class="bi bi-lock-fill text-secondary ms-2"></i>';
                    departmentSelect.parentNode.appendChild(lockIcon);
                }
            }
        } else {
            console.error('Failed to load departments');
            toastr.error('Failed to load departments. Please check server response.');
        }
    } catch (error) {
        console.error('Failed to load departments');
        toastr.error('Failed to connect to server. Please check your connection.');
    }
}

/**
 * Load campuses for the filter dropdown
 */
async function loadCampuses() {
    try {
        const response = await apiCall('masterfile.php', {
            params: { action: 'campuses' }
        });

        if (response.data && response.data.success && Array.isArray(response.data.data)) {
            const campusSelect = document.getElementById('campus-filter');

            // Clear existing options except the first one
            const defaultOption = campusSelect.options[0];
            campusSelect.innerHTML = '';
            campusSelect.appendChild(defaultOption);

            // Add campus options
            response.data.data.forEach(campus => {
                const option = document.createElement('option');
                option.value = campus.campus_id;
                option.textContent = campus.campus_name;
                campusSelect.appendChild(option);
            });
        } else {
            console.error('Failed to load campuses');
            toastr.error('Failed to load campuses. Please check server response.');
        }
    } catch (error) {
        console.error('Failed to load campuses');
        toastr.error('Failed to connect to server. Please check your connection.');
    }
}

/**
 * Initialize dashboard with data and charts
 */
function initDashboard() {
    fetchDashboardData();
    initCharts();
}

/**
 * Fetch dashboard statistics and update the UI
 */
async function fetchDashboardData() {
    try {
        // Show loading indicators
        setLoadingState(true);

        const params = {
            action: 'get_stats',
            start_date: dashboardState.startDate,
            end_date: dashboardState.endDate,
            department_id: dashboardState.departmentId,
            campus_id: dashboardState.campusId,
            post_type: dashboardState.postType,
            status: dashboardState.status
        };

        const response = await apiCall('dashboard.php', { params });

        if (response.data && response.data.success) {
            updateDashboardStats(response.data);
            updateCharts(response.data);
        } else {
            console.error('Failed to load dashboard data');
            toastr.error(response.data?.message || 'Failed to load dashboard data');
        }
    } catch (error) {
        console.error('Error fetching dashboard data', error);
        toastr.error('Failed to load dashboard statistics. Server might be unavailable.');
    } finally {
        setLoadingState(false);
    }
}

/**
 * Update the dashboard statistics with fetched data
 */
function updateDashboardStats(data) {
    // Update post type counts
    document.getElementById('total-posts-count').textContent = data.total || 0;
    document.getElementById('inquiry-count').textContent = data.post_types?.inquiry || 0;
    document.getElementById('feedback-count').textContent = data.post_types?.feedback || 0;
    document.getElementById('suggestion-count').textContent = data.post_types?.suggestion || 0;

    // Update status counts
    document.getElementById('pending-count').textContent = data.status?.pending || 0;
    document.getElementById('ongoing-count').textContent = data.status?.ongoing || 0;
    document.getElementById('resolved-count').textContent = data.status?.resolved || 0;

    // Update detailed status breakdown
    if (data.detailed_status) {
        // Pending breakdown
        document.getElementById('pending-inquiry-count').textContent = data.detailed_status.pending?.inquiry || 0;
        document.getElementById('pending-feedback-count').textContent = data.detailed_status.pending?.feedback || 0;
        document.getElementById('pending-suggestion-count').textContent = data.detailed_status.pending?.suggestion || 0;

        // Ongoing breakdown
        document.getElementById('ongoing-inquiry-count').textContent = data.detailed_status.ongoing?.inquiry || 0;
        document.getElementById('ongoing-feedback-count').textContent = data.detailed_status.ongoing?.feedback || 0;
        document.getElementById('ongoing-suggestion-count').textContent = data.detailed_status.ongoing?.suggestion || 0;

        // Resolved breakdown
        document.getElementById('resolved-inquiry-count').textContent = data.detailed_status.resolved?.inquiry || 0;
        document.getElementById('resolved-feedback-count').textContent = data.detailed_status.resolved?.feedback || 0;
        document.getElementById('resolved-suggestion-count').textContent = data.detailed_status.resolved?.suggestion || 0;
    }

    // If department is selected, update the department indicator
    if (data.department) {
        document.getElementById('department-indicator').classList.remove('d-none');
        document.getElementById('department-name').textContent = data.department;
    } else {
        document.getElementById('department-indicator').classList.add('d-none');
    }

    // Optional: Add a campus indicator if needed
    if (data.campus && document.getElementById('campus-indicator')) {
        document.getElementById('campus-indicator').classList.remove('d-none');
        document.getElementById('campus-name').textContent = data.campus;
    } else if (document.getElementById('campus-indicator')) {
        document.getElementById('campus-indicator').classList.add('d-none');
    }
}

/**
 * Initialize charts for post types and status distribution
 */
function initCharts() {
    // Post Types Chart
    const postTypesCtx = document.getElementById('post-types-chart').getContext('2d');
    dashboardState.charts.postTypes = new Chart(postTypesCtx, {
        type: 'doughnut',
        data: {
            labels: ['Inquiry', 'Feedback', 'Suggestion'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#0dcaf0', '#a9a9a9', '#20c997'],
                hoverBackgroundColor: ['#0aa5c5', '#928e85', '#18a87d']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    display: false // Hide default legend, we'll use our custom one
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Status Chart
    const statusCtx = document.getElementById('status-chart').getContext('2d');
    dashboardState.charts.status = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Ongoing', 'Resolved'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: ['#dc3545', '#ffc107', '#198754'],
                hoverBackgroundColor: ['#bb2d3b', '#e5ac00', '#157347']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    display: false // Hide default legend, we'll use our custom one
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Feedback Chart with default Bootstrap colors
    const feedbackCtx = document.getElementById('feedback-chart')?.getContext('2d');
    if (feedbackCtx) {
        const feedbackChart = new Chart(feedbackCtx, {
            type: 'doughnut',
            data: {
                labels: ['Positive', 'Neutral', 'Negative'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [
                        'rgba(108, 117, 125, 0.8)',  // Bootstrap secondary
                        'rgba(108, 117, 125, 0.5)',  // Lighter secondary
                        'rgba(108, 117, 125, 0.3)'   // Lightest secondary
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        dashboardState.charts.feedback = feedbackChart;
    }
}

/**
 * Update charts with new data
 */
function updateCharts(data) {
    // Update post types chart
    if (dashboardState.charts.postTypes) {
        const postTypeValues = [
            data.post_types?.inquiry || 0,
            data.post_types?.feedback || 0,
            data.post_types?.suggestion || 0
        ];

        dashboardState.charts.postTypes.data.datasets[0].data = postTypeValues;
        dashboardState.charts.postTypes.update();

        // Update legend manually after chart is updated
        updateChartLegend('post-types-chart',
            ['Inquiry', 'Feedback', 'Suggestion'],
            postTypeValues);
    }

    // Update status chart
    if (dashboardState.charts.status) {
        const statusValues = [
            data.status?.pending || 0,
            data.status?.ongoing || 0,
            data.status?.resolved || 0
        ];

        dashboardState.charts.status.data.datasets[0].data = statusValues;
        dashboardState.charts.status.update();

        // Update legend manually after chart is updated
        updateChartLegend('status-chart',
            ['Pending', 'Ongoing', 'Resolved'],
            statusValues);
    }
}

/**
 * Helper function to update chart legends with values and percentages
 * @param {string} chartId - The ID of the chart canvas element
 * @param {Array} labels - Array of labels
 * @param {Array} values - Array of corresponding values
 */
function updateChartLegend(chartId, labels, values) {
    const chartContainer = document.getElementById(chartId).parentNode;
    let legendContainer = chartContainer.querySelector('.chartjs-legend');

    // If legend container doesn't exist, create it
    if (!legendContainer) {
        const newLegendContainer = document.createElement('div');
        newLegendContainer.className = 'chartjs-legend mt-3 pt-2 border-top';
        chartContainer.appendChild(newLegendContainer);
        legendContainer = newLegendContainer;
    }

    // Create legend items
    const total = values.reduce((a, b) => a + b, 0);
    let legendHTML = '<ul class="d-flex flex-wrap justify-content-center list-unstyled mb-0">';

    labels.forEach((label, i) => {
        const percentage = total > 0 ? Math.round((values[i] / total) * 100) : 0;
        const chart = Chart.getChart(chartId);
        const bgColor = chart.data.datasets[0].backgroundColor[i];

        legendHTML += `
            <li class="mx-3 mb-1 text-center">
                <span class="d-inline-block me-2" style="width:12px;height:12px;background-color:${bgColor};border-radius:50%"></span>
                <span>${label}: <strong>${values[i]}</strong> (${percentage}%)</span>
            </li>
        `;
    });

    legendHTML += '</ul>';
    legendContainer.innerHTML = legendHTML;
}

/**
 * Set up event listeners for filter controls
 */
function setupFilterHandlers() {
    // Remove form submission handler, since we're going to update in real-time
    $('#dashboard-filters').off('submit');

    // Add debounce to avoid too many API calls when changing date inputs
    let dateUpdateTimeout;
    $('#start-date, #end-date').on('change', function() {
        clearTimeout(dateUpdateTimeout);
        dateUpdateTimeout = setTimeout(function() {
            dashboardState.startDate = $('#start-date').val();
            dashboardState.endDate = $('#end-date').val();
            fetchDashboardData(); // Update dashboard immediately when dates change
        }, 300); // 300ms debounce
    });

    // Real-time update for dropdown filters
    $('#department-filter, #campus-filter, #post-type-filter, #status-filter').on('change', function() {
        // Update state
        dashboardState.departmentId = $('#department-filter').val();
        dashboardState.campusId = $('#campus-filter').val();
        dashboardState.postType = $('#post-type-filter').val();
        dashboardState.status = $('#status-filter').val();

        // Update dashboard immediately
        fetchDashboardData();
    });
}

/**
 * Check if the user is a POC and apply restrictions
 */
function checkPOCStatus() {
    const userData = GiyaSession.getUserData();
    if (userData.user_id && userData.user_typeId == 5 && userData.user_departmentId) {
        // Apply POC restrictions
        dashboardState.departmentId = userData.user_departmentId;
        $('#department-filter').val(userData.user_departmentId).prop('disabled', true);
        $('#department-filter-container').addClass('poc-locked');
        $('#department-filter-container').append('<div class="poc-lock-icon"><i class="bi bi-lock-fill text-secondary ms-2"></i></div>');
        // Removed: loadCoursesByDepartment(userData.user_departmentId);
    }
}

/**
 * Set loading state for the dashboard
 */
function setLoadingState(isLoading) {
    // Set cursor state
    document.body.style.cursor = isLoading ? 'wait' : 'default';

    // Set filters to disabled state during loading
    const filterElements = $('#dashboard-filters select, #dashboard-filters input');
    if (isLoading) {
        filterElements.prop('disabled', true);
    } else {
        filterElements.prop('disabled', false);

        // Re-disable department filter for POC users if needed
        const userData = GiyaSession.getUserData();
        if (userData.user_id && userData.user_typeId == 5 && userData.user_departmentId) {
            $('#department-filter').prop('disabled', true);
        }
    }
}
