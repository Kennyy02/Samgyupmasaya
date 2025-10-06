import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './CustomerAuth.css';
import CustomerTermsModal from './CustomerTerms'; 

// --- JWT DECODE HELPER (Replaces 'jwt-decode' library) ---
// This is a minimal function for demonstration purposes. 
// It safely decodes the payload portion of a JWT.
const minimalJwtDecode = (token) => {
    try {
        const payloadBase64 = token.split('.')[1];
        const payloadJson = atob(payloadBase64);
        return JSON.parse(payloadJson);
    } catch (e) {
        console.error("Failed to decode JWT manually:", e);
        return null;
    }
};

// --- CUSTOMER TERMS MODAL COMPONENT (Integrated) ---
/**
 * CustomerTermsModal: A full-screen overlay modal component to display
 * the Terms of Service and Privacy Policy. It uses Tailwind CSS.
 * @param {boolean} isOpen - Controls whether the modal is visible.
 * @param {function} onClose - Function to call when the modal is closed.
 */
const CustomerTermsModal = ({ isOpen, onClose }) => {
    // If the modal is not open, render nothing.
    if (!isOpen) return null;

    // Inline SVG for the close button
    const CloseIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );

    return (
        // Modal Backdrop (Clicking this closes the modal)
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 transition-opacity duration-300"
            onClick={onClose} 
        >
            {/* Modal Content Container */}
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-lg md:max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
                {/* Header: Sticky for easy access to the Close button */}
                <div className="sticky top-0 bg-gray-50 p-6 border-b border-gray-200 flex justify-between items-center z-10 rounded-t-xl">
                    <h3 className="text-2xl font-extrabold text-gray-800">Terms & Privacy Policy</h3>
                    <button 
                        onClick={onClose} 
                        className="text-gray-500 hover:text-gray-900 transition-colors duration-150 p-2 rounded-full hover:bg-gray-200"
                        aria-label="Close modal"
                    >
                        {CloseIcon}
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 md:p-8 space-y-6 text-gray-700">
                    <section>
                        <h4 className="text-xl font-bold text-gray-800 mb-3">1. Terms of Service</h4>
                        <p className="text-sm leading-relaxed">
                            Welcome to Samgyupmasaya! By creating an account, you agree to comply with and be bound by the following terms of use. All purchases made through the app are binding, and customers are responsible for ensuring their order details (table number, items, quantity) are correct before submission. We reserve the right to refuse service or cancel orders for any reason.
                        </p>
                    </section>
                    
                    <section>
                        <h4 className="text-xl font-bold text-gray-800 mb-3">2. Privacy Policy & Data Usage</h4>
                        <p className="text-sm leading-relaxed">
                            We collect personal information (name, email, username, and password) solely for the purpose of account registration, order processing, and communication regarding your orders. Your data is stored securely and will not be shared with third parties for marketing purposes.
                        </p>
                        <ul className="list-disc list-inside mt-3 text-sm space-y-1 ml-4">
                            <li>**Email:** Used for order notifications and password recovery.</li>
                            <li>**Table Code:** Used to identify your dining location for on-site orders.</li>
                            <li>**Security:** Your password is encrypted.</li>
                        </ul>
                        <p className="text-sm leading-relaxed mt-3">
                            By accepting, you consent to this data usage.
                        </p>
                    </section>

                    <section>
                        <h4 className="text-xl font-bold text-gray-800 mb-3">3. Governing Law</h4>
                        <p className="text-sm leading-relaxed">
                            These terms shall be governed and construed in accordance with the laws of the Republic of the Philippines, without regard to its conflict of law provisions.
                        </p>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end rounded-b-xl bg-gray-50">
                    <button 
                        onClick={onClose} 
                        className="px-6 py-2 bg-pink-600 text-white font-semibold rounded-lg shadow-md hover:bg-pink-700 transition duration-200"
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

    const AUTH_URL = process.env.REACT_APP_CUSTOMER_AUTH_API_URL;

    const passwordRules = [
        { regex: /.{8,}/, message: 'Password must be at least 8 characters' },
        { regex: /[A-Z]/, message: 'Password must contain at least 1 uppercase letter' },
        { regex: /[a-z]/, message: 'Password must contain at least 1 lowercase letter' },
        { regex: /[0-9]/, message: 'Password must contain at least 1 number' },
        { regex: /[^A-Za-z0-9]/, message: 'Password must contain at least 1 special character' },
    ];

    const showNotification = (message, type = 'error') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // Helper for basic email validation
    const isValidEmail = (email) => {
        return /\S+@\S+\.\S+/.test(email);
    };

    // Handler to open the modal
    const handleOpenTermsModal = (e) => {
        e.preventDefault(); 
        setIsTermsModalOpen(true);
    };

    // Handler to close the modal
    const handleCloseTermsModal = () => {
        setIsTermsModalOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

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

        try {
            const payload = { username, password };
            if (!isLogin) {
                payload.acceptPolicy = acceptPolicy;
                payload.firstName = firstName;
                payload.lastName = lastName;
                payload.middleInitial = middleInitial;
                payload.gmail = gmail;
            }

            const response = await axios.post(`${AUTH_URL}${endpoint}`, payload);

            if (isLogin) {
                const token = response.data.token;
                localStorage.setItem('customerToken', token);
                try {
                    // Using the integrated minimal decoder
                    const decodedToken = minimalJwtDecode(token);
                    if (decodedToken) {
                         localStorage.setItem('customerId', decodedToken.id);
                    }
                } catch (decodeError) {
                    console.error('Failed to decode JWT:', decodeError);
                }
                showNotification('Login successful!', 'success');
                setTimeout(() => navigate('/online-menu'), 1500);
            } else {
                showNotification('Registration successful! Please login.', 'success');
                setTimeout(() => setIsLogin(true), 1500);
            }
        } catch (error) {
            console.error('Auth error:', error);
            const errorMessage = error.response?.data?.message || 'Authentication failed. Please try again.';
            showNotification(errorMessage);
        }
    };

    const unmetRules = passwordRules.filter(rule => !rule.regex.test(password));

    // Tailwind classes and inline styles replace CustomerAuth.css
    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('/images/home_bg.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
        >
            {notification && (
                <div 
                    className={`fixed top-4 right-4 p-4 rounded-lg shadow-xl text-white font-bold transition-opacity duration-300 ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ zIndex: 1000 }}
                >
                    {notification.message}
                </div>
            )}

            <div className="bg-white p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-md backdrop-blur-sm bg-opacity-95">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">
                    {isLogin ? 'Welcome Back!' : 'Create Account'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Username */}
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
                        <input
                            type="text"
                            id="username"
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-pink-500 focus:border-pink-500 transition duration-150"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    {!isLogin && (
                        <>
                            {/* Email (Gmail) */}
                            <div>
                                <label htmlFor="gmail" className="block text-sm font-medium text-gray-700">Email (Required for notifications)</label>
                                <input
                                    type="email"
                                    id="gmail"
                                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-pink-500 focus:border-pink-500 transition duration-150"
                                    value={gmail}
                                    onChange={(e) => setGmail(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Name Row */}
                            <div className="flex space-x-2">
                                <div className="flex-1">
                                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-pink-500 focus:border-pink-500 transition duration-150"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="flex-1">
                                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
                                    <input
                                        type="text"
                                        id="lastName"
                                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-pink-500 focus:border-pink-500 transition duration-150"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Middle Initial */}
                            <div>
                                <label htmlFor="middleInitial" className="block text-sm font-medium text-gray-700">Middle Initial (Optional)</label>
                                <input
                                    type="text"
                                    id="middleInitial"
                                    maxLength="1"
                                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-pink-500 focus:border-pink-500 transition duration-150"
                                    value={middleInitial}
                                    onChange={(e) => setMiddleInitial(e.target.value.toUpperCase())}
                                />
                            </div>
                        </>
                    )}

                    {/* Password */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-pink-500 focus:border-pink-500 transition duration-150"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        {!isLogin && password && (
                            <div className="mt-2 text-xs space-y-1">
                                {unmetRules.length > 0 ? (
                                    <ul className="text-red-600 list-disc list-inside">
                                        {unmetRules.map((rule, index) => (
                                            <li key={index} className="opacity-80">
                                                {rule.message}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-green-600 font-semibold">
                                        Password strength: Strong <span className="text-sm">✓</span>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {!isLogin && (
                        <>
                            {/* Confirm Password */}
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-pink-500 focus:border-pink-500 transition duration-150"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                {confirmPassword && password !== confirmPassword && (
                                    <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
                                )}
                            </div>
                            
                            {/* Policy Check */}
                            <div className="flex items-start">
                                <input
                                    type="checkbox"
                                    id="acceptPolicy"
                                    checked={acceptPolicy}
                                    onChange={(e) => setAcceptPolicy(e.target.checked)}
                                    className="h-4 w-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500 mt-1"
                                />
                                <label htmlFor="acceptPolicy" className="ml-3 text-sm text-gray-600">
                                    I accept the 
                                    <a href="#" onClick={handleOpenTermsModal} className="text-pink-600 hover:text-pink-700 font-medium ml-1"> 
                                        Terms & Privacy Policy
                                    </a>
                                </label>
                            </div>
                        </>
                    )}

                    {/* Submit Button */}
                    <button 
                        type="submit" 
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-lg font-bold text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition duration-150 transform hover:scale-[1.01]"
                    >
                        {isLogin ? 'Login' : 'Sign Up'}
                    </button>
                </form>

                {/* Toggle Link */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <span 
                            onClick={() => setIsLogin(!isLogin)} 
                            className="text-pink-600 hover:text-pink-700 font-medium cursor-pointer ml-1"
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
