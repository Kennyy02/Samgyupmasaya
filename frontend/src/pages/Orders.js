// src/pages/Orders.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Orders.css';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';

const Orders = () => {
    const [onlineOrders, setOnlineOrders] = useState([]);
    const [onsiteOrders, setOnsiteOrders] = useState([]);
    const [orderType, setOrderType] = useState('all');
    const [loading, setLoading] = useState(false);
    const [onlinePage, setOnlinePage] = useState(1);
    const [onsitePage, setOnsitePage] = useState(1);

    const ORDERS_PER_PAGE = 10;
    const ORDERS_BASE_URL = 'http://localhost:5003/orders';
    const PRODUCTS_BASE_URL = 'http://localhost:5002/products';

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const [onlineRes, onsiteRes] = await Promise.all([
                axios.get(`${ORDERS_BASE_URL}/online`),
                axios.get(`${ORDERS_BASE_URL}/onsite`)
            ]);

            const onlineData = onlineRes.data.sort((a, b) => new Date(b.ordered_at) - new Date(a.ordered_at));
            const onsiteData = onsiteRes.data.sort((a, b) => new Date(b.ordered_at) - new Date(a.ordered_at));

            setOnlineOrders(onlineData);
            setOnsiteOrders(onsiteData);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleOrderTypeChange = (e) => {
        setOrderType(e.target.value);
    };

    // ----------------------------------------------------------------------
    // --- handleOnlineStatusChange for multi-step status updates (Pending -> Preparing -> Delivered) ---
    // ----------------------------------------------------------------------
    const handleOnlineStatusChange = async (orderId, currentStatus, productId, quantity) => {
        let newStatus;
        let confirmMessage;
        let isFinalStatus = false;

        if (currentStatus === 'Pending') {
            newStatus = 'Preparing';
            confirmMessage = `Are you sure you want to mark Order ID ${orderId} as ${newStatus}? This will notify the customer via email.`;
        } else if (currentStatus === 'Preparing') {
            newStatus = 'Delivered';
            isFinalStatus = true;
            confirmMessage = `Are you sure you want to mark Order ID ${orderId} as ${newStatus}? This action is final and will affect stock, and notify the customer via email.`;
        } else if (currentStatus === 'Delivered') {
            return; // Already delivered, no further action
        } else {
            return; // Unknown status
        }

        const confirmChange = window.confirm(confirmMessage);

        if (!confirmChange) {
            return;
        }

        try {
            // 1. Update the order status (Backend sends email here)
            await axios.put(`${ORDERS_BASE_URL}/online/${orderId}/status`, { status: newStatus });

            // 2. If the status is Delivered, update the product stock
            if (isFinalStatus) {
                await axios.patch(`${PRODUCTS_BASE_URL}/online/${productId}`, { quantity });
                alert(`✅ Order ID ${orderId} marked as delivered and product stock has been updated. The customer has been notified via email.`);
            } else {
                alert(`✅ Order ID ${orderId} status updated to ${newStatus}. The customer has been notified via email.`);
            }
            
            fetchOrders();
        } catch (error) {
            console.error("Error updating online order status or product stock:", error);
            alert("❌ Failed to update order status or stock. Please check the backend services.");
        }
    };
    // ----------------------------------------------------------------------

    const handleOnsiteStatusChange = async (orderId, currentStatus, productId, quantity) => {
        if (currentStatus === 'Served') {
            return;
        }

        const newStatus = 'Served';
        const confirmChange = window.confirm(`Are you sure you want to mark Onsite Order ID ${orderId} as ${newStatus}? This action is final and will affect stock.`);

        if (!confirmChange) {
            return;
        }

        try {
            // First, update the order status
            await axios.put(`${ORDERS_BASE_URL}/onsite/${orderId}/status`, { status: newStatus });

            // Second, call the product service to reduce the stock
            await axios.patch(`${PRODUCTS_BASE_URL}/onsite/${productId}`, { quantity });

            alert(`✅ Onsite Order ID ${orderId} marked as served and product stock has been updated.`);
            fetchOrders();
        } catch (error) {
            console.error("Error updating onsite order status or product stock:", error);
            alert("❌ Failed to update order status or stock. Please check the backend services.");
        }
    };

    // Pagination Logic
    const paginate = (orders, page) => {
        const startIndex = (page - 1) * ORDERS_PER_PAGE;
        return orders.slice(startIndex, startIndex + ORDERS_PER_PAGE);
    };

    const paginatedOnlineOrders = paginate(onlineOrders, onlinePage);
    const paginatedOnsiteOrders = paginate(onsiteOrders, onsitePage);

    const totalOnlinePages = Math.ceil(onlineOrders.length / ORDERS_PER_PAGE);
    const totalOnsitePages = Math.ceil(onsiteOrders.length / ORDERS_PER_PAGE);

    const renderPagination = (currentPage, totalPages, setPage) => {
        if (totalPages <= 1) return null;
        return (
            <div className="pagination-controls">
                <button
                    onClick={() => setPage(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    <FaArrowLeft />
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                    onClick={() => setPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    <FaArrowRight />
                </button>
            </div>
        );
    };

    const renderOnlineTable = () => (
        <div className="orders-table-container">
            <h3>Online Orders History</h3>
            <table className="orders-table online-table"> {/* Added online-table class */}
                <thead>
                    <tr>
                        <th>Customer</th>
                        <th className="truncate-cell">Address</th>
                        <th>Contact</th>
                        <th className="truncate-cell">Email</th> 
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Payment</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedOnlineOrders.length > 0 ? (
                        paginatedOnlineOrders.map((o) => (
                            <tr key={o.id}>
                                <td>{o.customer_name}</td>
                                <td className="truncate-cell address-cell" title={o.address}>{o.address}</td> {/* Added truncate-cell and title */}
                                <td>{o.contact_number}</td>
                                <td className="truncate-cell email-cell" title={o.customer_email}>{o.customer_email}</td> {/* Added truncate-cell and title */}
                                <td>{o.product_name}</td>
                                <td>{o.quantity}</td>
                                <td>₱{parseFloat(o.price).toFixed(2)}</td>
                                <td>{o.payment_method}</td>
                                <td>
                                    <span
                                        className={`status-badge ${o.status.toLowerCase()}`}
                                        onClick={() => o.status !== 'Delivered' && handleOnlineStatusChange(o.id, o.status, o.product_id, o.quantity)}
                                    >
                                        {o.status}
                                    </span>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="9" className="no-orders-message">No online orders found.</td> 
                        </tr>
                    )}
                </tbody>
            </table>
            {renderPagination(onlinePage, totalOnlinePages, setOnlinePage)}
        </div>
    );

    const renderOnsiteTable = () => (
        <div className="orders-table-container">
            <h3>Onsite Orders History</h3>
            <table className="orders-table onsite-table"> {/* Added onsite-table class */}
                <thead>
                    <tr>
                        <th>Table</th>
                        <th>Name</th>
                        <th>Persons</th>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Total</th>
                        <th>Payment</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedOnsiteOrders.length > 0 ? (
                        paginatedOnsiteOrders.map((o) => (
                            <tr key={o.id}>
                                <td>{o.table_number}</td>
                                <td>{o.customer_name}</td>
                                <td>{o.number_of_persons}</td>
                                <td>{o.product_name}</td>
                                <td>{o.quantity}</td>
                                <td>
                                    ₱{parseFloat(o.total_price).toFixed(2)}
                                </td>
                                <td>{o.payment_status}</td>
                                <td>
                                    <span
                                        className={`status-badge ${o.change_status ? o.change_status.toLowerCase() : 'pending'}`}
                                        onClick={() => o.change_status !== 'Served' && handleOnsiteStatusChange(o.id, o.change_status, o.product_id, o.quantity)}
                                    >
                                        {o.change_status || 'Pending'}
                                    </span>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="8" className="no-orders-message">No onsite orders found.</td>
                        </tr>
                    )}
                </tbody>
            </table>
            {renderPagination(onsitePage, totalOnsitePages, setOnsitePage)}
        </div>
    );

    return (
        <div className="orders-container">
            <header className="orders-header">
                <h2>Order Management</h2>
                <div className="filter-section">
                    <label htmlFor="orderTypeSelect">Select History: </label>
                    <div className="custom-select-wrapper">
                        <select id="orderTypeSelect" value={orderType} onChange={handleOrderTypeChange}>
                            <option value="all">All Orders</option>
                            <option value="online">Online Orders</option>
                            <option value="onsite">Onsite Orders</option>
                        </select>
                    </div>
                </div>
            </header>

            <section className="order-list-section">
                {loading ? (
                    <p>Loading orders...</p>
                ) : (
                    <>
                        {orderType === 'all' && (
                            <>
                                {renderOnlineTable()}
                                {renderOnsiteTable()}
                            </>
                        )}
                        {orderType === 'online' && renderOnlineTable()}
                        {orderType === 'onsite' && renderOnsiteTable()}
                    </>
                )}
            </section>
        </div>
    );
};

export default Orders;