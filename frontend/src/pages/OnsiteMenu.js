// src/pages/OnsiteMenu.js
import React, { useEffect, useState, useReducer } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import CheckoutModal from '../components/CheckoutModal';
// UPDATED CSS IMPORT PATH
import './OnlineMenuFresh.css'; 
import { 
    FaCartShopping, 
    FaUtensils, 
    FaBowlFood, 
    FaMugSaucer, 
    FaPizzaSlice, 
    FaHouse, 
    FaList, 
    FaBell, 
    FaChevronDown, 
    FaChevronUp, 
    FaChevronLeft, 
    FaChevronRight 
} from 'react-icons/fa6';
import { FaCheckCircle, FaClipboardList } from 'react-icons/fa';

// --- Notification State Management with useReducer ---
const notificationsReducer = (state, action) => {
    switch (action.type) {
        case 'ADD_NOTIFICATION': {
            const notificationId = action.payload.id;
            // Prevent adding duplicate notifications
            if (state.items.some(item => item.id === notificationId)) {
                return state;
            }
            // Recalculate unread count
            const newUnreadCount = state.items.filter(n => !n.isRead).length + 1;
            return {
                ...state,
                items: [action.payload, ...state.items],
                unreadCount: newUnreadCount,
            };
        }
        case 'MARK_AS_READ':
            // Only update if there are unread items to prevent re-rendering
            if (state.unreadCount === 0) return state; 
            return {
                ...state,
                items: state.items.map(n => ({ ...n, isRead: true })),
                unreadCount: 0,
            };
        case 'REPLACE_NOTIFICATION': {
            const { orderId, newNotification } = action.payload;
            const oldNotificationId = `${orderId}-preparing`;
            
            // Remove the 'preparing' notification
            const filteredItems = state.items.filter(n => n.id !== oldNotificationId);
            
            // If the served notification already exists, do nothing
            if (filteredItems.some(n => n.id === newNotification.id)) {
                return state;
            }
            
            // Recalculate unread count (based on filtered items + the new one)
            const newUnreadCount = filteredItems.filter(n => !n.isRead).length + 1;

            return {
                ...state,
                items: [newNotification, ...filteredItems],
                unreadCount: newUnreadCount,
            };
        }
        case 'INITIALIZE_NOTIFICATIONS':
            return action.payload;
        default:
            return state;
    }
};

const getInitialState = (tableId) => {
    try {
        // Load state specific to the table ID
        const savedState = localStorage.getItem(`onsiteNotifications-${tableId}`);
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            const unreadCount = parsedState.items.filter(n => !n.isRead).length;
            return { ...parsedState, unreadCount };
        }
        return { items: [], unreadCount: 0 };
    } catch (e) {
        console.error("Could not load notifications from localStorage", e);
        return { items: [], unreadCount: 0 };
    }
};

