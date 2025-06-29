// Calendar functionality for admin panel
class BookingCalendar {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.currentDate = new Date();
        this.bookings = [];
        this.selectedDate = null;
        this.viewMode = options.viewMode || 'month'; // month, week, day
        this.isAdmin = options.isAdmin || false;
        
        this.init();
    }

    init() {
        if (!this.container) {
            console.error('Calendar container not found:', this.container);
            return;
        }
        this.render();
        this.loadBookings();
    }

    render() {
        this.container.innerHTML = `
            <div class="calendar-header">
                <div class="calendar-nav">
                    <button class="nav-btn" onclick="window.${this.isAdmin ? 'adminCalendar' : 'vendorCalendar'}.previousPeriod()">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <h3 class="calendar-title">${this.getTitle()}</h3>
                    <button class="nav-btn" onclick="window.${this.isAdmin ? 'adminCalendar' : 'vendorCalendar'}.nextPeriod()">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="calendar-controls">
                    <div class="view-switcher">
                        <button class="view-btn ${this.viewMode === 'month' ? 'active' : ''}" 
                                onclick="window.${this.isAdmin ? 'adminCalendar' : 'vendorCalendar'}.setViewMode('month')">Month</button>
                        <button class="view-btn ${this.viewMode === 'week' ? 'active' : ''}" 
                                onclick="window.${this.isAdmin ? 'adminCalendar' : 'vendorCalendar'}.setViewMode('week')">Week</button>
                        <button class="view-btn ${this.viewMode === 'day' ? 'active' : ''}" 
                                onclick="window.${this.isAdmin ? 'adminCalendar' : 'vendorCalendar'}.setViewMode('day')">Day</button>
                    </div>
                    <button class="btn-primary" onclick="window.${this.isAdmin ? 'adminCalendar' : 'vendorCalendar'}.goToToday()">Today</button>
                </div>
            </div>
            <div class="calendar-content">
                ${this.renderCalendarView()}
            </div>
            <div class="booking-details" id="bookingDetails" style="display: none;">
                <div class="details-header">
                    <h4>Bookings for <span id="selectedDateText"></span></h4>
                    <button class="close-details" onclick="window.${this.isAdmin ? 'adminCalendar' : 'vendorCalendar'}.closeDetails()">×</button>
                </div>
                <div class="details-content" id="detailsContent"></div>
            </div>
        `;
    }

    renderCalendarView() {
        switch (this.viewMode) {
            case 'month':
                return this.renderMonthView();
            case 'week':
                return this.renderWeekView();
            case 'day':
                return this.renderDayView();
            default:
                return this.renderMonthView();
        }
    }

    renderMonthView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        let html = `
            <div class="calendar-grid month-view">
                <div class="calendar-header-row">
                    <div class="day-header">Sun</div>
                    <div class="day-header">Mon</div>
                    <div class="day-header">Tue</div>
                    <div class="day-header">Wed</div>
                    <div class="day-header">Thu</div>
                    <div class="day-header">Fri</div>
                    <div class="day-header">Sat</div>
                </div>
        `;

        for (let week = 0; week < 6; week++) {
            html += '<div class="calendar-week">';
            for (let day = 0; day < 7; day++) {
                const currentDate = new Date(startDate);
                currentDate.setDate(startDate.getDate() + (week * 7) + day);
                
                const isCurrentMonth = currentDate.getMonth() === month;
                const isToday = this.isToday(currentDate);
                const dayBookings = this.getBookingsForDate(currentDate);
                
                html += `
                    <div class="calendar-day ${isCurrentMonth ? 'current-month' : 'other-month'} 
                         ${isToday ? 'today' : ''}" 
                         onclick="window.${this.isAdmin ? 'adminCalendar' : 'vendorCalendar'}.selectDate('${currentDate.toISOString()}')">
                        <div class="day-number">${currentDate.getDate()}</div>
                        <div class="day-bookings">
                            ${this.renderDayBookings(dayBookings)}
                        </div>
                    </div>
                `;
            }
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    renderWeekView() {
        const startOfWeek = new Date(this.currentDate);
        startOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());

        let html = `
            <div class="calendar-grid week-view">
                <div class="time-column">
                    <div class="time-header"></div>
        `;

        // Time slots
        for (let hour = 0; hour < 24; hour++) {
            html += `<div class="time-slot">${hour.toString().padStart(2, '0')}:00</div>`;
        }

        html += '</div>';

        // Days of week
        for (let day = 0; day < 7; day++) {
            const currentDate = new Date(startOfWeek);
            currentDate.setDate(startOfWeek.getDate() + day);
            const isToday = this.isToday(currentDate);

            html += `
                <div class="day-column ${isToday ? 'today' : ''}">
                    <div class="day-header">
                        <div class="day-name">${currentDate.toLocaleDateString('en', { weekday: 'short' })}</div>
                        <div class="day-number">${currentDate.getDate()}</div>
                    </div>
            `;

            // Time slots for this day
            for (let hour = 0; hour < 24; hour++) {
                const timeSlot = new Date(currentDate);
                timeSlot.setHours(hour, 0, 0, 0);
                const slotBookings = this.getBookingsForTimeSlot(timeSlot);

                html += `
                    <div class="time-slot-cell" onclick="window.${this.isAdmin ? 'adminCalendar' : 'vendorCalendar'}.selectTimeSlot('${timeSlot.toISOString()}')">
                        ${this.renderTimeSlotBookings(slotBookings)}
                    </div>
                `;
            }

            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    renderDayView() {
        const dayBookings = this.getBookingsForDate(this.currentDate);
        
        let html = `
            <div class="day-view">
                <div class="day-header">
                    <h3>${this.currentDate.toLocaleDateString('en', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</h3>
                </div>
                <div class="day-timeline">
        `;

        for (let hour = 0; hour < 24; hour++) {
            const timeSlot = new Date(this.currentDate);
            timeSlot.setHours(hour, 0, 0, 0);
            const slotBookings = this.getBookingsForTimeSlot(timeSlot);

            html += `
                <div class="timeline-hour">
                    <div class="hour-label">${hour.toString().padStart(2, '0')}:00</div>
                    <div class="hour-content">
                        ${this.renderTimeSlotBookings(slotBookings, true)}
                    </div>
                </div>
            `;
        }

        html += '</div></div>';
        return html;
    }

    renderDayBookings(bookings) {
        if (bookings.length === 0) return '';
        
        let html = '';
        const maxShow = 3;
        
        for (let i = 0; i < Math.min(bookings.length, maxShow); i++) {
            const booking = bookings[i];
            const statusClass = this.getStatusClass(booking.bookingStatus);
            
            html += `
                <div class="booking-item ${statusClass}" title="${booking.serviceName} - ${booking.userName}">
                    <span class="booking-time">${booking.bookingTime}</span>
                    <span class="booking-service">${booking.serviceName}</span>
                </div>
            `;
        }
        
        if (bookings.length > maxShow) {
            html += `<div class="booking-more">+${bookings.length - maxShow} more</div>`;
        }
        
        return html;
    }

    renderTimeSlotBookings(bookings, detailed = false) {
        if (bookings.length === 0) return '';
        
        let html = '';
        
        bookings.forEach(booking => {
            const statusClass = this.getStatusClass(booking.bookingStatus);
            
            if (detailed) {
                html += `
                    <div class="booking-card ${statusClass}" onclick="window.${this.isAdmin ? 'adminCalendar' : 'vendorCalendar'}.showBookingDetails(${booking.booking_id || booking.bookingId})">
                        <div class="booking-header">
                            <span class="booking-time">${booking.bookingTime}</span>
                            <span class="booking-status">${this.getStatusText(booking.bookingStatus)}</span>
                        </div>
                        <div class="booking-info">
                            <div class="customer-name">${booking.userName}</div>
                            <div class="service-name">${booking.serviceName}</div>
                            ${this.isAdmin ? `<div class="vendor-name">${booking.vendorName || 'N/A'}</div>` : ''}
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="booking-dot ${statusClass}" 
                         title="${booking.serviceName} - ${booking.userName} at ${booking.bookingTime}"
                         onclick="window.${this.isAdmin ? 'adminCalendar' : 'vendorCalendar'}.showBookingDetails(${booking.booking_id || booking.bookingId})">
                    </div>
                `;
            }
        });
        
        return html;
    }

    getStatusClass(status) {
        switch (status) {
            case 0: return 'status-pending';
            case 1: return 'status-approved';
            case 2: return 'status-cancelled';
            default: return 'status-pending';
        }
    }

    getStatusText(status) {
        switch (status) {
            case 0: return 'Pending';
            case 1: return 'Approved';
            case 2: return 'Cancelled';
            default: return 'Unknown';
        }
    }

    getTitle() {
        switch (this.viewMode) {
            case 'month':
                return this.currentDate.toLocaleDateString('en', { month: 'long', year: 'numeric' });
            case 'week':
                const startOfWeek = new Date(this.currentDate);
                startOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                return `${startOfWeek.toLocaleDateString('en', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            case 'day':
                return this.currentDate.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
            default:
                return '';
        }
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    getBookingsForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.bookings.filter(booking => {
            const bookingDate = booking.bookingDate || booking.bookingDate;
            return bookingDate.split('T')[0] === dateStr;
        });
    }

    getBookingsForTimeSlot(timeSlot) {
        const dateStr = timeSlot.toISOString().split('T')[0];
        const hour = timeSlot.getHours();
        
        return this.bookings.filter(booking => {
            const bookingDate = booking.bookingDate || booking.bookingDate;
            if (bookingDate.split('T')[0] !== dateStr) return false;
            
            const bookingHour = parseInt(booking.bookingTime.split(':')[0]);
            return bookingHour === hour;
        });
    }

    async loadBookings() {
        try {
            const endpoint = this.isAdmin ? '/api/admin/getbookings' : '/api/booking/vendorbookedservices';
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.bookings = data.bookings || [];
                this.render(); // Re-render with new data
            }
        } catch (error) {
            console.error('Error loading bookings:', error);
        }
    }

    selectDate(dateStr) {
        this.selectedDate = new Date(dateStr);
        const bookings = this.getBookingsForDate(this.selectedDate);
        this.showDateDetails(this.selectedDate, bookings);
    }

    selectTimeSlot(timeSlotStr) {
        const timeSlot = new Date(timeSlotStr);
        const bookings = this.getBookingsForTimeSlot(timeSlot);
        this.showTimeSlotDetails(timeSlot, bookings);
    }

    showDateDetails(date, bookings) {
        const detailsPanel = document.getElementById('bookingDetails');
        const selectedDateText = document.getElementById('selectedDateText');
        const detailsContent = document.getElementById('detailsContent');
        
        if (!detailsPanel || !selectedDateText || !detailsContent) {
            console.error('Booking details elements not found');
            return;
        }
        
        selectedDateText.textContent = date.toLocaleDateString('en', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
        });
        
        if (bookings.length === 0) {
            detailsContent.innerHTML = '<p class="no-bookings">No bookings for this date</p>';
        } else {
            detailsContent.innerHTML = bookings.map(booking => `
                <div class="booking-detail-card ${this.getStatusClass(booking.bookingStatus)}">
                    <div class="booking-detail-header">
                        <span class="booking-time">${booking.bookingTime}</span>
                        <span class="booking-status">${this.getStatusText(booking.bookingStatus)}</span>
                    </div>
                    <div class="booking-detail-info">
                        <p><strong>Customer:</strong> ${booking.userName}</p>
                        <p><strong>Service:</strong> ${booking.serviceName}</p>
                        <p><strong>Category:</strong> ${booking.serviceCategory}</p>
                        ${this.isAdmin ? `<p><strong>Vendor:</strong> ${booking.vendorName || 'N/A'}</p>` : ''}
                        ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
                    </div>
                    <div class="booking-actions">
                        ${this.renderBookingActions(booking)}
                    </div>
                </div>
            `).join('');
        }
        
        detailsPanel.style.display = 'block';
    }

    showTimeSlotDetails(timeSlot, bookings) {
        this.showDateDetails(timeSlot, bookings);
    }

    renderBookingActions(booking) {
        if (this.isAdmin) {
            return `
                <button class="action-btn view" onclick="window.adminCalendar.viewBookingDetails(${booking.booking_id || booking.bookingId})">
                    View Details
                </button>
            `;
        } else {
            // Vendor actions
            if (booking.bookingStatus === 0) {
                return `
                    <button class="action-btn approve" onclick="window.vendorCalendar.updateBookingStatus(${booking.booking_id || booking.bookingId}, 1)">
                        Accept
                    </button>
                    <button class="action-btn reject" onclick="window.vendorCalendar.updateBookingStatus(${booking.booking_id || booking.bookingId}, 2)">
                        Reject
                    </button>
                `;
            }
            return '';
        }
    }

    async updateBookingStatus(bookingId, status) {
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
                this.loadBookings(); // Reload bookings
            } else {
                const data = await response.json();
                showNotification(data.message || 'Operation failed', 'error');
            }
        } catch (error) {
            console.error('Error updating booking status:', error);
            showNotification('Network error', 'error');
        }
    }

    closeDetails() {
        const detailsPanel = document.getElementById('bookingDetails');
        if (detailsPanel) {
            detailsPanel.style.display = 'none';
        }
    }

    setViewMode(mode) {
        this.viewMode = mode;
        this.render();
    }

    previousPeriod() {
        switch (this.viewMode) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() - 7);
                break;
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() - 1);
                break;
        }
        this.render();
    }

    nextPeriod() {
        switch (this.viewMode) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + 7);
                break;
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + 1);
                break;
        }
        this.render();
    }

    goToToday() {
        this.currentDate = new Date();
        this.render();
    }
    
    viewBookingDetails(bookingId) {
        // Implement booking details view
        console.log('View booking details:', bookingId);
    }
}

// Initialize calendar when DOM is loaded
let calendar;