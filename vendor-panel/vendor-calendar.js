// Vendor-specific calendar functionality
class VendorBookingCalendar extends BookingCalendar {
    constructor(containerId, vendorType) {
        super(containerId, { isAdmin: false });
        this.vendorType = vendorType; // 'individual' or 'company'
        this.vendorStats = {};
        this.init();
    }

    async loadBookings() {
        try {
            const response = await fetch(`${API_BASE_URL}/booking/vendorbookedservices`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.bookings = data.bookings || [];
                this.calculateStats();
                this.render();
            }
        } catch (error) {
            console.error('Error loading vendor bookings:', error);
        }
    }

    calculateStats() {
        const today = new Date();
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

        this.vendorStats = {
            totalBookings: this.bookings.length,
            pendingBookings: this.bookings.filter(b => b.bookingStatus === 0).length,
            approvedBookings: this.bookings.filter(b => b.bookingStatus === 1).length,
            cancelledBookings: this.bookings.filter(b => b.bookingStatus === 2).length,
            todayBookings: this.bookings.filter(b => 
                new Date(b.bookingDate).toDateString() === today.toDateString()
            ).length,
            thisMonthBookings: this.bookings.filter(b => {
                const bookingDate = new Date(b.bookingDate);
                return bookingDate >= thisMonth && bookingDate < nextMonth;
            }).length,
            upcomingBookings: this.bookings.filter(b => {
                const bookingDate = new Date(b.bookingDate);
                return bookingDate > today && b.bookingStatus === 1;
            }).length
        };
    }

    render() {
        if (!this.container) {
            console.error('Calendar container not found');
            return;
        }
        
        this.container.innerHTML = `
            ${this.renderVendorStats()}
            <div class="calendar-header">
                <div class="calendar-nav">
                    <button class="nav-btn" onclick="vendorCalendar.previousPeriod()">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <h3 class="calendar-title">${this.getTitle()}</h3>
                    <button class="nav-btn" onclick="vendorCalendar.nextPeriod()">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="calendar-controls">
                    <div class="view-switcher">
                        <button class="view-btn ${this.viewMode === 'month' ? 'active' : ''}" 
                                onclick="vendorCalendar.setViewMode('month')">Month</button>
                        <button class="view-btn ${this.viewMode === 'week' ? 'active' : ''}" 
                                onclick="vendorCalendar.setViewMode('week')">Week</button>
                        <button class="view-btn ${this.viewMode === 'day' ? 'active' : ''}" 
                                onclick="vendorCalendar.setViewMode('day')">Day</button>
                    </div>
                    <button class="btn-primary" onclick="vendorCalendar.goToToday()">Today</button>
                    ${this.renderVendorActions()}
                </div>
            </div>
            <div class="calendar-content">
                ${this.renderCalendarView()}
            </div>
            <div class="booking-details" id="bookingDetails" style="display: none;">
                <div class="details-header">
                    <h4>Bookings for <span id="selectedDateText"></span></h4>
                    <button class="close-details" onclick="vendorCalendar.closeDetails()">×</button>
                </div>
                <div class="details-content" id="detailsContent"></div>
            </div>
        `;
    }

    renderVendorStats() {
        return `
            <div class="vendor-stats-grid">
                <div class="vendor-stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-calendar-day"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${this.vendorStats.todayBookings || 0}</h3>
                        <p>Today's Bookings</p>
                    </div>
                </div>
                <div class="vendor-stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${this.vendorStats.pendingBookings || 0}</h3>
                        <p>Pending Approval</p>
                    </div>
                </div>
                <div class="vendor-stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${this.vendorStats.approvedBookings || 0}</h3>
                        <p>Approved</p>
                    </div>
                </div>
                <div class="vendor-stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-calendar-alt"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${this.vendorStats.thisMonthBookings || 0}</h3>
                        <p>This Month</p>
                    </div>
                </div>
                ${this.vendorType === 'company' ? this.renderCompanyStats() : ''}
            </div>
        `;
    }

    renderCompanyStats() {
        return `
            <div class="vendor-stat-card company-stat">
                <div class="stat-icon">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-info">
                    <h3>${this.getUniqueCustomers()}</h3>
                    <p>Unique Customers</p>
                </div>
            </div>
            <div class="vendor-stat-card company-stat">
                <div class="stat-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="stat-info">
                    <h3>${this.getMonthlyGrowth()}%</h3>
                    <p>Monthly Growth</p>
                </div>
            </div>
        `;
    }

