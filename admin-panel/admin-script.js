// API Configuration
const API_BASE_URL = 'http://localhost:8000/api';
let authToken = localStorage.getItem('adminToken');

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const modalOverlay = document.getElementById('modalOverlay');

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    if (authToken) {
        showDashboard();
        loadDashboardData();
    } else {
        showLogin();
    }
    
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout button
    logoutBtn.addEventListener('click', handleLogout);
    
    // Sidebar navigation
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    // Modal overlay click
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
    
    // Form submissions
    document.getElementById('addServiceForm').addEventListener('submit', handleAddService);
    document.getElementById('addCategoryForm').addEventListener('submit', handleAddCategory);
    document.getElementById('addSupplyKitForm').addEventListener('submit', handleAddSupplyKit);
    document.getElementById('notificationForm').addEventListener('submit', handleSendNotification);
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('adminToken', authToken);
            localStorage.setItem('adminName', data.name || 'Admin User');
            showDashboard();
            loadDashboardData();
            showNotification('Login successful!', 'success');
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
}

function handleLogout() {
    authToken = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminName');
    showLogin();
    showNotification('Logged out successfully', 'success');
}

// Navigation
function handleNavigation(e) {
    e.preventDefault();
    
    const sectionName = e.target.getAttribute('data-section');
    if (!sectionName) return;
    
    // Update active menu item
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Show corresponding section
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) {
        targetSection.classList.add('active');
        document.getElementById('pageTitle').textContent = 
            sectionName.charAt(0).toUpperCase() + sectionName.slice(1).replace('-', ' ');
        
        // Load section data
        loadSectionData(sectionName);
    }
}

// Screen Management
function showLogin() {
    loginScreen.style.display = 'flex';
    dashboard.style.display = 'none';
}

function showDashboard() {
    loginScreen.style.display = 'none';
    dashboard.style.display = 'flex';
    
    const adminName = localStorage.getItem('adminName') || 'Admin User';
    document.getElementById('adminName').textContent = adminName;
}

// Data Loading
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/dashboard`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateDashboardStats(data.stats);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
    
    // Load charts
    loadBookingTrends();
    loadServiceCategoryStats();
    
    // Initialize calendar
    initializeAdminCalendar();
}

function updateDashboardStats(stats) {
    document.getElementById('totalUsers').textContent = stats.total_users || 0;
    document.getElementById('totalVendors').textContent = stats.total_vendors || 0;
    document.getElementById('completedBookings').textContent = stats.completed_bookings || 0;
    document.getElementById('totalRevenue').textContent = `₹${stats.total_revenue || 0}`;
}

async function loadSectionData(section) {
    switch(section) {
        case 'dashboard':
            initializeAdminCalendar();
            break;
        case 'vendors':
            loadVendors();
            break;
        case 'users':
            loadUsers();
            break;
        case 'services':
            loadServices();
            loadServiceCategories();
            break;
        case 'supply-kits':
            loadSupplyKits();
            break;
        case 'contractors':
            loadContractors();
            break;
        case 'employees':
            loadEmployees();
            break;
        case 'payments':
            loadPayments();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'bookings':
            initializeAdminCalendar();
            break;
    }
}

// Calendar Initialization
function initializeAdminCalendar() {
    const calendarContainer = document.getElementById('adminCalendar');
    if (calendarContainer && !window.adminCalendar) {
        window.adminCalendar = new BookingCalendar('adminCalendar', { isAdmin: true });
    }
}

// Vendors Management
async function loadVendors() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/getvendors`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayVendors(data.data);
        }
    } catch (error) {
        console.error('Error loading vendors:', error);
    }
}

