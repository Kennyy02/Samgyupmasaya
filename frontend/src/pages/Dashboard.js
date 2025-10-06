// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FaShoppingCart,
  FaStore,
  FaMoneyBillWave,
  FaBoxes,
  FaSearch,
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
        labels: { color: 'white' },
      },
    },
    scales: {
      x: {
        ticks: { color: 'white' },
        grid: { color: 'rgba(255, 255, 255, 0.2)' },
      },
      y: {
        ticks: { color: 'white' },
        grid: { color: 'rgba(255, 255, 255, 0.2)' },
      },
    },
  };

  // ---- Initial Data Fetch ----
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [summaryRes, productRes, usersRes, onlineSoldRes, onsiteSoldRes] = await Promise.all([
          axios.get('http://localhost:5003/analytics/summary'),
          axios.get('http://localhost:5002/analytics/product-counts'),
          axios.get('http://localhost:5004/analytics/users-daily'),
          axios.get('http://localhost:5003/analytics/online-products-sold'),
          axios.get('http://localhost:5003/analytics/onsite-products-sold'),
        ]);

        setSummary({
          ...summaryRes.data,
          ...productRes.data,
        });

        setDailyUsers({
          labels: usersRes.data.map(item => item.date),
          datasets: [
            {
              label: 'New Users Registered',
              data: usersRes.data.map(item => item.count),
              borderColor: 'var(--chart-line-color)',
              backgroundColor: 'var(--chart-fill-color)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: 'var(--chart-point-color)',
              pointBorderColor: 'var(--chart-point-color)',
            },
          ],
        });

        setOnlineProductsSold({
          labels: onlineSoldRes.data.map(item => item.product_name),
          datasets: [
            {
              label: 'Most Sold Online Products',
              data: onlineSoldRes.data.map(item => item.total_quantity),
              borderColor: '#33C1FF',
              backgroundColor: 'rgba(51, 193, 255, 0.2)',
              tension: 0.4,
            },
          ],
        });

        setOnsiteProductsSold({
          labels: onsiteSoldRes.data.map(item => item.product_name),
          datasets: [
            {
              label: 'Most Sold Onsite Products',
              data: onsiteSoldRes.data.map(item => item.total_quantity),
              borderColor: '#FF5733',
              backgroundColor: 'rgba(255, 87, 51, 0.2)',
              tension: 0.4,
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
        axios.get(`http://localhost:5002/products/search?q=${searchQuery}`),
        axios.get(`http://localhost:5003/orders/search?q=${searchQuery}`),
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
      <h2 className="dashboard-title">Welcome to the Admin Dashboard!</h2>

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
            <h3 className="section-title">Product Search Results</h3>
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
            <h3 className="section-title">Order Search Results</h3>
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
          {/* Order Details */}
          <div className="dashboard-section">
            <h3 className="section-title">Order Details</h3>
            <div className="dashboard-grid">
              <SummaryCard
                title="Total Online Orders"
                value={summary.totalOnlineOrders}
                icon={<FaShoppingCart />}
                className="blue"
              />
              <SummaryCard
                title="Total Onsite Orders"
                value={summary.totalOnsiteOrders}
                icon={<FaStore />}
                className="green"
              />
              <SummaryCard
                title="Overall Sales"
                value={`₱${summary.overallSales}`}
                icon={<FaMoneyBillWave />}
                className="purple"
              />
            </div>
          </div>

          {/* Product Details */}
          <div className="dashboard-section">
            <h3 className="section-title">Product Details</h3>
            <div className="dashboard-grid">
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

          {/* Daily User Chart */}
          <div className="dashboard-section chart-card">
            <h3 className="section-title">Daily User Registrations</h3>
            <div className="chart-wrapper">
              <Line data={dailyUsers} options={chartOptions} />
            </div>
          </div>

          {/* Top Sold Products */}
          <div className="dashboard-section">
            <h3 className="section-title">Top 5 Most Sold Products</h3>
            <div className="dashboard-grid">
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
        </>
      )}

      <p className="dashboard-footer">
        Use the sidebar to navigate to different sections of the application.
      </p>
    </div>
  );
}