    renderVendorActions() {
        return `
            <div class="vendor-actions">
                <button class="btn-secondary" onclick="vendorCalendar.setAvailability()">
                    <i class="fas fa-calendar-plus"></i> Set Availability
                </button>
                <button class="btn-secondary" onclick="vendorCalendar.exportSchedule()">
                    <i class="fas fa-download"></i> Export
                </button>
            </div>
        `;
    }

    renderBookingActions(booking) {
        if (booking.bookingStatus === 0) {
            return `
                <button class="action-btn approve" onclick="vendorCalendar.updateBookingStatus(${booking.booking_id || booking.bookingId}, 1)">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button class="action-btn reject" onclick="vendorCalendar.updateBookingStatus(${booking.booking_id || booking.bookingId}, 2)">
                    <i class="fas fa-times"></i> Reject
                </button>
                <button class="action-btn edit" onclick="vendorCalendar.rescheduleBooking(${booking.booking_id || booking.bookingId})">
                    <i class="fas fa-edit"></i> Reschedule
                </button>
            `;
        } else if (booking.bookingStatus === 1) {
            return `
                <button class="action-btn view" onclick="vendorCalendar.viewBookingDetails(${booking.booking_id || booking.bookingId})">
                    <i class="fas fa-eye"></i> View Details
                </button>
                <button class="action-btn edit" onclick="vendorCalendar.addNotes(${booking.booking_id || booking.bookingId})">
                    <i class="fas fa-sticky-note"></i> Add Notes
                </button>
            `;
        }
        return '';
    }

    getUniqueCustomers() {
        if (!this.bookings || !this.bookings.length) return 0;
        const uniqueCustomers = new Set(this.bookings.map(b => b.user_id));
        return uniqueCustomers.size;
    }

    getMonthlyGrowth() {
        if (!this.bookings || !this.bookings.length) return 0;
        
        const thisMonth = new Date();
        const lastMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - 1, 1);
        const thisMonthEnd = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 1);
        const lastMonthEnd = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);

        const thisMonthBookings = this.bookings.filter(b => {
            const date = new Date(b.bookingDate);
            return date >= lastMonthEnd && date < thisMonthEnd;
        }).length;

        const lastMonthBookings = this.bookings.filter(b => {
            const date = new Date(b.bookingDate);
            return date >= lastMonth && date < lastMonthEnd;
        }).length;

        if (lastMonthBookings === 0) return thisMonthBookings > 0 ? 100 : 0;
        return Math.round(((thisMonthBookings - lastMonthBookings) / lastMonthBookings) * 100);
    }

    async setAvailability() {
        // Show availability setting modal
        if (typeof showModal === 'function') {
            showModal('availabilityModal');
        } else {
            console.error('showModal function not found');
        }
    }

    async exportSchedule() {
        try {
            const csvContent = this.generateCSV();
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `schedule_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting schedule:', error);
            if (typeof showNotification === 'function') {
                showNotification('Failed to export schedule', 'error');
            }
        }
    }

    generateCSV() {
        const headers = ['Date', 'Time', 'Customer', 'Service', 'Status', 'Notes'];
        const rows = this.bookings.map(booking => [
            booking.bookingDate,
            booking.bookingTime,
            booking.userName,
            booking.serviceName,
            this.getStatusText(booking.bookingStatus),
            booking.notes || ''
        ]);

        return [headers, ...rows].map(row => 
            row.map(field => `"${field}"`).join(',')
        ).join('\n');
    }

    async rescheduleBooking(bookingId) {
        // Show reschedule modal
        if (typeof showNotification === 'function') {
            showNotification('Reschedule functionality coming soon', 'info');
        }
    }

    async addNotes(bookingId) {
        const notes = prompt('Add notes for this booking:');
        if (notes) {
            // API call to add notes
            if (typeof showNotification === 'function') {
                showNotification('Notes added successfully', 'success');
            }
        }
    }
    
    async viewBookingDetails(bookingId) {
        // View booking details
        if (typeof showNotification === 'function') {
            showNotification('Viewing booking details', 'info');
        }
    }
}

// Initialize vendor calendar
let vendorCalendar;