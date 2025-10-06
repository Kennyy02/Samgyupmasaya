// src/pages/OnlineMenu.js
import React, { useState, useEffect, useReducer, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './OnlineMenuFresh.css'; // This CSS file will need the updated ol- prefixed class names
import CheckoutModal from '../components/CheckoutModal';
import { jwtDecode } from 'jwt-decode';

// Import Icons
import {
    FaCartShopping,
    FaUtensils,
    FaBowlFood,
    FaMugSaucer,
    FaPizzaSlice,
    FaHouse,
    FaList,
    FaChevronDown,
    FaChevronUp,
    FaChevronLeft,
    FaChevronRight,
    // Import the check circle icon for success message
    FaCircleCheck, 
    // Import the circle Xmark icon for error message
    FaCircleXmark, 
} from 'react-icons/fa6';
// Removed FaBell, FaCheckCircle, FaClipboardList icons as they are no longer needed

// --- REMOVED: notificationsReducer as it is no longer needed ---

const OnlineMenu = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('all');
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cartMessage, setCartMessage] = useState('');
    const navigate = useNavigate();

    const [showCart, setShowCart] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    // REMOVED: [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

    const [openDescriptionId, setOpenDescriptionId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const productsPerPage = 8;

    // 🌟 NEW STATE: For the styled checkout confirmation/error popup
    const [checkoutMessage, setCheckoutMessage] = useState(null); // { type: 'success' | 'error', message: string, orderId: number }

    // REMOVED: getInitialState function

    // REMOVED: Notifications state and reducer initialization
    // const [notificationsState, dispatch] = useReducer(notificationsReducer, null, getInitialState);

    const [customerId, setCustomerId] = useState(null);
    const [customerName, setCustomerName] = useState(null);

    // REMOVED: notificationsRef as it is no longer needed

    const PRODUCT_SERVICE_URL = 'http://localhost:5002';
    const ORDER_SERVICE_URL = 'http://localhost:5003/orders/online';

    const categoryIcons = {
        'All Products': <FaList />,
        default: <FaUtensils />,
    };

    // Data Fetching and Customer ID Handling
    useEffect(() => {
        const token = localStorage.getItem('customerToken');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setCustomerId(decoded.id);
                setCustomerName(decoded.username);
            } catch (err) {
                console.error('Failed to decode JWT token:', err);
                localStorage.removeItem('customerToken');
            }
        }

        const fetchMenuData = async () => {
            try {
                const [categoriesRes, productsRes] = await Promise.all([
                    axios.get(`${PRODUCT_SERVICE_URL}/categories`),
                    axios.get(`${PRODUCT_SERVICE_URL}/products/online`),
                ]);
                setCategories(categoriesRes.data);
                const productsData = productsRes.data.map((p) => ({
                    ...p,
                    price: parseFloat(p.price),
                    category_id: parseInt(p.category_id, 10),
                }));
                setProducts(productsData);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching menu data:', error);
                setLoading(false);
            }
        };
        fetchMenuData();
    }, []);

    // *** REMOVED: Polling useEffect to stop fetching order status every 5 seconds ***

    // --- Rest of Component Logic (Unchanged) ---
    const filteredProducts =
        selectedCategoryId === 'all'
            ? products
            : products.filter((product) => product.category_id === selectedCategoryId);

    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = filteredProducts.slice(
        indexOfFirstProduct,
        indexOfLastProduct
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCategoryId]);

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const getSelectedCategoryName = () => {
        if (selectedCategoryId === 'all') {
            return 'All Products';
        }
        const category = categories.find((cat) => cat.id === selectedCategoryId);
        return category ? category.name : 'Unknown Category';
    };

    const addToCart = (product) => {
        if (product.stock === 0) {
            setCartMessage('Product is not available.');
            setTimeout(() => setCartMessage(''), 1500);
            return;
        }
        const existingItem = cart.find((item) => item.id === product.id);
        if (existingItem) {
            // Prevent adding if quantity + 1 exceeds stock
            if (existingItem.quantity >= product.stock) {
                setCartMessage(`Cannot add more. Stock limit (${product.stock}) reached.`);
                setTimeout(() => setCartMessage(''), 1500);
                return;
            }
            const updatedCart = cart.map((item) =>
                item.id === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            );
            setCart(updatedCart);
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
        setCartMessage(`${product.name} added to cart.`);
        setTimeout(() => setCartMessage(''), 1500);
        setShowCart(true);
    };

    // ✅ FIXED: Updated to check against the product's stock before increasing quantity.
    const updateCartQuantity = (productId, change) => {
        const productInMenu = products.find((p) => p.id === productId);
        
        const updatedCart = cart
            .map((item) => {
                if (item.id === productId) {
                    const newQuantity = item.quantity + change;
                    
                    // Check for stock limit when incrementing (change > 0)
                    if (change > 0 && productInMenu && newQuantity > productInMenu.stock) {
                        setCartMessage(`Stock limit (${productInMenu.stock}) reached for ${item.name}.`);
                        setTimeout(() => setCartMessage(''), 1500);
                        return item; // Return item without change
                    }

                    // Return the item with the new quantity (if > 0)
                    return { ...item, quantity: newQuantity > 0 ? newQuantity : 0 };
                }
                return item;
            })
            .filter((item) => item.quantity > 0);
        setCart(updatedCart);
    };

    const calculateTotal = () => {
        return cart
            .reduce((total, item) => total + item.price * item.quantity, 0)
            .toFixed(2);
    };

    const totalCartItems = cart.reduce(
        (total, item) => total + item.quantity,
        0
    );

    const toggleCart = () => {
        setShowCart(!showCart);
    };

    const openCheckoutModal = () => {
        if (cart.length === 0) {
            alert('Your cart is empty.');
            return;
        }
        if (!customerId) {
            alert('You must be logged in to place an online order.');
            navigate('/login');
            return;
        }
        setIsModalOpen(true);
    };

    // 🚨 FIXED: Now correctly receives and sends 'customerId' to the backend
    const processOrder = async ({
        customerId,
        address,
        contactNumber,
        paymentMethod,
    }) => {
        setIsProcessing(true);

        if (!customerId) {
            // 🌟 CHANGED: Use the custom popup for security error
            setCheckoutMessage({
                type: 'error',
                message: 'Security Error: Missing customer ID. Please log in again.'
            });
            setIsProcessing(false);
            return;
        }

        try {
            let totalAmount = 0;

            for (const item of cart) {
                const categoryObj = categories.find(
                    (cat) => cat.id === item.category_id
                );
                const categoryName = categoryObj ? categoryObj.name : 'Uncategorized';

                const orderData = {
                    customerId: customerId, // ⬅️ THIS IS THE CRITICAL FIX for the backend
                    address: address,
                    contact_number: contactNumber,
                    // customer_name and customer_email are now fetched by the backend
                    category: categoryName,
                    product_name: item.name,
                    quantity: item.quantity,
                    price: item.price * item.quantity,
                    payment_method: paymentMethod,
                    status: 'Pending',
                };
                
                // The order service will now use customerId to fetch necessary user details
                await axios.post(ORDER_SERVICE_URL, orderData);
                totalAmount += item.price * item.quantity;
            }

            // 🌟 CHANGED: Use the custom popup for success message
            setCheckoutMessage({
                type: 'success',
                message: `Order placed successfully! Total: ₱${totalAmount.toFixed(2)}. A confirmation and status updates will be sent to your email.`,
                orderId: 'Multiple', // Placeholder for multiple items
            });

            setCart([]);
            setShowCart(false);
            setIsModalOpen(false);
        } catch (error) {
            console.error(
                'Order placement failed:',
                error.response ? error.response.data : error.message
            );
            // 🌟 CHANGED: Use the custom popup for error message
            setCheckoutMessage({
                type: 'error',
                message: `Failed to place order: ${
                    error.response?.data?.error || 'Server error.'
                }`,
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // 🌟 NEW FUNCTION: To close the checkout message popup
    const closeCheckoutMessage = () => {
        setCheckoutMessage(null);
    };


    if (loading) {
        return <div className="ol-loading">Loading menu...</div>;
    }

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    const toggleDescription = (productId) => {
        setOpenDescriptionId(
            openDescriptionId === productId ? null : productId
        );
    };

    // Helper function to check if the item can be incremented
    const canIncrement = (cartItem) => {
        const productInMenu = products.find((p) => p.id === cartItem.id);
        return productInMenu && cartItem.quantity < productInMenu.stock;
    };

    // 🌟 NEW JSX: Checkout Message Popup Component
    const CheckoutMessagePopup = () => {
        if (!checkoutMessage) return null;

        const { type, message } = checkoutMessage;
        
        // Success: green, Error: red
        const icon = type === 'success' ? <FaCircleCheck /> : <FaCircleXmark />;
        const title = type === 'success' ? 'Order Confirmed!' : 'Order Failed';

        return (
            <div className={`ol-checkout-popup-overlay`}>
                <div className={`ol-checkout-popup ol-checkout-${type}`}>
                    <div className="ol-popup-header">
                        {icon}
                        <h3>{title}</h3>
                    </div>
                    <p>{message}</p>
                    <button className="ol-popup-close-btn" onClick={closeCheckoutMessage}>
                        OK
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="ol-menu-wrapper">
            
            {/* 🌟 RENDER THE POPUP */}
            <CheckoutMessagePopup /> 

            <header className="ol-menu-topbar">
                <h2>SELECT FOOD TO ORDER</h2>
                <div className="ol-header-actions">
                    {/* REMOVED: The entire notification-bell-container JSX block */}

                    <div className="ol-cart-icon-container" onClick={toggleCart}>
                        <FaCartShopping className="ol-cart-icon" />
                        {totalCartItems > 0 && (
                            <span className="ol-cart-count">{totalCartItems}</span>
                        )}
                    </div>
                    <button onClick={() => navigate('/')} className="ol-back-button">
                        <FaHouse />
                    </button>
                </div>
            </header>
            <div
                className={`ol-menu-layout ${showCart ? 'ol-cart-visible' : 'ol-cart-hidden'}`}
            >
                <aside className="ol-category-nav">
                    <div className="ol-category-header-row">
                        <h3>Select Categories</h3>
                        <button
                            className={`ol-all-products-btn ${
                                selectedCategoryId === 'all' ? 'active' : ''
                            }`}
                            onClick={() => setSelectedCategoryId('all')}
                        >
                            {categoryIcons['All Products']} All Menu
                        </button>
                    </div>
                    <ul>
                        {categories.map((category) => (
                            <li
                                key={category.id}
                                className={`ol-category-item ${
                                    selectedCategoryId === category.id ? 'active' : ''
                                }`}
                                onClick={() => setSelectedCategoryId(category.id)}
                            >
                                {categoryIcons[`${category.name}`] ||
                                    categoryIcons['default']}
                                {category.name}
                            </li>
                        ))}
                    </ul>
                </aside>
                <main className="ol-menu-main-content">
                    <div className="ol-product-display-section">
                        <h3>{getSelectedCategoryName()}</h3>
                        <div className="ol-item-list-grid">
                            {currentProducts.length === 0 ? (
                                <p>No products found in this category.</p>
                            ) : (
                                currentProducts.map((product) => (
                                    <div key={product.id} className="ol-item-card">
                                        <img
                                            src={
                                                product.image_url.startsWith('http')
                                                    ? product.image_url
                                                    : `http://localhost:5002${product.image_url}`
                                            }
                                            alt={product.name}
                                            className="ol-item-img"
                                            style={{
                                                width: '100%',
                                                objectFit: 'cover',
                                            }}
                                        />
                                        {product.stock === 0 && (
                                            <div className="ol-unavailable-overlay">
                                                Not Available
                                            </div>
                                        )}
                                        <div className="ol-item-details">
                                            <h4>{product.name}</h4>
                                            {product.description && (
                                                <div className="ol-description-container">
                                                    <button
                                                        onClick={() => toggleDescription(product.id)}
                                                        className="ol-description-toggle-btn"
                                                        aria-expanded={openDescriptionId === product.id}
                                                        aria-controls={`description-${product.id}`}
                                                    >
                                                        Details
                                                        {openDescriptionId === product.id ? (
                                                            <FaChevronUp />
                                                        ) : (
                                                            <FaChevronDown />
                                                        )}
                                                    </button>
                                                    <div
                                                        className={`ol-description-dropdown ${
                                                            openDescriptionId === product.id ? 'open' : ''
                                                        }`}
                                                        id={`description-${product.id}`}
                                                    >
                                                        <p className="ol-description-text">
                                                            {product.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="ol-price-cart-container">
                                                <p className="ol-product-price">
                                                    ₱{product.price.toFixed(2)}
                                                </p>
                                                <button
                                                    onClick={() => addToCart(product)}
                                                    className="ol-add-to-cart-btn"
                                                    disabled={product.stock === 0}
                                                >
                                                    <FaCartShopping />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {totalPages > 1 && (
                            <div className="ol-pagination-controls">
                                <button
                                    onClick={handlePrevPage}
                                    disabled={currentPage === 1}
                                >
                                    <FaChevronLeft />
                                </button>
                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages}
                                >
                                    <FaChevronRight />
                                </button>
                            </div>
                        )}
                    </div>
                </main>
                <aside
                    className={`ol-shopping-cart ${showCart ? 'ol-cart-visible' : 'ol-cart-hidden'}`}
                >
                    <h3>Your Cart</h3>
                    {cart.length === 0 ? (
                        <p>Cart is empty.</p>
                    ) : (
                        <>
                            <ul>
                                {cart.map((item) => (
                                    <li key={item.id} className="ol-cart-item">
                                        <div className="ol-cart-item-details">
                                            <span>{item.name}</span>
                                            <span>
                                                ₱{(item.price * item.quantity).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="ol-quantity-controls">
                                            <button onClick={() => updateCartQuantity(item.id, -1)}>
                                                -
                                            </button>
                                            <span>{item.quantity}</span>
                                            {/* ✅ FIXED: Plus button is disabled if the next quantity exceeds stock */}
                                            <button 
                                                onClick={() => updateCartQuantity(item.id, 1)}
                                                disabled={!canIncrement(item)}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <div className="ol-cart-total">
                                <strong>Total:</strong> ₱{calculateTotal()}
                            </div>
                            <button
                                onClick={openCheckoutModal}
                                className="ol-checkout-btn"
                                disabled={cart.length === 0 || isProcessing}
                            >
                                {isProcessing ? 'Processing...' : 'Checkout'}
                            </button>
                        </>
                    )}
                    {cartMessage && <div className="ol-cart-message">{cartMessage}</div>}
                </aside>
            </div>
            <CheckoutModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={processOrder}
                cart={cart}
                onlineCartTotal={calculateTotal()}
                checkoutType="online"
                scannedTableId={null}
                menuItems={products}
                customerId={customerId} // Passed down to the modal
            />
        </div>
    );
};

export default OnlineMenu;