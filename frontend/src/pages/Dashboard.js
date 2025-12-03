// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FaShoppingCart,
  FaStore,
  FaMoneyBillWave,
  FaBoxes,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './Dashboard.css';

/* ===============================
   Chart.js Registration
================================ */
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/* ===============================
   API Configuration
================================ */
const ORDER_API_URL = process.env.REACT_APP_ORDER_API_URL;
const PRODUCT_API_URL = process.env.REACT_APP_PRODUCT_API_URL;
const CUSTOMER_AUTH_API_URL = process.env.REACT_APP_CUSTOMER_AUTH_API_URL;

/* ===============================
   Reusable Summary Card
================================ */
const SummaryCard = ({ title, value, icon, className }) => (
  <div className={`summary-card ${className}`}>
    <div className="summary-icon">{icon}</div>
    <div className="summary-details">
      <div className="summary-title">{title}</div>
      <div className="summary-value">{value}</div>
    </div>
  </div>
);

/* ===============================
   Calendar Component
================================ */
const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        isToday:
          i === new Date().getDate() &&
          month === new Date().getMonth() &&
          year === new Date().getFullYear(),
      });
    }

    // Next month days
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="calendar-card">
      <div className="calendar-header">
        <h3>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h3>
        <div className="calendar-nav">
          <button onClick={handlePrevMonth} aria-label="Previous month">
            <FaChevronLeft />
          </button>
          <button onClick={handleNextMonth} aria-label="Next month">
            <FaChevronRight />
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {dayNames.map((day) => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}
        {days.map((dayObj, index) => (
          <div
            key={index}
            className={`calendar-day ${
              dayObj.isToday ? 'today' : ''
            } ${!dayObj.isCurrentMonth ? 'other-month' : ''}`}
          >
            {dayObj.day}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ===============================
   Dashboard Component
================================ */
export default function Dashboard() {
  // ---- State ----
  const [summary, setSummary] = useState({
    totalOnlineOrders: 0,
    totalOnsiteOrders: 0,
    overallSales: '0.00',
    onlineItems: 0,
    onsiteItems: 0,
  });

  const [dailyUsers, setDailyUsers] = useState({ labels: [], datasets: [] });
  const [onlineProductsSold, setOnlineProductsSold] = useState({ labels: [], datasets: [] });
  const [onsiteProductsSold, setOnsiteProductsSold] = useState({ labels: [], datasets: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ---- Chart Options ----
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { 
          color: '#1a1a1a',
          font: { size: 11 }
        },
      },
    },
    scales: {
      x: {
        ticks: { 
          color: '#1a1a1a',
          font: { size: 10 }
        },
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
      },
      y: {
        ticks: { 
          color: '#1a1a1a',
          font: { size: 10 }
        },
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
      },
    },
  };

  // ---- Initial Data Fetch ----
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [summaryRes, productRes, usersRes, onlineSoldRes, onsiteSoldRes] = await Promise.all([
          axios.get(`${ORDER_API_URL}/analytics/summary`),
          axios.get(`${PRODUCT_API_URL}/analytics/product-counts`),
          axios.get(`${CUSTOMER_AUTH_API_URL}/analytics/users-daily`),
          axios.get(`${ORDER_API_URL}/analytics/online-products-sold`),
          axios.get(`${ORDER_API_URL}/analytics/onsite-products-sold`),
        ]);

        setSummary({
          ...summaryRes.data,
          ...productRes.data,
        });

        setDailyUsers({
          labels: usersRes.data.map(item => item.date),
          datasets: [
            {
              label: 'New Users',
              data: usersRes.data.map(item => item.count),
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#6366f1',
              pointBorderColor: '#6366f1',
              pointRadius: 3,
            },
          ],
        });

        setOnlineProductsSold({
          labels: onlineSoldRes.data.map(item => item.product_name),
          datasets: [
            {
              label: 'Online Sales',
              data: onlineSoldRes.data.map(item => item.total_quantity),
              backgroundColor: 'rgba(16, 185, 129, 0.85)',
              borderColor: '#10b981',
              borderWidth: 1,
            },
          ],
        });

        setOnsiteProductsSold({
          labels: onsiteSoldRes.data.map(item => item.product_name),
          datasets: [
            {
              label: 'Onsite Sales',
              data: onsiteSoldRes.data.map(item => item.total_quantity),
              backgroundColor: 'rgba(245, 158, 11, 0.85)',
              borderColor: '#f59e0b',
              borderWidth: 1,
            },
          ],
        });

        setLoading(false);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Failed to load dashboard data. Please check backend services.');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // ---- Search Handler ----
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setIsSearching(false);
      setProducts([]);
      setOrders([]);
      return;
    }

    setIsSearching(true);
    setLoading(true);
    try {
      const [prodRes, orderRes] = await Promise.all([
        axios.get(`${PRODUCT_API_URL}/products/search?q=${searchQuery}`),
        axios.get(`${ORDER_API_URL}/orders/search?q=${searchQuery}`),
      ]);

      setProducts(prodRes.data);
      setOrders(orderRes.data);
      setError(null);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to fetch search results. Please check backend services.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Loading / Error ----
  if (loading) {
    return (
      <div className="dashboard-loading">
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
      </div>
    );
  }

  // ---- UI ----
  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">Admin Dashboard</h2>

      {/* Search */}
      <form onSubmit={handleSearch} className="dashboard-search-form">
        <input
          type="text"
          value={searchQuery}
          placeholder="Search products or orders..."
          onChange={(e) => setSearchQuery(e.target.value)}
          className="dashboard-search-input"
        />
        <button type="submit" className="dashboard-search-button">
          <FaSearch />
        </button>
      </form>

      {isSearching ? (
        <div className="dashboard-search-results">
          {/* Product Results */}
          <div className="search-section">
            <h3 className="section-title">Product Results</h3>
            {products.length ? (
              <ul className="results-list">
                {products.map((p) => (
                  <li key={p.id}>
                    <strong>{p.name}</strong> – {p.type} product
                    (Stock: {p.stock}, Price: ₱{p.price})
                  </li>
                ))}
              </ul>
            ) : (
              <p>No products found.</p>
            )}
          </div>

          {/* Order Results */}
          <div className="search-section">
            <h3 className="section-title">Order Results</h3>
            {orders.length ? (
              <ul className="results-list">
                {orders.map((o) => (
                  <li key={o.id}>
                    <strong>Order #{o.id}</strong> – Customer: {o.customer_name} ({o.type} order)
                  </li>
                ))}
              </ul>
            ) : (
              <p>No orders found.</p>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* All Summary Cards in One Row */}
          <div className="dashboard-section">
            <h3 className="section-title">Business Overview</h3>
            <div className="dashboard-grid summary-row">
              <SummaryCard
                title="Online Orders"
                value={summary.totalOnlineOrders}
                icon={<FaShoppingCart />}
                className="blue"
              />
              <SummaryCard
                title="Onsite Orders"
                value={summary.totalOnsiteOrders}
                icon={<FaStore />}
                className="green"
              />
              <SummaryCard
                title="Total Sales"
                value={`₱${summary.overallSales}`}
                icon={<FaMoneyBillWave />}
                className="purple"
              />
              <SummaryCard
                title="Online Items"
                value={summary.onlineItems}
                icon={<FaBoxes />}
                className="yellow"
              />
              <SummaryCard
                title="Onsite Items"
                value={summary.onsiteItems}
                icon={<FaBoxes />}
                className="orange"
              />
            </div>
          </div>

          {/* Calendar + Top Products Side by Side */}
          <div className="dashboard-section">
            <h3 className="section-title">Calendar & Top Products</h3>
            <div className="dashboard-grid calendar-charts">
              <Calendar />
              <div className="chart-card">
                <h4 className="chart-title">Online</h4>
                <div className="chart-wrapper">
                  <Bar data={onlineProductsSold} options={chartOptions} />
                </div>
              </div>
              <div className="chart-card">
                <h4 className="chart-title">Onsite</h4>
                <div className="chart-wrapper">
                  <Bar data={onsiteProductsSold} options={chartOptions} />
                </div>
              </div>
            </div>
          </div>

          {/* Daily Users Chart */}
          <div className="dashboard-section">
            <h3 className="section-title">User Registrations</h3>
            <div className="chart-card">
              <h4 className="chart-title">Daily New Users</h4>
              <div className="chart-wrapper">
                <Line data={dailyUsers} options={chartOptions} />
              </div>
            </div>
          </div>
        </>
      )}

      <p className="dashboard-footer">
        Use the sidebar to navigate to different sections of the application.
      </p>
    </div>
  );
}
