// src/pages/CustomerHome.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CustomerHome.css';
import home_bg from '../images/home_bg.png';
import logo from '../images/logo.png'; // Make sure this path is correct

const CustomerHome = () => {
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false); // State for hamburger menu

    const handleOrderNow = () => {
        // Redirect to the customer authentication page for online orders
        navigate('/customer/auth');
    };

    const handleScanNow = () => {
        // Redirect to the QR code scanning page for onsite orders
        navigate('/scan-qr');
    };

    const handleDropdownToggle = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };
    
    // Function to toggle the hamburger menu state
    const handleMenuToggle = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <div 
            className="customer-home-container"
            style={{ backgroundImage: `url(${home_bg})` }}
        >
            {/* New top bar with logo on the left and links on the right */}
            <div className="top-bar">
                {/* Left side: Logo and Restaurant Name */}
                <div className="top-bar-left">
                    <img src={logo} alt="SamgyupMasaya Logo" className="restaurant-logo" />
                    <h2 className="restaurant-name">SamgyupMasaya</h2>
                </div>
                
                {/* Right side: Navigation and Social Media Links */}
                {/* Desktop links - hidden on mobile via CSS */}
                <div className="top-bar-right">
                    <a href="/about-us" className="top-bar-link">About Us</a>
                    <a href="/rules" className="top-bar-link">Rules</a>

                    {/* New dropdown for "Visit Us" links */}
                    <div className="dropdown-container">
                        <button onClick={handleDropdownToggle} className="dropdown-button">
                            Visit Us
                        </button>
                        {isDropdownOpen && (
                            <div className="dropdown-menu">
                                <a href="https://www.facebook.com/samgyupmasaya" target="_blank" rel="noopener noreferrer" className="dropdown-item">
                                    Facebook
                                </a>
                                <a href="https://www.instagram.com/samgyupmasaya" target="_blank" rel="noopener noreferrer" className="dropdown-item">
                                    Instagram
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Hamburger menu for mobile view */}
                <div className="mobile-menu-container">
                    <input type="checkbox" id="menu-toggle" checked={isMenuOpen} onChange={handleMenuToggle} />
                    <label htmlFor="menu-toggle" className="hamburger-label">
                        <span className="hamburger-icon"></span>
                    </label>
                    {isMenuOpen && (
                        <div className="mobile-menu">
                            <a href="/about-us" className="mobile-menu-item">About Us</a>
                            <a href="/rules" className="mobile-menu-item">Rules</a>

                            <div className="dropdown-container-mobile">
                                <button onClick={handleDropdownToggle} className="dropdown-button-mobile">
                                    Visit Us
                                </button>
                                {isDropdownOpen && (
                                    <div className="dropdown-menu-mobile">
                                        <a href="https://www.facebook.com/samgyupmasaya" target="_blank" rel="noopener noreferrer" className="dropdown-item">
                                            Facebook
                                        </a>
                                        <a href="https://www.instagram.com/samgyupmasaya" target="_blank" rel="noopener noreferrer" className="dropdown-item">
                                            Instagram
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

            </div>
            
            {/* The main content header */}
            <header className="customer-header">
                <h1>Taste the Difference!</h1>
                <p>Order online for delivery or scan our QR code for in-store dining. <br/>Your next great meal is just a tap away.</p>
            </header>

            {/* The main content buttons */}
            <main className="order-options">
                <button 
                    className="order-button online-order" 
                    onClick={handleOrderNow}
                >
                    Order Here
                </button>
                
                <button 
                    className="order-button onsite-order" 
                    onClick={handleScanNow}
                >
                    Scan Here
                </button>
            </main>
        </div>
    );
};

export default CustomerHome;