function displayVendors(vendors) {
    const tbody = document.querySelector('#vendorsTable tbody');
    tbody.innerHTML = '';
    
    vendors.forEach(vendor => {
        const row = document.createElement('tr');
        const vendorName = vendor.vendorType === 'individual' ? 
            vendor.individual_name : vendor.company_companyName;
        const vendorEmail = vendor.vendorType === 'individual' ? 
            vendor.individual_email : vendor.company_companyEmail;
        const vendorPhone = vendor.vendorType === 'individual' ? 
            vendor.individual_phone : vendor.company_companyPhone;
        
        const statusClass = vendor.is_authenticated === 1 ? 'approved' : 
                           vendor.is_authenticated === 2 ? 'rejected' : 'pending';
        const statusText = vendor.is_authenticated === 1 ? 'Approved' : 
                          vendor.is_authenticated === 2 ? 'Rejected' : 'Pending';
        
        row.innerHTML = `
            <td>${vendor.vendor_id}</td>
            <td>${vendorName || 'N/A'}</td>
            <td>${vendor.vendorType}</td>
            <td>${vendorEmail || 'N/A'}</td>
            <td>${vendorPhone || 'N/A'}</td>
            <td><span class="status-badge status-${statusClass}">${statusText}</span></td>
            <td>
                ${vendor.is_authenticated === 0 ? `
                    <button class="action-btn approve" onclick="approveVendor(${vendor.vendor_id}, 1)">Approve</button>
                    <button class="action-btn reject" onclick="approveVendor(${vendor.vendor_id}, 2)">Reject</button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function approveVendor(vendorId, status) {
    try {
        const response = await fetch(`${API_BASE_URL}/approval/verification/${vendorId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_authenticated: status })
        });
        
        if (response.ok) {
            showNotification(`Vendor ${status === 1 ? 'approved' : 'rejected'} successfully`, 'success');
            loadVendors();
        } else {
            const data = await response.json();
            showNotification(data.error || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Error updating vendor status:', error);
        showNotification('Network error', 'error');
    }
}

// Users Management
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/getusers`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayUsers(data.users);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function displayUsers(users) {
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.user_id}</td>
            <td>${user.firstName} ${user.lastName}</td>
            <td>${user.email}</td>
            <td>${user.phone || 'N/A'}</td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
                <button class="action-btn edit" onclick="editUser(${user.user_id})">Edit</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Services Management
async function loadServices() {
    try {
        const response = await fetch(`${API_BASE_URL}/service/getadminservices`);
        
        if (response.ok) {
            const data = await response.json();
            displayServices(data.services);
        }
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

function displayServices(serviceCategories) {
    const grid = document.getElementById('servicesGrid');
    grid.innerHTML = '';
    
    serviceCategories.forEach(category => {
        category.services.forEach(service => {
            const card = document.createElement('div');
            card.className = 'service-card';
            card.innerHTML = `
                ${service.serviceImage ? `<img src="${service.serviceImage}" alt="${service.title}" class="service-image">` : ''}
                <div class="service-content">
                    <h3>${service.title}</h3>
                    <p>${service.description || 'No description available'}</p>
                    <span class="service-category">${category.categoryName}</span>
                </div>
            `;
            grid.appendChild(card);
        });
    });
}

async function loadServiceCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/service/getservicecategories`);
        
        if (response.ok) {
            const data = await response.json();
            populateCategorySelects(data.categories);
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function populateCategorySelects(categories) {
    const selects = ['categoryName', 'kitCategory'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Select Category</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.serviceCategory;
                option.textContent = category.serviceCategory;
                select.appendChild(option);
            });
        }
    });
}

// Supply Kits Management
async function loadSupplyKits() {
    try {
        const response = await fetch(`${API_BASE_URL}/supplykit/all`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displaySupplyKits(data.supply_kits);
        }
    } catch (error) {
        console.error('Error loading supply kits:', error);
    }
}

function displaySupplyKits(supplyKits) {
    const grid = document.getElementById('supplyKitsGrid');
    grid.innerHTML = '';
    
    supplyKits.forEach(kit => {
        const card = document.createElement('div');
        card.className = 'supply-kit-card';
        card.innerHTML = `
            <div class="kit-header">
                <h3>${kit.kit_name}</h3>
                <span class="kit-price">₹${kit.kit_price}</span>
            </div>
            <p>${kit.kit_description || 'No description'}</p>
            <p><strong>Category:</strong> ${kit.serviceCategory}</p>
            <p><strong>Items:</strong> ${kit.items.length}</p>
            <p><strong>Status:</strong> ${kit.is_active ? 'Active' : 'Inactive'}</p>
        `;
        grid.appendChild(card);
    });
}

// Contractors Management
async function loadContractors() {
    try {
        const response = await fetch(`${API_BASE_URL}/contractor/all`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayContractors(data.contractors);
        }
    } catch (error) {
        console.error('Error loading contractors:', error);
    }
}

function displayContractors(contractors) {
    const tbody = document.querySelector('#contractorsTable tbody');
    tbody.innerHTML = '';
    
    contractors.forEach(contractor => {
        const row = document.createElement('tr');
        const statusClass = contractor.is_verified ? 'approved' : 'pending';
        const statusText = contractor.is_verified ? 'Verified' : 'Pending';
        
        row.innerHTML = `
            <td>${contractor.contractor_id}</td>
            <td>${contractor.company_name}</td>
            <td>${contractor.contact_person}</td>
            <td>${contractor.email}</td>
            <td>${contractor.phone}</td>
            <td><span class="status-badge status-${statusClass}">${statusText}</span></td>
            <td>
                <button class="action-btn edit" onclick="viewContractor(${contractor.contractor_id})">View</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Employees Management
async function loadEmployees() {
    try {
        const response = await fetch(`${API_BASE_URL}/employee/all`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayEmployees(data.employees);
        }
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

function displayEmployees(employees) {
    const tbody = document.querySelector('#employeesTable tbody');
    tbody.innerHTML = '';
    
    employees.forEach(employee => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${employee.employee_id}</td>
            <td>${employee.first_name} ${employee.last_name}</td>
            <td>${employee.email}</td>
            <td>${employee.department}</td>
            <td>${employee.position}</td>
            <td>
                <button class="action-btn edit" onclick="viewEmployee(${employee.employee_id})">View</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Payments Management
async function loadPayments() {
    try {
        const response = await fetch(`${API_BASE_URL}/payment/pending`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayPayments(data.payouts);
        }
    } catch (error) {
        console.error('Error loading payments:', error);
    }
}

function displayPayments(payments) {
    const tbody = document.querySelector('#paymentsTable tbody');
    tbody.innerHTML = '';
    
    payments.forEach(payment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${payment.id}</td>
            <td>${payment.provider_name}</td>
            <td>${payment.payout_type}</td>
            <td>₹${payment.net_amount}</td>
            <td>${payment.serviceName}</td>
            <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
            <td>
                <button class="action-btn approve" onclick="approvePayment(${payment.id}, '${payment.payout_type}')">Approve</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function approvePayment(paymentId, payoutType) {
    try {
        const response = await fetch(`${API_BASE_URL}/payment/approve`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                payment_id: paymentId, 
                payout_type: payoutType 
            })
        });
        
        if (response.ok) {
            showNotification('Payment approved successfully', 'success');
            loadPayments();
        } else {
            const data = await response.json();
            showNotification(data.message || 'Approval failed', 'error');
        }
    } catch (error) {
        console.error('Error approving payment:', error);
        showNotification('Network error', 'error');
    }
}

// Charts and Analytics
async function loadBookingTrends() {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/booking-trends`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            createBookingChart(data.trends);
        }
    } catch (error) {
        console.error('Error loading booking trends:', error);
    }
}

function createBookingChart(trends) {
    const ctx = document.getElementById('bookingChart');
    if (!ctx) return;
    
    new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: trends.map(t => new Date(t.booking_date).toLocaleDateString()),
            datasets: [{
                label: 'Total Bookings',
                data: trends.map(t => t.booking_count),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

async function loadServiceCategoryStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/service-categories`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            createCategoryChart(data.stats);
        }
    } catch (error) {
        console.error('Error loading category stats:', error);
    }
}

function createCategoryChart(stats) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    
    new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: stats.map(s => s.serviceCategory),
            datasets: [{
                data: stats.map(s => s.booking_count),
                backgroundColor: [
                    '#3b82f6',
                    '#60a5fa',
                    '#1e40af',
                    '#1e3a8a',
                    '#dbeafe'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Modal Management
function showModal(modalId) {
    modalOverlay.classList.add('active');
    document.getElementById(modalId).style.display = 'block';
}

function closeModal() {
    modalOverlay.classList.remove('active');
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

function showAddServiceModal() {
    showModal('addServiceModal');
}

function showAddCategoryModal() {
    showModal('addCategoryModal');
}

function showAddSupplyKitModal() {
    showModal('addSupplyKitModal');
}

// Form Handlers
async function handleAddService(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch(`${API_BASE_URL}/service/addservice`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        if (response.ok) {
            showNotification('Service added successfully', 'success');
            closeModal();
            loadServices();
            e.target.reset();
        } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to add service', 'error');
        }
    } catch (error) {
        console.error('Error adding service:', error);
        showNotification('Network error', 'error');
    }
}

async function handleAddCategory(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const categoryData = {
        categoryName: formData.get('categoryName')
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/service/addcategory`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(categoryData)
        });
        
        if (response.ok) {
            showNotification('Category added successfully', 'success');
            closeModal();
            loadServiceCategories();
            e.target.reset();
        } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to add category', 'error');
        }
    } catch (error) {
        console.error('Error adding category:', error);
        showNotification('Network error', 'error');
    }
}

async function handleAddSupplyKit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch(`${API_BASE_URL}/supplykit/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        if (response.ok) {
            showNotification('Supply kit added successfully', 'success');
            closeModal();
            loadSupplyKits();
            e.target.reset();
        } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to add supply kit', 'error');
        }
    } catch (error) {
        console.error('Error adding supply kit:', error);
        showNotification('Network error', 'error');
    }
}

async function handleSendNotification(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const notificationData = {
        user_type: formData.get('userType'),
        title: formData.get('title'),
        body: formData.get('body')
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/notification/send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(notificationData)
        });
        
        if (response.ok) {
            const data = await response.json();
            showNotification(`Notification sent to ${data.success_count} users`, 'success');
            e.target.reset();
        } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to send notification', 'error');
        }
    } catch (error) {
        console.error('Error sending notification:', error);
        showNotification('Network error', 'error');
    }
}

// Utility Functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Refresh Functions
function refreshVendors() {
    loadVendors();
}

function refreshUsers() {
    loadUsers();
}

function refreshServiceTypes() {
    // Load service types for approval
    loadServiceTypes();
}

function refreshPayments() {
    loadPayments();
}

// Additional Functions (placeholders for future implementation)
function editUser(userId) {
    console.log('Edit user:', userId);
    // Implement user editing functionality
}

function viewContractor(contractorId) {
    console.log('View contractor:', contractorId);
    // Implement contractor viewing functionality
}

function viewEmployee(employeeId) {
    console.log('View employee:', employeeId);
    // Implement employee viewing functionality
}

async function loadAnalytics() {
    // Load additional analytics charts
    loadRevenueAnalytics();
    loadVendorPerformance();
}

async function loadRevenueAnalytics() {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/revenue`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            createRevenueChart(data.revenue);
        }
    } catch (error) {
        console.error('Error loading revenue analytics:', error);
    }
}

function createRevenueChart(revenue) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: revenue.map(r => `${r.month}/${r.year}`),
            datasets: [{
                label: 'Revenue',
                data: revenue.map(r => r.gross_revenue),
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

async function loadVendorPerformance() {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/vendor-performance`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            createVendorChart(data.performance);
        }
    } catch (error) {
        console.error('Error loading vendor performance:', error);
    }
}

function createVendorChart(performance) {
    const ctx = document.getElementById('vendorChart');
    if (!ctx) return;
    
    new Chart(ctx.getContext('2d'), {
        type: 'horizontalBar',
        data: {
            labels: performance.slice(0, 10).map(v => v.vendor_name),
            datasets: [{
                label: 'Total Bookings',
                data: performance.slice(0, 10).map(v => v.total_bookings),
                backgroundColor: '#60a5fa'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);