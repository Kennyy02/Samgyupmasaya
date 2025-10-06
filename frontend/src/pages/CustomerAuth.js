import React, { useState } from 'react';

import axios from 'axios';

import { useNavigate } from 'react-router-dom';

import './CustomerAuth.css';

import home_bg from '../images/home_bg.png';

import { jwtDecode } from 'jwt-decode';

// 1. IMPORT the new Modal Component

import CustomerTermsModal from './CustomerTerms'; 



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

    

    // 2. NEW STATE: To control the visibility of the Terms Modal

    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false); 



    const navigate = useNavigate();



    // ✅ Change 1: Replace hardcoded URL with the environment variable

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

        // Prevent the default link action (navigating)

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

            if (!gmail.trim() || !isValidEmail(gmail)) return showNotification('A valid email (Gmail) is required.');

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



            // ✅ Change 2: Use the dynamic AUTH_URL variable

            const response = await axios.post(`${AUTH_URL}${endpoint}`, payload);



            if (isLogin) {

                const token = response.data.token;

                localStorage.setItem('customerToken', token);

                try {

                    const decodedToken = jwtDecode(token);

                    localStorage.setItem('customerId', decodedToken.id);

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

            // Check for custom error message from backend

            const errorMessage = error.response?.data?.message || 'Authentication failed. Please try again.';

            showNotification(errorMessage);

        }

    };



    const unmetRules = passwordRules.filter(rule => !rule.regex.test(password));



    return (

        <div

            className="customer-auth-container"

            style={{

                backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${home_bg})`,

                backgroundSize: 'cover',

                backgroundPosition: 'center'

            }}

        >

            {notification && (

                <div className={`notification ${notification.type}`}>

                    {notification.message}

                </div>

            )}



            <div className="auth-box">

                <h2>{isLogin ? 'Login Here' : 'Sign Up Here'}</h2>

                <form onSubmit={handleSubmit}>

                    <div className="user">

                        <label htmlFor="username">Username</label>

                        <input

                            type="text"

                            id="username"

                            value={username}

                            onChange={(e) => setUsername(e.target.value)}

                            required

                        />

                    </div>



                    {!isLogin && (

                        <>

                            <div className="form-row">

                                <div className="user full">

                                    <label htmlFor="gmail">Email ( Allow Order Notifications)</label>

                                    <input

                                        type="email"

                                        id="gmail"

                                        value={gmail}

                                        onChange={(e) => setGmail(e.target.value)}

                                        required

                                    />

                                </div>

                            </div>



                            <div className="form-row">

                                <div className="user half">

                                    <label htmlFor="firstName">First Name</label>

                                    <input

                                        type="text"

                                        id="firstName"

                                        value={firstName}

                                        onChange={(e) => setFirstName(e.target.value)}

                                        required

                                    />

                                </div>

                                <div className="user half">

                                    <label htmlFor="lastName">Last Name</label>

                                    <input

                                        type="text"

                                        id="lastName"

                                        value={lastName}

                                        onChange={(e) => setLastName(e.target.value)}

                                        required

                                    />

                                </div>

                            </div>



                            <div className="form-row">

                                <div className="user half">

                                    <label htmlFor="middleInitial">Middle Initial</label>

                                    <input

                                        type="text"

                                        id="middleInitial"

                                        maxLength="1"

                                        value={middleInitial}

                                        onChange={(e) => setMiddleInitial(e.target.value)}

                                    />

                                </div>

                            </div>

                        </>

                    )}



                    <div className="pass">

                        <label htmlFor="password">Password</label>

                        <input

                            type="password"

                            id="password"

                            value={password}

                            onChange={(e) => setPassword(e.target.value)}

                            required

                        />

                        {!isLogin && password && (

                            <div className="password-feedback">

                                {unmetRules.length > 0 ? (

                                    <ul className="password-rules-list">

                                        {unmetRules.map((rule, index) => (

                                            <li key={index} className="invalid">

                                                {rule.message}

                                            </li>

                                        ))}

                                    </ul>

                                ) : (

                                    <p className="password-strong-text">

                                        Password requirements fulfilled. <span className="check-icon">✔</span>

                                    </p>

                                )}

                        )}

                    </div>



                    {!isLogin && (

                        <>

                            <div className="pass">

                                <label htmlFor="confirmPassword">Confirm Password</label>

                                <input

                                    type="password"

                                    id="confirmPassword"

                                    value={confirmPassword}

                                    onChange={(e) => setConfirmPassword(e.target.value)}

                                    required

                                />

                            </div>

                            <div className="policy-check">

                                <input

                                    type="checkbox"

                                    id="acceptPolicy"

                                    checked={acceptPolicy}

                                    onChange={(e) => setAcceptPolicy(e.target.checked)}

                                />

                                <label htmlFor="acceptPolicy">

                                    {/* 3. MODIFICATION: Link now calls handleOpenTermsModal instead of navigating */}

                                    I accept the 

                                    <a href="#" onClick={handleOpenTermsModal} className="toggle-link"> 

                                        &nbsp;Terms & Privacy Policy

                                    </a>

                                </label>

                            </div>

                        </>

                    )}



                    <button type="submit" className="auth-button">

                        {isLogin ? 'Login' : 'Sign Up'}

                    </button>

                </form>



                <div className="auth-toggle">

                    <p>

                        {isLogin ? "Don't have an account?" : "Already have an account?"}

                        <span onClick={() => setIsLogin(!isLogin)} className="toggle-link">

                            {isLogin ? ' Sign Up here' : ' Login here'}

                        </span>

                    </p>

                </div>

            </div>



            {/* 4. RENDER the Modal Component */}

            <CustomerTermsModal 

                isOpen={isTermsModalOpen} 

                onClose={handleCloseTermsModal} 

            />



        </div>

    );

};



export default CustomerAuth;
