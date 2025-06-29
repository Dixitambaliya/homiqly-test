// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('vendorToken');
let vendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');

// Registration state
let currentStep = 1;
let selectedServices = [];
let availableServices = [];

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
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
    document.getElementById('addServiceTypeForm').addEventListener('submit', handleAddServiceType);
    document.getElementById('orderSupplyKitForm').addEventListener('submit', handleOrderSupplyKit);
    
    // Profile image preview
    document.getElementById('profileImageInput').addEventListener('change', previewProfileImage);
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
        const response = await fetch(`${API_BASE_URL}/vendor/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            vendorData = {
                vendor_id: data.vendor_id,
                vendor_type: data.vendor_type,
                name: data.name || 'Vendor User'
            };
            
            localStorage.setItem('vendorToken', authToken);
            localStorage.setItem('vendorData', JSON.stringify(vendorData));
            
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
    vendorData = {};
    localStorage.removeItem('vendorToken');
    localStorage.removeItem('vendorData');
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
    
    const vendorName = vendorData.name || 'Vendor User';
    document.getElementById('vendorName').textContent = vendorName;
}

// Data Loading
async function loadDashboardData() {
    // Load vendor bookings for stats
    try {
        const response = await fetch(`${API_BASE_URL}/booking/vendorbookedservices`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateDashboardStats(data.bookings);
            displayRecentBookings(data.bookings.slice(0, 5));
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
    
    // Load vendor profile
    loadVendorProfile();
}

function updateDashboardStats(bookings) {
    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter(b => b.bookingStatus === 0).length;
    const completedBookings = bookings.filter(b => b.bookingStatus === 1).length;
    
    document.getElementById('totalBookings').textContent = totalBookings;
    document.getElementById('pendingBookings').textContent = pendingBookings;
    document.getElementById('completedBookings').textContent = completedBookings;
    
    // Calculate total earnings (this would need payment data)
    document.getElementById('totalEarnings').textContent = '₹0';
}

function displayRecentBookings(bookings) {
    const container = document.getElementById('recentBookings');
    container.innerHTML = '';
    
    if (bookings.length === 0) {
        container.innerHTML = '<p class="text-center">No recent bookings</p>';
        return;
    }
    
    bookings.forEach(booking => {
        const item = document.createElement('div');
        item.className = 'recent-item';
        
        const statusClass = booking.bookingStatus === 1 ? 'approved' : 
                           booking.bookingStatus === 2 ? 'rejected' : 'pending';
        const statusText = booking.bookingStatus === 1 ? 'Completed' : 
                          booking.bookingStatus === 2 ? 'Cancelled' : 'Pending';
        
        item.innerHTML = `
            <div class="recent-info">
                <h4>${booking.userName}</h4>
                <p>${booking.serviceName} - ${new Date(booking.bookingDate).toLocaleDateString()}</p>
            </div>
            <span class="recent-status status-${statusClass}">${statusText}</span>
        `;
        container.appendChild(item);
    });
}

async function loadSectionData(section) {
    switch(section) {
        case 'calendar':
            initializeVendorCalendar();
            break;
        case 'profile':
            loadVendorProfile();
            break;
        case 'services':
            loadVendorServices();
            break;
        case 'bookings':
            loadVendorBookings();
            break;
        case 'supply-kits':
            loadVendorSupplyKits();
            break;
        case 'payments':
            loadVendorPayments();
            break;
        case 'ratings':
            loadVendorRatings();
            break;
    }
}

// Calendar Initialization
function initializeVendorCalendar() {
    const calendarContainer = document.getElementById('vendorCalendar');
    if (calendarContainer && !window.vendorCalendar) {
        
        window.vendorCalendar = new VendorBookingCalendar('vendorCalendar', vendorData.vendor_type);
    }
}

// Profile Management
async function loadVendorProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/vendor/getprofile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayVendorProfile(data.profile);
        }
    } catch (error) {
        console.error('Error loading vendor profile:', error);
    }
}

function displayVendorProfile(profile) {
    document.getElementById('vendorNameInput').value = profile.name || '';
    document.getElementById('vendorEmailInput').value = profile.email || '';
    document.getElementById('vendorPhoneInput').value = profile.phone || '';
    
    if (profile.profileImage) {
        document.getElementById('profileImagePreview').src = profile.profileImage;
    }
    
    // Show company fields if vendor is a company
    if (profile.vendorType === 'company') {
        document.getElementById('companyFields').style.display = 'block';
        document.getElementById('companyAddressInput').value = profile.companyAddress || '';
    }
}

function enableProfileEdit() {
    const inputs = document.querySelectorAll('#profileForm input, #profileForm textarea');
    inputs.forEach(input => {
        if (input.type !== 'file') {
            input.disabled = false;
        }
    });
    
    document.querySelector('.profile-actions').style.display = 'flex';
    document.querySelector('.section-header button').style.display = 'none';
}

function cancelProfileEdit() {
    const inputs = document.querySelectorAll('#profileForm input, #profileForm textarea');
    inputs.forEach(input => {
        if (input.type !== 'file') {
            input.disabled = true;
        }
    });
    
    document.querySelector('.profile-actions').style.display = 'none';
    document.querySelector('.section-header button').style.display = 'block';
    
    // Reload profile data
    loadVendorProfile();
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch(`${API_BASE_URL}/vendor/updateprofile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        if (response.ok) {
            showNotification('Profile updated successfully', 'success');
            cancelProfileEdit();
        } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Network error', 'error');
    }
}