const OnsiteMenu = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // The unique ID scanned from the QR code (e.g., TABLE-001)
    const scannedTableId = location.state?.scannedTableId;

    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedCategoryId, setSelectedCategoryId] = useState('all');
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [cartMessage, setCartMessage] = useState('');
    
    // Notification Dropdown State
    const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
    const [openDescriptionId, setOpenDescriptionId] = useState(null);

    // --- Pagination State ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Notification Reducer and Initial State
    const [notificationsState, dispatch] = useReducer(notificationsReducer, null, () => getInitialState(scannedTableId));

    // --- UPDATED: Use Environment Variables for Service URLs ---
    const PRODUCT_SERVICE_URL = process.env.REACT_APP_PRODUCT_SERVICE_URL || 'http://localhost:5002';
    const ORDER_SERVICE_BASE_URL = process.env.REACT_APP_ORDER_SERVICE_URL || 'http://localhost:5003';

    const ORDER_SERVICE_URL = `${ORDER_SERVICE_BASE_URL}/orders/onsite`;
    // URL to poll for all orders for the current table
    const ONSITE_ORDER_STATUS_URL = scannedTableId ? `${ORDER_SERVICE_BASE_URL}/orders/onsite/status/${scannedTableId}` : null;

    const categoryIcons = {
        'All Products': <FaList />,
        'Rice Bowl': <FaBowlFood />,
        'Beverages': <FaMugSaucer />,
        'Pizza': <FaPizzaSlice />,
        'Unlimited Rates': <FaUtensils />,
        'Limited Rules': <FaUtensils />, // Added for completeness, though not strictly needed here
        'default': <FaUtensils />
    };

    const fetchOnsiteProducts = async () => {
        setLoading(true);
        try {
            const productsRes = await axios.get(`${PRODUCT_SERVICE_URL}/products/onsite`);
            const categoriesRes = await axios.get(`${PRODUCT_SERVICE_URL}/categories`);

            setCategories(categoriesRes.data);

            const productsData = productsRes.data.map(p => ({
                ...p,
                price: parseFloat(p.price),
                stock: parseInt(p.stock, 10),
                category_id: parseInt(p.category_id, 10),
                category_name: categoriesRes.data.find(cat => cat.id === parseInt(p.category_id, 10))?.name || 'Uncategorized'
            }));

            setMenuItems(productsData);

        } catch (err) {
            setError('Failed to load onsite menu. Please check the Product Service.');
            console.error("Fetching onsite products error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOnsiteProducts();
    }, []);

    // Local Storage Caching
    useEffect(() => {
        if (scannedTableId) {
            // Only save the state, excluding dispatch and functions
            const stateToSave = {
                items: notificationsState.items,
                unreadCount: notificationsState.unreadCount
            };
            localStorage.setItem(`onsiteNotifications-${scannedTableId}`, JSON.stringify(stateToSave));
        }
    }, [notificationsState, scannedTableId]);

    // Order Status Polling Logic
    useEffect(() => {
        let intervalId;
        if (scannedTableId && ONSITE_ORDER_STATUS_URL) {
            intervalId = setInterval(async () => {
                try {
                    const response = await axios.get(ONSITE_ORDER_STATUS_URL);
                    const orders = response.data;

                    orders.forEach(order => {
                        const orderId = order.id;
                        const preparingNotificationId = `${orderId}-preparing`;
                        const servedNotificationId = `${orderId}-served`;

                        const preparingExists = notificationsState.items.some(n => n.id === preparingNotificationId);
                        const servedExists = notificationsState.items.some(n => n.id === servedNotificationId);

                        if (order.status === 'Served') {
                            if (!servedExists) {
                                dispatch({
                                    type: 'REPLACE_NOTIFICATION', 
                                    payload: {
                                        orderId: orderId,
                                        newNotification: {
                                            id: servedNotificationId,
                                            message: `Your order #${orderId} has been served!`,
                                            timestamp: new Date().toISOString(),
                                            type: 'delivered',
                                            isRead: false
                                        }
                                    }
                                });
                            }
                        } else if ((order.status === 'Preparing' || order.status === 'Pending') && !preparingExists) {
                            dispatch({
                                type: 'ADD_NOTIFICATION',
                                payload: {
                                    id: preparingNotificationId,
                                    message: `Your order #${orderId} is now being prepared.`,
                                    timestamp: new Date().toISOString(),
                                    type: 'preparing',
                                    isRead: false
                                }
                            });
                        }
                    });
                } catch (error) {
                    // Log to console if polling fails, but don't crash the UI
                    // console.error("Error polling for onsite order status:", error.message);
                }
            }, 5000); // Poll every 5 seconds
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [scannedTableId, notificationsState.items, ONSITE_ORDER_STATUS_URL, dispatch]);

    const filteredProducts = selectedCategoryId === 'all'
        ? menuItems
        : menuItems.filter(product => product.category_id === selectedCategoryId);

    // --- Pagination Logic ---
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        window.scrollTo(0, 0); 
    };

    const getSelectedCategoryName = () => {
        if (selectedCategoryId === 'all') {
            return 'All Products';
        }
        const category = categories.find(cat => cat.id === selectedCategoryId);
        return category ? category.name : 'Unknown Category';
    };

    const addToCart = (product) => {
        const existingItem = cart.find(item => item.id === product.id);

        if (product.stock <= 0) {
            setCartMessage('Product is out of stock.');
            setTimeout(() => setCartMessage(''), 1500);
            return;
        }

        if (existingItem) {
            if (existingItem.quantity >= product.stock) {
                setCartMessage('Cannot add more than available stock.');
                setTimeout(() => setCartMessage(''), 1500);
                return;
            }

            const updatedCart = cart.map(item =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            );
            setCart(updatedCart);
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
        setCartMessage(`${product.name} added to cart.`);
        setTimeout(() => setCartMessage(''), 1500);
        setShowCart(true);
    };

    const updateCartQuantity = (productId, change) => {
        const product = menuItems.find(p => p.id === productId);
        const updatedCart = cart.map(item => {
            if (item.id === productId) {
                const newQuantity = item.quantity + change;

                if (newQuantity < 0) {
                    return item;
                }
                if (product && newQuantity > product.stock) {
                    setCartMessage('Cannot exceed available stock.');
                    setTimeout(() => setCartMessage(''), 1500);
                    return item;
                }

                return { ...item, quantity: newQuantity };
            }
            return item;
        }).filter(item => item.quantity > 0);
        setCart(updatedCart);
    };

    const calculateCartTotalDisplay = () => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2);
    };

    const totalCartItems = cart.reduce((total, item) => total + item.quantity, 0);

    const toggleCart = () => {
        setShowCart(!showCart);
    };

    const openCheckoutModal = () => {
        if (cart.length === 0) {
            Swal.fire('Error', 'Your cart is empty.', 'error');
            return;
        }
        setIsModalOpen(true);
    };

    const handleOnsiteOrderSubmission = async (checkoutData) => {
        const {
            customerName,
            numberOfPersons,
            cart: finalCartItems,
            paymentMethod
        } = checkoutData;

        try {
            const orderPayload = {
                customer_name: customerName,
                table_id: scannedTableId,
                number_of_persons: numberOfPersons,
                payment_status: paymentMethod,
                items: finalCartItems.map(item => ({
                    product_id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    category_name: item.category_name,
                    image_url: item.image_url
                })),
            };

            const response = await axios.post(ORDER_SERVICE_URL, orderPayload);
            const onsiteOrderId = response.data.order_id;

            // Notification dispatch on successful order placement
            if (onsiteOrderId) {
                dispatch({
                    type: 'ADD_NOTIFICATION',
                    payload: {
                        id: `${onsiteOrderId}-preparing`,
                        message: `Your order #${onsiteOrderId} is now being prepared.`,
                        timestamp: new Date().toISOString(),
                        type: 'preparing',
                        isRead: false
                    }
                });
            } else {
                console.error('Order ID not returned from server, cannot create notification.');
                Swal.fire('Error', 'Failed to get order ID from server.', 'error');
            }

            Swal.fire('Success!', `Onsite order placed successfully for Table ${scannedTableId}!`, 'success');

            setCart([]);
            setShowCart(false);
            setIsModalOpen(false);

        } catch (error) {
            console.error("Onsite order placement failed:", error);
            Swal.fire('Error', 'Failed to place order. Please check the Order Service.', 'error');
        }
    };

    // Toggle and Mark as Read Function
    const toggleNotificationDropdown = () => {
        // Mark all as read when opening the dropdown
        if (!showNotificationDropdown && notificationsState.unreadCount > 0) {
            dispatch({ type: 'MARK_AS_READ' });
        }
        setShowNotificationDropdown(!showNotificationDropdown);
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    const toggleDescription = (id) => {
        setOpenDescriptionId(openDescriptionId === id ? null : id);
    };
    
    // ⭐ CORRECTION: Helper function to determine if a product is a 'Rate' type, now checking for 'Limited Rules'
    const isRateProduct = (categoryName) => {
        return categoryName === 'Unlimited Rates' || categoryName === 'Limited Rules'; 
    };
    
    if (!scannedTableId) {
        return <div className="ol-menu-wrapper"><div className="ol-error-message">Error: No table ID found. Please scan a QR code.</div></div>;
    }

    if (loading) {
        return <div className="ol-menu-wrapper"><div className="ol-loading">Loading onsite menu...</div></div>;
    }

    if (error) {
        return <div className="ol-menu-wrapper"><div className="ol-error-message">{error}</div></div>;
    }

    return (
        <div className="ol-menu-wrapper"> 
            <header className="ol-menu-topbar">
                <div className="ol-table-id-container">
                    <strong>{scannedTableId || 'N/A'}</strong>
                </div>
                
                <div className="ol-header-actions">
                    
                    {/* Notification Bell Container */}
                    <div className="ol-notification-bell-container">
                        <button onClick={toggleNotificationDropdown} className="ol-notification-bell-btn">
                            <FaBell className="ol-notification-bell-icon" />
                            {notificationsState.unreadCount > 0 && <span className="ol-notification-badge">{notificationsState.unreadCount}</span>}
                        </button>
                        {showNotificationDropdown && (
                            <div className="ol-notification-dropdown">
                                <div className="ol-dropdown-header"> 
                                    <h3>Notifications</h3>
                                </div>
                                <ul className="ol-dropdown-list">
                                    {notificationsState.items.length > 0 ? (
                                        notificationsState.items.map(notification => (
                                            <li key={notification.id} className={`ol-dropdown-item ${!notification.isRead ? 'unread' : ''}`}>
                                                <div className="ol-notification-icon">
                                                    {notification.type === 'preparing' && <FaClipboardList />}
                                                    {notification.type === 'delivered' && <FaCheckCircle />}
                                                </div>
                                                <div className="ol-notification-details">
                                                    <p>{notification.message}</p>
                                                    <small>{formatTimestamp(notification.timestamp)}</small>
                                                </div>
                                            </li>
                                        ))
                                    ) : (
                                        <li className="ol-dropdown-item ol-empty">No new notifications.</li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Cart Icon */}
                    <div className="ol-cart-icon-container" onClick={toggleCart}>
                        <FaCartShopping className="ol-cart-icon" />
                        {totalCartItems > 0 && <span className="ol-cart-count">{totalCartItems}</span>}
                    </div>

                    {/* Back Button */}
                    <button onClick={() => navigate('/')} className="ol-back-button">
                        <FaHouse />
                    </button>
                </div>
            </header>

            <div className="ol-menu-layout">

                {/* Categories Navigation (remains the same) */}
                <aside className="ol-category-nav">
                    <div className="ol-category-header-row">
                        <h3>Select Categories</h3>
                    </div>
                    <button
                        className={`ol-all-products-btn ${selectedCategoryId === 'all' ? 'active' : ''}`}
                        onClick={() => { setSelectedCategoryId('all'); setCurrentPage(1); }}
                    >
                        {categoryIcons['All Products']} All Menu
                    </button>

                    <ul>
                        {categories.map(category => (
                            <li
                                key={category.id}
                                className={`ol-category-item ${selectedCategoryId === category.id ? 'active' : ''}`}
                                onClick={() => { setSelectedCategoryId(category.id); setCurrentPage(1); }}
                            >
                                {categoryIcons[`${category.name}`] || categoryIcons['default']}
                                {category.name}
                            </li>
                        ))}
                    </ul>
                </aside>

                {/* Main Content Area */}
                <main className="ol-menu-main-content">
                    <div className="ol-product-display-section">
                        <h3>{getSelectedCategoryName()}</h3>
                        <div className="ol-item-list-grid">
                            {paginatedProducts.length === 0 ? (
                                <p>No products found in this category.</p>
                            ) : (
                                paginatedProducts.map(product => (
                                    <div key={product.id} className="ol-item-card">
                                        <img
                                            src={product.image_url.startsWith('http') ? product.image_url : `${PRODUCT_SERVICE_URL}${product.image_url}`}
                                            alt={product.name}
                                            className="ol-item-img"
                                        />
                                        {product.stock <= 0 && (
                                            <div className="ol-unavailable-overlay">Not Available</div>
                                        )}
                                        <div className="ol-item-details">
                                            <h4>{product.name}</h4>

                                            {/* ⭐ CORRECTION: Only render description if it exists AND the product is a 'Rate' type ('Unlimited Rates' or 'Limited Rules') */}
                                            {(product.description && isRateProduct(product.category_name)) && (
                                                <div className="ol-description-container">
                                                    <button
                                                        className="ol-description-toggle-btn"
                                                        onClick={() => toggleDescription(product.id)}
                                                    >
                                                        <span>Details</span>
                                                        {openDescriptionId === product.id ? <FaChevronUp /> : <FaChevronDown />}
                                                    </button>
                                                    <div className={`ol-description-dropdown ${openDescriptionId === product.id ? 'open' : ''}`}>
                                                        <p className="ol-description-text">{product.description}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {/* End of CORRECTION */}

                                            <div className="ol-price-cart-container">
                                                <p className="ol-product-price">₱{product.price.toFixed(2)}</p>
                                                <button
                                                    onClick={() => addToCart(product)}
                                                    className="ol-add-to-cart-btn"
                                                    disabled={product.stock <= 0}
                                                >
                                                    {product.stock > 0 ? (
                                                        <FaCartShopping />
                                                    ) : (
                                                        'N/A'
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* ... (Pagination Controls) ... */}
                        {totalPages > 1 && (
                            <div className="ol-pagination-controls">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    <FaChevronLeft />
                                </button>
                                <span>Page {currentPage} of {totalPages}</span>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    <FaChevronRight />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Shopping Cart (Appears as a sidebar on desktop, fixed on mobile) */}
                    <aside className={`ol-shopping-cart ${showCart ? 'ol-cart-visible' : ''}`}>
                        <h3>Your Cart</h3>
                        {cart.length === 0 ? (
                            <p className="ol-cart-empty-message">Cart is empty.</p>
                        ) : (
                            <ul>
                                {cart.map(item => (
                                    <li key={item.id} className="ol-cart-item">
                                        <div className="ol-cart-item-details">
                                            <span>{item.name}</span>
                                            <span className="ol-item-price">₱{(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                        <div className="ol-quantity-controls">
                                            <button onClick={() => updateCartQuantity(item.id, -1)}>-</button>
                                            <span>{item.quantity}</span>
                                            <button onClick={() => updateCartQuantity(item.id, 1)}>+</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="ol-cart-total">
                            <strong>Subtotal:</strong> ₱{calculateCartTotalDisplay()}
                        </div>

                        <button
                            onClick={openCheckoutModal}
                            className="ol-checkout-btn"
                            disabled={cart.length === 0}
                        >
                            Checkout
                        </button>
                        {cartMessage && <div className="ol-cart-message">{cartMessage}</div>}
                    </aside>
                </main>
            </div>

            <CheckoutModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleOnsiteOrderSubmission}
                cart={cart}
                scannedTableId={scannedTableId}
                menuItems={menuItems}
                checkoutType="onsite"
            />
        </div>
    );
};

export default OnsiteMenu;
