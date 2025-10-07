// src/pages/OnlineMenu.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './OnlineMenuFresh.css';
import CheckoutModal from '../components/CheckoutModal';
import { jwtDecode } from 'jwt-decode';
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
  FaCircleCheck,
  FaCircleXmark,
} from 'react-icons/fa6';

// ✅ Use environment variables for Railway-deployed microservices
const PRODUCT_SERVICE_URL = process.env.REACT_APP_PRODUCT_API_URL;
const ORDER_SERVICE_URL = process.env.REACT_APP_ORDER_API_URL;

const OnlineMenu = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartMessage, setCartMessage] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState(null);
  const [openDescriptionId, setOpenDescriptionId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [customerId, setCustomerId] = useState(null);
  const [customerName, setCustomerName] = useState(null);
  const navigate = useNavigate();

  const productsPerPage = 8;

  // ✅ Decode token for customer details
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

    // ✅ Fetch products and categories using deployed API URLs
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

  // ✅ Handle pagination and category filters
  const filteredProducts =
    selectedCategoryId === 'all'
      ? products
      : products.filter((product) => product.category_id === selectedCategoryId);

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  const handleNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const handlePrevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  const getSelectedCategoryName = () => {
    if (selectedCategoryId === 'all') return 'All Products';
    const category = categories.find((cat) => cat.id === selectedCategoryId);
    return category ? category.name : 'Unknown Category';
  };

  // ✅ Add to cart handler with stock validation
  const addToCart = (product) => {
    if (product.stock === 0) {
      setCartMessage('Product is not available.');
      setTimeout(() => setCartMessage(''), 1500);
      return;
    }

    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        setCartMessage(`Cannot add more. Stock limit (${product.stock}) reached.`);
        setTimeout(() => setCartMessage(''), 1500);
        return;
      }
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }

    setCartMessage(`${product.name} added to cart.`);
    setTimeout(() => setCartMessage(''), 1500);
    setShowCart(true);
  };

  // ✅ Quantity control
  const updateCartQuantity = (productId, change) => {
    const productInMenu = products.find((p) => p.id === productId);
    const updatedCart = cart
      .map((item) => {
        if (item.id === productId) {
          const newQuantity = item.quantity + change;
          if (change > 0 && productInMenu && newQuantity > productInMenu.stock) {
            setCartMessage(`Stock limit (${productInMenu.stock}) reached.`);
            setTimeout(() => setCartMessage(''), 1500);
            return item;
          }
          return { ...item, quantity: newQuantity > 0 ? newQuantity : 0 };
        }
        return item;
      })
      .filter((item) => item.quantity > 0);
    setCart(updatedCart);
  };

  const calculateTotal = () =>
    cart.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2);

  const totalCartItems = cart.reduce((total, item) => total + item.quantity, 0);

  const toggleCart = () => setShowCart(!showCart);

  // ✅ Checkout handler
  const openCheckoutModal = () => {
    if (cart.length === 0) return alert('Your cart is empty.');
    if (!customerId) {
      alert('You must be logged in to place an online order.');
      navigate('/login');
      return;
    }
    setIsModalOpen(true);
  };

  // ✅ Place order (API request to ORDER service)
  const processOrder = async ({ customerId, address, contactNumber, paymentMethod }) => {
    setIsProcessing(true);
    if (!customerId) {
      setCheckoutMessage({
        type: 'error',
        message: 'Security Error: Missing customer ID. Please log in again.',
      });
      setIsProcessing(false);
      return;
    }

    try {
      let totalAmount = 0;
      for (const item of cart) {
        const categoryObj = categories.find((cat) => cat.id === item.category_id);
        const categoryName = categoryObj ? categoryObj.name : 'Uncategorized';
        const orderData = {
          customerId,
          address,
          contact_number: contactNumber,
          category: categoryName,
          product_name: item.name,
          quantity: item.quantity,
          price: item.price * item.quantity,
          payment_method: paymentMethod,
          status: 'Pending',
        };

        await axios.post(`${ORDER_SERVICE_URL}/orders/online`, orderData);
        totalAmount += item.price * item.quantity;
      }

      setCheckoutMessage({
        type: 'success',
        message: `Order placed successfully! Total: ₱${totalAmount.toFixed(2)}.`,
      });
      setCart([]);
      setShowCart(false);
      setIsModalOpen(false);
    } catch (error) {
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

  const closeCheckoutMessage = () => setCheckoutMessage(null);

  if (loading) return <div className="ol-loading">Loading menu...</div>;

  // ✅ UI Component for success/error popup
  const CheckoutMessagePopup = () => {
    if (!checkoutMessage) return null;
    const { type, message } = checkoutMessage;
    const icon = type === 'success' ? <FaCircleCheck /> : <FaCircleXmark />;
    const title = type === 'success' ? 'Order Confirmed!' : 'Order Failed';

    return (
      <div className="ol-checkout-popup-overlay">
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
      <CheckoutMessagePopup />
      <header className="ol-menu-topbar">
        <h2>SELECT FOOD TO ORDER</h2>
        <div className="ol-header-actions">
          <div className="ol-cart-icon-container" onClick={toggleCart}>
            <FaCartShopping className="ol-cart-icon" />
            {totalCartItems > 0 && <span className="ol-cart-count">{totalCartItems}</span>}
          </div>
          <button onClick={() => navigate('/')} className="ol-back-button">
            <FaHouse />
          </button>
        </div>
      </header>

      <div className={`ol-menu-layout ${showCart ? 'ol-cart-visible' : 'ol-cart-hidden'}`}>
        <aside className="ol-category-nav">
          <div className="ol-category-header-row">
            <h3>Select Categories</h3>
            <button
              className={`ol-all-products-btn ${
                selectedCategoryId === 'all' ? 'active' : ''
              }`}
              onClick={() => setSelectedCategoryId('all')}
            >
              <FaList /> All Menu
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
                <p>No products found.</p>
              ) : (
                currentProducts.map((product) => (
                  <div key={product.id} className="ol-item-card">
                    <img
                      src={
                        product.image_url.startsWith('http')
                          ? product.image_url
                          : `${PRODUCT_SERVICE_URL}${product.image_url}`
                      }
                      alt={product.name}
                      className="ol-item-img"
                    />
                    {product.stock === 0 && (
                      <div className="ol-unavailable-overlay">Not Available</div>
                    )}
                    <div className="ol-item-details">
                      <h4>{product.name}</h4>
                      {product.description && (
                        <>
                          <button
                            onClick={() =>
                              setOpenDescriptionId(
                                openDescriptionId === product.id ? null : product.id
                              )
                            }
                            className="ol-description-toggle-btn"
                          >
                            Details
                            {openDescriptionId === product.id ? (
                              <FaChevronUp />
                            ) : (
                              <FaChevronDown />
                            )}
                          </button>
                          {openDescriptionId === product.id && (
                            <p className="ol-description-text">{product.description}</p>
                          )}
                        </>
                      )}
                      <div className="ol-price-cart-container">
                        <p className="ol-product-price">₱{product.price.toFixed(2)}</p>
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
                <button onClick={handlePrevPage} disabled={currentPage === 1}>
                  <FaChevronLeft />
                </button>
                <button onClick={handleNextPage} disabled={currentPage === totalPages}>
                  <FaChevronRight />
                </button>
              </div>
            )}
          </div>
        </main>

        <aside className="ol-shopping-cart">
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
                      <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    <div className="ol-quantity-controls">
                      <button onClick={() => updateCartQuantity(item.id, -1)}>-</button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.id, 1)}
                        disabled={item.quantity >= item.stock}
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
                disabled={isProcessing}
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
        customerId={customerId}
      />
    </div>
  );
};

export default OnlineMenu;