function previewProfileImage(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profileImagePreview').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Services Management
async function loadVendorServices() {
    try {
        const response = await fetch(`${API_BASE_URL}/vendor/getvendorservice`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayVendorServices(data.services);
        }
    } catch (error) {
        console.error('Error loading vendor services:', error);
    }
}

function displayVendorServices(services) {
    const grid = document.getElementById('vendorServicesGrid');
    grid.innerHTML = '';
    
    if (services.length === 0) {
        grid.innerHTML = '<p class="text-center">No services found. Add your first service type!</p>';
        return;
    }
    
    services.forEach(service => {
        const card = document.createElement('div');
        card.className = 'service-card';
        
        const statusClass = service.is_approved === 1 ? 'approved' : 
                           service.is_approved === 2 ? 'rejected' : 'pending';
        const statusText = service.is_approved === 1 ? 'Approved' : 
                          service.is_approved === 2 ? 'Rejected' : 'Pending';
        
        card.innerHTML = `
            ${service.serviceTypeMedia ? `<img src="${service.serviceTypeMedia}" alt="${service.serviceType}" class="service-image">` : ''}
            <div class="service-content">
                <div class="service-header">
                    <h3 class="service-title">${service.serviceType}</h3>
                    <span class="service-status status-${statusClass}">${statusText}</span>
                </div>
                <span class="service-category">${service.categoryName}</span>
                <p><strong>Service:</strong> ${service.serviceName}</p>
                <p><strong>Location:</strong> ${service.serviceLocation || 'Not specified'}</p>
                
                ${service.packages && service.packages.length > 0 ? `
                    <div class="packages-list">
                        <h4>Packages:</h4>
                        ${service.packages.map(pkg => `
                            <div class="package-item">
                                <div class="package-header">
                                    <span class="package-name">${pkg.title}</span>
                                    <span class="package-price">₹${pkg.price}</span>
                                </div>
                                <p class="package-description">${pkg.description || ''}</p>
                                <p><small>Time: ${pkg.time_required}</small></p>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        grid.appendChild(card);
    });
}

// Bookings Management
async function loadVendorBookings() {
    try {
        const response = await fetch(`${API_BASE_URL}/booking/vendorbookedservices`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayVendorBookings(data.bookings);
        }
    } catch (error) {
        console.error('Error loading vendor bookings:', error);
    }
}

function displayVendorBookings(bookings) {
    const tbody = document.querySelector('#bookingsTable tbody');
    tbody.innerHTML = '';
    
    bookings.forEach(booking => {
        const row = document.createElement('tr');
        
        const statusClass = booking.bookingStatus === 1 ? 'approved' : 
                           booking.bookingStatus === 2 ? 'rejected' : 'pending';
        const statusText = booking.bookingStatus === 1 ? 'Completed' : 
                          booking.bookingStatus === 2 ? 'Cancelled' : 'Pending';
        
        row.innerHTML = `
            <td>${booking.bookingId}</td>
            <td>${booking.userName}</td>
            <td>${booking.serviceName}</td>
            <td>${new Date(booking.bookingDate).toLocaleDateString()} ${booking.bookingTime}</td>
            <td><span class="status-badge status-${statusClass}">${statusText}</span></td>
            <td>
                ${booking.bookingStatus === 0 ? `
                    <button class="action-btn approve" onclick="updateBookingStatus(${booking.bookingId}, 1)">Accept</button>
                    <button class="action-btn reject" onclick="updateBookingStatus(${booking.bookingId}, 2)">Reject</button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function updateBookingStatus(bookingId, status) {
    try {
        const response = await fetch(`${API_BASE_URL}/booking/approveorrejectbooking`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                booking_id: bookingId, 
                status: status 
            })
        });
        
        if (response.ok) {
            showNotification(`Booking ${status === 1 ? 'accepted' : 'rejected'} successfully`, 'success');
            loadVendorBookings();
            // Refresh calendar if it exists
            if (window.vendorCalendar) {
                window.vendorCalendar.loadBookings();
            }
        } else {
            const data = await response.json();
            showNotification(data.message || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Error updating booking status:', error);
        showNotification('Network error', 'error');
    }
}

// Supply Kits Management
async function loadVendorSupplyKits() {
    try {
        const response = await fetch(`${API_BASE_URL}/supplykit/vendor/orders`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayVendorSupplyKits(data.orders);
        }
    } catch (error) {
        console.error('Error loading vendor supply kits:', error);
    }
}

function displayVendorSupplyKits(orders) {
    const grid = document.getElementById('supplyOrdersGrid');
    grid.innerHTML = '';
    
    if (orders.length === 0) {
        grid.innerHTML = '<p class="text-center">No supply kit orders found.</p>';
        return;
    }
    
    orders.forEach(order => {
        const card = document.createElement('div');
        card.className = 'supply-order-card';
        
        card.innerHTML = `
            <div class="order-header">
                <h3>${order.kit_name}</h3>
                <span class="order-status status-${order.order_status}">${order.order_status}</span>
            </div>
            <p>${order.kit_description}</p>
            <p><strong>Quantity:</strong> ${order.quantity_ordered}</p>
            <p><strong>Order Date:</strong> ${new Date(order.order_date).toLocaleDateString()}</p>
            ${order.delivery_date ? `<p><strong>Delivery Date:</strong> ${new Date(order.delivery_date).toLocaleDateString()}</p>` : ''}
            <div class="order-amount">₹${order.total_amount}</div>
        `;
        grid.appendChild(card);
    });
}

// Payments Management
async function loadVendorPayments() {
    try {
        const response = await fetch(`${API_BASE_URL}/payment/vendor/history`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayVendorPayments(data.payments);
        }
    } catch (error) {
        console.error('Error loading vendor payments:', error);
    }
}

function displayVendorPayments(payments) {
    const tbody = document.querySelector('#paymentsTable tbody');
    tbody.innerHTML = '';
    
    payments.forEach(payment => {
        const row = document.createElement('tr');
        
        const statusClass = payment.payment_status === 'completed' ? 'approved' : 'pending';
        
        row.innerHTML = `
            <td>${payment.payment_id}</td>
            <td>${payment.serviceName}</td>
            <td>₹${payment.amount}</td>
            <td>₹${payment.commission_amount}</td>
            <td>₹${payment.net_amount}</td>
            <td><span class="status-badge status-${statusClass}">${payment.payment_status}</span></td>
            <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
        `;
        tbody.appendChild(row);
    });
}

// Ratings Management
async function loadVendorRatings() {
    try {
        const response = await fetch(`${API_BASE_URL}/rating/vendor`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayVendorRatings(data.ratings, data.average_rating, data.total_reviews);
        }
    } catch (error) {
        console.error('Error loading vendor ratings:', error);
    }
}

function displayVendorRatings(ratings, averageRating, totalReviews) {
    // Update average rating
    document.getElementById('averageRating').textContent = averageRating.toFixed(1);
    document.getElementById('totalReviews').textContent = `${totalReviews} reviews`;
    
    // Update stars
    const starsContainer = document.getElementById('averageStars');
    starsContainer.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.className = i <= averageRating ? 'star' : 'star empty';
        star.innerHTML = '★';
        starsContainer.appendChild(star);
    }
    
    // Display reviews
    const reviewsList = document.getElementById('reviewsList');
    reviewsList.innerHTML = '';
    
    ratings.forEach(rating => {
        const card = document.createElement('div');
        card.className = 'review-card';
        
        card.innerHTML = `
            <div class="review-header">
                <span class="review-customer">${rating.customer_name}</span>
                <span class="review-date">${new Date(rating.created_at).toLocaleDateString()}</span>
            </div>
            <div class="review-rating">
                ${Array.from({length: 5}, (_, i) => 
                    `<span class="star ${i < rating.rating ? '' : 'empty'}">★</span>`
                ).join('')}
            </div>
            <p class="review-text">${rating.review || 'No review text provided'}</p>
            <p><small><strong>Service:</strong> ${rating.serviceName}</small></p>
        `;
        reviewsList.appendChild(card);
    });
}

// Registration Process
function showRegisterModal() {
    currentStep = 1;
    showStep(1);
    loadServicesForRegistration();
    showModal('registerModal');
}

function toggleVendorFields() {
    const vendorType = document.getElementById('vendorType').value;
    const individualFields = document.getElementById('individualFields');
    const companyFields = document.getElementById('companyFields');
    
    if (vendorType === 'individual') {
        individualFields.style.display = 'block';
        companyFields.style.display = 'none';
    } else if (vendorType === 'company') {
        individualFields.style.display = 'none';
        companyFields.style.display = 'block';
    } else {
        individualFields.style.display = 'none';
        companyFields.style.display = 'none';
    }
}

function showStep(step) {
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step${step}`).classList.add('active');
    
    // Update buttons
    document.getElementById('prevBtn').style.display = step > 1 ? 'block' : 'none';
    document.getElementById('nextBtn').style.display = step < 3 ? 'block' : 'none';
    document.getElementById('submitBtn').style.display = step === 3 ? 'block' : 'none';
}

function nextStep() {
    if (validateCurrentStep()) {
        currentStep++;
        showStep(currentStep);
    }
}

function previousStep() {
    currentStep--;
    showStep(currentStep);
}

function validateCurrentStep() {
    const currentStepElement = document.getElementById(`step${currentStep}`);
    const requiredFields = currentStepElement.querySelectorAll('[required]');
    
    for (let field of requiredFields) {
        if (!field.value.trim()) {
            showNotification(`Please fill in ${field.previousElementSibling.textContent}`, 'error');
            field.focus();
            return false;
        }
    }
    
    if (currentStep === 2 && selectedServices.length === 0) {
        showNotification('Please select at least one service', 'error');
        return false;
    }
    
    return true;
}

async function loadServicesForRegistration() {
    try {
        const response = await fetch(`${API_BASE_URL}/user/servicesbycategories`);
        
        if (response.ok) {
            const data = await response.json();
            availableServices = data.services;
            displayServicesForSelection(data.services);
        }
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

function displayServicesForSelection(serviceCategories) {
    const container = document.getElementById('servicesList');
    container.innerHTML = '';
    
    serviceCategories.forEach(category => {
        if (category.services && category.services.length > 0) {
            const categoryGroup = document.createElement('div');
            categoryGroup.className = 'service-category-group';
            
            categoryGroup.innerHTML = `
                <div class="category-title">${category.categoryName}</div>
                ${category.services.map(service => `
                    <div class="service-checkbox">
                        <input type="checkbox" id="service_${service.serviceId}" 
                               value="${service.serviceId}" 
                               data-category="${category.serviceCategoryId}"
                               onchange="toggleServiceSelection(this)">
                        <label for="service_${service.serviceId}">${service.title}</label>
                    </div>
                    <div class="service-location" id="location_${service.serviceId}" style="display: none;">
                        <input type="text" placeholder="Service location" 
                               id="location_input_${service.serviceId}">
                    </div>
                `).join('')}
            `;
            container.appendChild(categoryGroup);
        }
    });
}

function toggleServiceSelection(checkbox) {
    const serviceId = parseInt(checkbox.value);
    const categoryId = parseInt(checkbox.dataset.category);
    const locationDiv = document.getElementById(`location_${serviceId}`);
    
    if (checkbox.checked) {
        locationDiv.style.display = 'block';
        selectedServices.push({
            serviceId: serviceId,
            serviceCategoryId: categoryId,
            serviceLocation: ''
        });
    } else {
        locationDiv.style.display = 'none';
        selectedServices = selectedServices.filter(s => s.serviceId !== serviceId);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    if (!validateCurrentStep()) return;
    
    // Collect service locations
    selectedServices.forEach(service => {
        const locationInput = document.getElementById(`location_input_${service.serviceId}`);
        service.serviceLocation = locationInput ? locationInput.value : '';
    });
    
    const formData = new FormData(e.target);
    formData.append('services', JSON.stringify(selectedServices));
    
    try {
        const response = await fetch(`${API_BASE_URL}/vendor/register`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            showNotification('Registration successful! Please wait for admin approval.', 'success');
            closeModal();
            e.target.reset();
            selectedServices = [];
        } else {
            const data = await response.json();
            showNotification(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Network error', 'error');
    }
}

// Service Type Management
async function handleAddServiceType(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    // Collect packages data
    const packages = [];
    const packageInputs = document.querySelectorAll('#packagesContainer .package-item');
    
    packageInputs.forEach((item, index) => {
        const packageName = item.querySelector(`input[name="packages[${index}][package_name]"]`).value;
        const description = item.querySelector(`input[name="packages[${index}][description]"]`).value;
        const totalPrice = item.querySelector(`input[name="packages[${index}][total_price]"]`).value;
        const totalTime = item.querySelector(`input[name="packages[${index}][total_time]"]`).value;
        
        if (packageName && totalPrice && totalTime) {
            packages.push({
                package_name: packageName,
                description: description,
                total_price: parseFloat(totalPrice),
                total_time: totalTime
            });
        }
    });
    
    formData.append('packages', JSON.stringify(packages));
    
    try {
        const response = await fetch(`${API_BASE_URL}/vendor/applyservicetype`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        if (response.ok) {
            showNotification('Service type submitted for approval', 'success');
            closeModal();
            loadVendorServices();
            e.target.reset();
        } else {
            const data = await response.json();
            showNotification(data.details || 'Failed to add service type', 'error');
        }
    } catch (error) {
        console.error('Error adding service type:', error);
        showNotification('Network error', 'error');
    }
}

function addPackage() {
    const container = document.getElementById('packagesContainer');
    const packageCount = container.children.length;
    
    const packageItem = document.createElement('div');
    packageItem.className = 'package-item';
    packageItem.innerHTML = `
        <input type="text" placeholder="Package Name" name="packages[${packageCount}][package_name]" required>
        <input type="text" placeholder="Description" name="packages[${packageCount}][description]">
        <input type="number" placeholder="Price" name="packages[${packageCount}][total_price]" step="0.01" required>
        <input type="text" placeholder="Time Required" name="packages[${packageCount}][total_time]" required>
        <button type="button" class="btn-secondary" onclick="removePackage(this)">Remove</button>
    `;
    container.appendChild(packageItem);
}

function removePackage(button) {
    button.parentElement.remove();
}

// Supply Kit Ordering
function showOrderSupplyKitModal() {
    loadAvailableSupplyKits();
    showModal('orderSupplyKitModal');
}

async function loadAvailableSupplyKits() {
    try {
        const response = await fetch(`${API_BASE_URL}/supplykit/all`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            populateSupplyKitSelect(data.supply_kits);
        }
    } catch (error) {
        console.error('Error loading supply kits:', error);
    }
}

function populateSupplyKitSelect(supplyKits) {
    const select = document.getElementById('kitSelect');
    select.innerHTML = '<option value="">Select Supply Kit</option>';
    
    supplyKits.forEach(kit => {
        const option = document.createElement('option');
        option.value = kit.kit_id;
        option.textContent = `${kit.kit_name} - ₹${kit.kit_price}`;
        option.dataset.price = kit.kit_price;
        option.dataset.description = kit.kit_description;
        select.appendChild(option);
    });
}

function updateKitDetails() {
    const select = document.getElementById('kitSelect');
    const selectedOption = select.options[select.selectedIndex];
    const detailsDiv = document.getElementById('kitDetails');
    
    if (selectedOption.value) {
        detailsDiv.innerHTML = `
            <h4>${selectedOption.textContent.split(' - ')[0]}</h4>
            <p>${selectedOption.dataset.description || 'No description available'}</p>
            <p class="kit-price">Price: ₹${selectedOption.dataset.price}</p>
        `;
        calculateTotal();
    } else {
        detailsDiv.innerHTML = '';
        document.getElementById('totalAmount').textContent = '0';
    }
}

function calculateTotal() {
    const select = document.getElementById('kitSelect');
    const quantity = parseInt(document.getElementById('kitQuantity').value) || 0;
    const selectedOption = select.options[select.selectedIndex];
    
    if (selectedOption.value) {
        const price = parseFloat(selectedOption.dataset.price);
        const total = price * quantity;
        document.getElementById('totalAmount').textContent = total.toFixed(2);
    }
}

async function handleOrderSupplyKit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const orderData = {
        kit_id: parseInt(formData.get('kit_id')),
        quantity_ordered: parseInt(formData.get('quantity_ordered'))
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/supplykit/order`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        if (response.ok) {
            const data = await response.json();
            showNotification(`Supply kit ordered successfully. Total: ₹${data.total_amount}`, 'success');
            closeModal();
            loadVendorSupplyKits();
            e.target.reset();
        } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to order supply kit', 'error');
        }
    } catch (error) {
        console.error('Error ordering supply kit:', error);
        showNotification('Network error', 'error');
    }
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

function showAddServiceTypeModal() {
    loadVendorRegisteredServices();
    showModal('addServiceTypeModal');
}

async function loadVendorRegisteredServices() {
    try {
        const response = await fetch(`${API_BASE_URL}/vendor/vendorservice`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            populateServiceSelect(data.services);
        }
    } catch (error) {
        console.error('Error loading vendor services:', error);
    }
}

function populateServiceSelect(services) {
    const select = document.getElementById('serviceSelect');
    select.innerHTML = '<option value="">Select Service</option>';
    
    services.forEach(service => {
        const option = document.createElement('option');
        option.value = service.service_id;
        option.textContent = service.serviceName;
        select.appendChild(option);
    });
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
function refreshBookings() {
    loadVendorBookings();
    if (window.vendorCalendar) {
        window.vendorCalendar.loadBookings();
    }
}

function refreshPayments() {
    loadVendorPayments();
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
    
    /* Vendor Stats Grid */
    .vendor-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
    }
    
    .vendor-stat-card {
        background: var(--surface);
        padding: 1rem;
        border-radius: 8px;
        box-shadow: var(--shadow);
        display: flex;
        align-items: center;
        gap: 1rem;
        transition: transform 0.3s ease;
    }
    
    .vendor-stat-card:hover {
        transform: translateY(-2px);
    }
    
    .vendor-stat-card.company-stat {
        border-left: 4px solid var(--primary-light);
    }
    
    .vendor-actions {
        display: flex;
        gap: 0.5rem;
    }
    
    .vendor-actions .btn-secondary {
        padding: 0.5rem 1rem;
        font-size: 0.9rem;
        width: auto;
    }
`;
document.head.appendChild(style);