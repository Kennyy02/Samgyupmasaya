import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// --- CSS Import Re-Added ---
import './CustomerAuth.css'; 

// --- CONFIGURATION ---
// IMPORTANT: Use the environment variable defined in your Railway settings.
// This variable MUST be set on your frontend service to point to the customer-auth-service.
const CUSTOMER_AUTH_API_URL = process.env.REACT_APP_CUSTOMER_AUTH_API_URL; 


// --- JWT DECODE HELPER (Replaces 'jwt-decode' library) ---
/**
 * Decodes the payload portion of a JWT.
 * @param {string} token - The JWT string.
 * @returns {object|null} - The decoded payload object or null on failure.
 */
const minimalJwtDecode = (token) => {
    try {
        const payloadBase64 = token.split('.')[1];
        // Ensure base64 string is properly padded for atob()
        const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        const padding = '='.repeat((4 - base64.length % 4) % 4);
        const payloadJson = atob(base64 + padding);
        return JSON.parse(payloadJson);
    } catch (e) {
        console.error("Failed to decode JWT manually:", e);
        return null;
    }
};

// --- CUSTOMER TERMS MODAL COMPONENT (Integrated) ---
const CustomerTermsModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const CloseIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="modal-close-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );

    return (
        <div 
            className="modal-backdrop"
            onClick={onClose} 
        >
            <div 
                className="modal-content"
                onClick={(e) => e.stopPropagation()} 
            >
                <div className="modal-header">
                    <h3 className="modal-title">Terms & Privacy Policy</h3>
                    <button 
                        onClick={onClose} 
                        className="modal-close-button"
                        aria-label="Close modal"
                    >
                        {CloseIcon}
                    </button>
                </div>

                <div className="modal-body">
                    <section>
                        <h4 className="modal-section-title">1. Terms of Service</h4>
                        <p className="modal-text">
                            Welcome to Samgyupmasaya! By creating an account, you agree to comply with and be bound by the following terms of use. All purchases made through the app are binding, and customers are responsible for ensuring their order details (table number, items, quantity) are correct before submission. We reserve the right to refuse service or cancel orders for any reason.
                        </p>
                    </section>
                    
                    <section>
                        <h4 className="modal-section-title">2. Privacy Policy & Data Usage</h4>
                        <p className="modal-text">
                            We collect personal information (name, email, username, and password) solely for the purpose of account registration, order processing, and communication regarding your orders. Your data is stored securely and will not be shared with third parties for marketing purposes.
                        </p>
                        <ul className="modal-list">
                            <li>**Email:** Used for order notifications and password recovery.</li>
                            <li>**Table Code:** Used to identify your dining location for on-site orders.</li>
                            <li>**Security:** Your password is encrypted.</li>
                        </ul>
                        <p className="modal-text">
                            By accepting, you consent to this data usage.
                        </p>
                    </section>

                    <section>
                        <h4 className="modal-section-title">3. Governing Law</h4>
                        <p className="modal-text">
                            These terms shall be governed and construed in accordance with the laws of the Republic of the Philippines, without regard to its conflict of law provisions.
                        </p>
                    </section>
                </div>

                <div className="modal-footer">
                    <button 
                        onClick={onClose} 
                        className="modal-accept-button"
                    >
                        Close & Accept
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- CUSTOMER AUTH COMPONENT (Main Application) ---
const CustomerAuth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [middleInitial, setMiddleInitial] = useState('');
    const [gmail, setGmail] = useState('');
    const [acceptPolicy, setAcceptPolicy] = useState(false);
    const [notification, setNotification] = useState(null);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false); 

    const navigate = useNavigate();

    const showNotification = (message, type = 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const passwordRules = [
        { regex: /.{8,}/, message: 'Password must be at least 8 characters' },
        { regex: /[A-Z]/, message: 'Password must contain at least 1 uppercase letter' },
        { regex: /[a-z]/, message: 'Password must contain at least 1 lowercase letter' },
        { regex: /[0-9]/, message: 'Password must contain at least 1 number' },
        { regex: /[^A-Za-z0-9]/, message: 'Password must contain at least 1 special character' },
    ];

    const isValidEmail = (email) => {
        return /\S+@\S+\.\S+/.test(email);
    };

    const handleOpenTermsModal = (e) => {
        e.preventDefault(); 
        setIsTermsModalOpen(true);
    };

    const handleCloseTermsModal = () => {
        setIsTermsModalOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // --- VALIDATION CHECKS ---
        if (!isLogin) {
            const allRulesMet = passwordRules.every(rule => rule.regex.test(password));
            if (!allRulesMet) return showNotification('Please complete all password requirements.');
            if (password !== confirmPassword) return showNotification('Passwords do not match.');
            if (!acceptPolicy) return showNotification('You must accept the Terms & Privacy Policy.');
            if (!firstName.trim() || !lastName.trim()) return showNotification('First and Last Name are required.');
            if (!username.trim()) return showNotification('Username is required.');
            if (!gmail.trim() || !isValidEmail(gmail)) return showNotification('A valid email is required.');
        }

        const endpoint = isLogin ? '/login' : '/register';
        const url = `${CUSTOMER_AUTH_API_URL}${endpoint}`;

        if (!CUSTOMER_AUTH_API_URL) {
            return showNotification("API URL not configured! Check REACT_APP_CUSTOMER_AUTH_API_URL in your environment.", 'error');
        }

        try {
            const payload = { username, password };
            if (!isLogin) {
                payload.acceptPolicy = acceptPolicy;
                payload.firstName = firstName;
                payload.lastName = lastName;
                payload.middleInitial = middleInitial;
                payload.gmail = gmail;
            }

            const response = await axios.post(url, payload);

            if (isLogin) {
                const token = response.data.token;
                localStorage.setItem('customerToken', token);
                
                // Decode token to store user ID
                const decodedToken = minimalJwtDecode(token);
                if (decodedToken && decodedToken.id) {
                     localStorage.setItem('customerId', decodedToken.id);
                } else {
                     console.warn('Could not decode user ID from token.');
                }
                
                showNotification('Login successful!', 'success');
                setTimeout(() => navigate('/online-menu'), 1500);
            } else {
                showNotification('Registration successful! Please login.', 'success');
                // Reset form fields after successful registration (except username/password for easy login)
                setFirstName('');
                setLastName('');
                setMiddleInitial('');
                setGmail('');
                setAcceptPolicy(false);
                setTimeout(() => setIsLogin(true), 1500);
            }
        } catch (error) {
            console.error('Auth error:', error);
            // Handle Network Error specifically for better user feedback
            if (error.code === 'ERR_NETWORK') {
                showNotification('Network Error: Could not reach the authentication service. Check your API URL configuration.', 'error');
            } else {
                const errorMessage = error.response?.data?.message || 'Authentication failed. Please try again.';
                showNotification(errorMessage);
            }
        }
    };

    const unmetRules = passwordRules.filter(rule => !rule.regex.test(password));

    return (
        <div className="auth-container">
            {notification && (
                <div 
                    className={`notification ${notification.type === 'success' ? 'success' : 'error'}`}
                >
                    {notification.message}
                </div>
            )}

            <div className="auth-card">
                <h2 className="auth-title">
                    {isLogin ? 'Customer Login' : 'Create Customer Account'}
                </h2>
                
                <form onSubmit={handleSubmit} className="auth-form">
                    {/* Username */}
                    <div>
                        <label htmlFor="username" className="auth-label">Username</label>
                        <input
                            type="text"
                            id="username"
                            className="auth-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    {!isLogin && (
                        <>
                            {/* Email (Gmail) */}
                            <div>
                                <label htmlFor="gmail" className="auth-label">Email (Required)</label>
                                <input
                                    type="email"
                                    id="gmail"
                                    className="auth-input"
                                    value={gmail}
                                    onChange={(e) => setGmail(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Name Row */}
                            <div className="name-row">
                                <div className="name-field">
                                    <label htmlFor="firstName" className="auth-label">First Name</label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        className="auth-input"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="name-field">
                                    <label htmlFor="lastName" className="auth-label">Last Name</label>
                                    <input
                                        type="text"
                                        id="lastName"
                                        className="auth-input"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Middle Initial */}
                            <div>
                                <label htmlFor="middleInitial" className="auth-label">Middle Initial (Optional)</label>
                                <input
                                    type="text"
                                    id="middleInitial"
                                    maxLength="1"
                                    className="auth-input"
                                    value={middleInitial}
                                    onChange={(e) => setMiddleInitial(e.target.value.toUpperCase())}
                                />
                            </div>
                        </>
                    )}

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="auth-label">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="auth-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        {!isLogin && password && (
                            <div className="password-rules-container">
                                {unmetRules.length > 0 ? (
                                    <ul className="password-rules error">
                                        {unmetRules.map((rule, index) => (
                                            <li key={index} className="password-rule-item">
                                                {rule.message}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="password-rules success">
                                        Password strength: Strong <span className="check-mark">✓</span>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {!isLogin && (
                        <>
                            {/* Confirm Password */}
                            <div>
                                <label htmlFor="confirmPassword" className="auth-label">Confirm Password</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    className="auth-input"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                {confirmPassword && password !== confirmPassword && (
                                    <p className="password-match-error">Passwords do not match.</p>
                                )}
                            </div>
                            
                            {/* Policy Check */}
                            <div className="policy-check">
                                <input
                                    type="checkbox"
                                    id="acceptPolicy"
                                    checked={acceptPolicy}
                                    onChange={(e) => setAcceptPolicy(e.target.checked)}
                                    className="policy-checkbox"
                                />
                                <label htmlFor="acceptPolicy" className="policy-label">
                                    I accept the 
                                    <a href="#" onClick={handleOpenTermsModal} className="policy-link"> 
                                        Terms & Privacy Policy
                                    </a>
                                </label>
                            </div>
                        </>
                    )}

                    {/* Submit Button */}
                    <button 
                        type="submit" 
                        className="auth-submit-button"
                    >
                        {isLogin ? 'Login' : 'Sign Up'}
                    </button>
                </form>

                {/* Toggle Link */}
                <div className="auth-toggle-container">
                    <p className="auth-toggle-text">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <span 
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setPassword('');
                                setConfirmPassword('');
                            }} 
                            className="auth-toggle-link"
                        >
                            {isLogin ? 'Sign Up here' : 'Login here'}
                        </span>
                    </p>
                </div>
            </div>

            {/* RENDER the Modal Component */}
            <CustomerTermsModal 
                isOpen={isTermsModalOpen} 
                onClose={handleCloseTermsModal} 
            />

        </div>
    );
};

export default CustomerAuth;
