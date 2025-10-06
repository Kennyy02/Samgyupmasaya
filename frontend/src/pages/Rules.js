// src/pages/Rules.js
import React from 'react';
import './AboutUs.css';  // Optional for custom styles

const Rules = () => {
  return (
    <div className="rules-container">
      <h1>Restaurant Rules</h1>
      
      <h2>Online Orders</h2>
      <ul>
        <li>Orders are accepted during store hours only.</li>
        <li>Please double-check your order details before confirming.</li>
        <li>Payment must be completed before we process your order.</li>
        <li>Pick-up time will be confirmed once your order is ready.</li>
        <li>We do offer delivery and pick-up orders.</li>
        <li>No cancellations once the order is confirmed.</li>
        <li>Please claim your order within the agreed pick-up time to ensure freshness.</li>
      </ul>

      <h2>Onsite Orders</h2>
      <ul>
        <li> We accept orders only during store hours.</li>
        <li>Make sure your items and details are correct.</li>
        <li>We'll start prepping as soon as payment is confirmed.</li>
        <li>We'll let you know when your order is ready for serving.</li>
        <li>Orders can't be cancelled once confirmed.</li>
        <li>reshness is key, so please pick up as scheduled.</li>
      </ul>
    </div>
  );
};

export default Rules;
