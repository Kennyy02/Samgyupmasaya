import React, { useState, useEffect } from 'react';
import './CheckoutModal.css';

// Get the base URL for the customer service from environment variables
const CUSTOMER_AUTH_API_URL = process.env.REACT_APP_CUSTOMER_AUTH_API_URL;

export default function CheckoutModal({
  isOpen,
  onClose,
  onSubmit, // This function is where the final payload is sent to the backend
  cart,
  onlineCartTotal,
  checkoutType,
  scannedTableId,
  menuItems,
  customerId, // <-- Passed in from the parent component
}) {
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [editingAddress, setEditingAddress] = useState(true);
  const [delivery, setDelivery] = useState({ fullName: '', fullAddress: '', contact: '' });
  const [numberOfPersons, setNumberOfPersons] = useState(1);
  const [hasUnlimitedRates, setHasUnlimitedRates] = useState(false);
  const [finalTotal, setFinalTotal] = useState(0);

  // Load saved addresses from the database when the modal opens
  useEffect(() => {
    async function fetchAddresses() {
      if (!isOpen || !customerId || !CUSTOMER_AUTH_API_URL) return;
      try {
        // FIX: Replaced hardcoded URL with environment variable
        const response = await fetch(`${CUSTOMER_AUTH_API_URL}/customer/${customerId}/addresses`);
        if (!response.ok) throw new Error('Failed to fetch addresses');
        const saved = await response.json();
        setAddresses(saved);
        if (saved.length > 0) {
          const last = saved[0];
          setSelectedAddressId(last.id);
          setDelivery({
            fullName: last.full_name,
            fullAddress: last.full_address,
            contact: last.contact_number,
          });
          setEditingAddress(false);
        } else {
          resetDelivery();
        }
      } catch (err) {
        console.error('Error fetching addresses:', err);
      }
    }
    fetchAddresses();
    setCustomerName('');
    setNumberOfPersons(1);
    setPaymentMethod(checkoutType === 'online' ? 'Cash on Delivery' : 'Cash');
  }, [isOpen, checkoutType, customerId]);

  // Update delivery form when a different saved address is selected
  useEffect(() => {
    const current = addresses.find((a) => a.id === selectedAddressId);
    if (current) {
      setDelivery({
        fullName: current.full_name,
        fullAddress: current.full_address,
        contact: current.contact_number,
      });
      setEditingAddress(false);
    }
  }, [selectedAddressId, addresses]);

  // Calculate totals and handle “Unlimited Rates”
  useEffect(() => {
    if (!isOpen || !cart?.length) {
      setFinalTotal(0);
      setHasUnlimitedRates(false);
      return;
    }
    if (checkoutType === 'online') {
      setFinalTotal(parseFloat(onlineCartTotal));
      setHasUnlimitedRates(false);
      return;
    }
    const unlimited = cart.some(
      (c) => menuItems.find((m) => m.id === c.id)?.category_name === 'Unlimited Rates'
    );
    setHasUnlimitedRates(unlimited);
    let total = 0;
    if (unlimited) {
      const highestUnlimited = cart
        .filter((c) => menuItems.find((m) => m.id === c.id)?.category_name === 'Unlimited Rates')
        .reduce((max, item) => Math.max(max, item.price), 0);
      total += highestUnlimited * numberOfPersons;
      total += cart
        .filter((c) => menuItems.find((m) => m.id === c.id)?.category_name !== 'Unlimited Rates')
        .reduce((sum, i) => sum + i.price * i.quantity, 0);
    } else {
      total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    }
    setFinalTotal(total);
  }, [cart, numberOfPersons, checkoutType, onlineCartTotal, isOpen, menuItems]);

  const resetDelivery = () => setDelivery({ fullName: '', fullAddress: '', contact: '' });

  const handleApplyAddress = async () => {
    const { fullName, fullAddress, contact } = delivery;
    if (!fullName || !fullAddress || !contact) {
      // Replace alert with a better UI component in a final app!
      alert('Please complete all required delivery fields.');
      return;
    }
    if (!customerId) {
      alert('You must be logged in to save an address.');
      return;
    }
    if (!CUSTOMER_AUTH_API_URL) {
        console.error('CUSTOMER_AUTH_API_URL is not set.');
        alert('Configuration error: Cannot save address.');
        return;
    }
    try {
        // FIX: Replaced hardcoded URL with environment variable
      const response = await fetch(`${CUSTOMER_AUTH_API_URL}/customer/${customerId}/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, fullAddress, contact }),
      });
      if (!response.ok) throw new Error('Failed to save address');
      const result = await response.json();
      const newAddr = {
        id: result.id,
        full_name: fullName,
        full_address: fullAddress,
        contact_number: contact,
      };
      const updated = [newAddr, ...addresses];
      setAddresses(updated);
      setSelectedAddressId(newAddr.id);
      setEditingAddress(false);
    } catch (err) {
      console.error('Error saving address:', err);
      alert('Failed to save address. Please try again.');
    }
  };

  const handleAddNewAddress = () => {
    resetDelivery();
    setSelectedAddressId(null);
    setEditingAddress(true);
  };

  const handleDeleteAddress = async (idToDelete) => {
    if (!CUSTOMER_AUTH_API_URL) {
        console.error('CUSTOMER_AUTH_API_URL is not set.');
        alert('Configuration error: Cannot delete address.');
        return;
    }
    try {
        // FIX: Replaced hardcoded URL with environment variable
      const response = await fetch(`${CUSTOMER_AUTH_API_URL}/customer/addresses/${idToDelete}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete address');
      const updatedAddresses = addresses.filter((addr) => addr.id !== idToDelete);
      setAddresses(updatedAddresses);
      if (selectedAddressId === idToDelete) {
        if (updatedAddresses.length > 0) {
          setSelectedAddressId(updatedAddresses[0].id);
          setDelivery({
            fullName: updatedAddresses[0].full_name,
            fullAddress: updatedAddresses[0].full_address,
            contact: updatedAddresses[0].contact_number,
          });
        } else {
          setSelectedAddressId(null);
          resetDelivery();
          setEditingAddress(true);
        }
      }
    } catch (err) {
      console.error('Error deleting address:', err);
      alert('Failed to delete address. Please try again.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submittedCart = JSON.parse(JSON.stringify(cart));

    if (checkoutType === 'onsite' && hasUnlimitedRates) {
      submittedCart.forEach((item) => {
        const original = menuItems.find((m) => m.id === item.id);
        if (original?.category_name === 'Unlimited Rates') {
          item.price = parseFloat(original.price) * numberOfPersons;
        }
      });
    }

    if (checkoutType === 'online') {
      if (!customerId) {
        alert('Error: Customer ID is missing. Please log in again.');
        return;
      }
      if (!delivery.fullName || !delivery.fullAddress || !delivery.contact) {
        alert('Please complete all delivery fields.');
        return;
      }
      onSubmit({
        customerId: customerId,
        customerName: delivery.fullName,
        address: delivery.fullAddress,
        contactNumber: delivery.contact,
        paymentMethod,
        cart: submittedCart,
        finalTotal,
        orderType: 'online',
      });
    } else {
      if (!customerName.trim()) {
        alert('Please fill in the full name.');
        return;
      }
      if (hasUnlimitedRates && numberOfPersons < 1) {
        alert('Please specify the number of persons.');
        return;
      }
      onSubmit({
        customerName,
        numberOfPersons: hasUnlimitedRates ? parseInt(numberOfPersons, 10) : null,
        paymentMethod,
        scannedTableId,
        cart: submittedCart,
        finalTotal,
        orderType: 'onsite',
      });
    }
    onClose();
  };

  if (!isOpen) return null;
  const currentAddress = addresses.find((a) => a.id === selectedAddressId) || delivery;

  return (
    <div className="modal-overlay">
      <div className="checkout-modal">
        <div className="modal-header">
          <h2>
            {checkoutType === 'online' ? 'Online Order Checkout' : 'Onsite Order Checkout'}
          </h2>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="order-summary">
            <h3>Order Summary</h3>
            {checkoutType === 'onsite' && (
              <p>
                Table Number: <strong>{scannedTableId || 'N/A'}</strong>
              </p>
            )}
            <ul>
              {cart.map((item) => (
                <li key={item.id}>
                  {item.name} x {item.quantity}
                  <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="customer-info-section">
            <h3>Customer Information</h3>
            {checkoutType === 'online' && (
              <>
                {addresses.length > 0 && !editingAddress && (
                  <div className="address-selector-container">
                    <label>Select Saved Address:</label>
                    <select
                      value={selectedAddressId || ''}
                      onChange={(e) => setSelectedAddressId(Number(e.target.value))}
                    >
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.full_name} - {a.full_address}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {!editingAddress && currentAddress && (
                  <div className="fixed-info">
                    <p>
                      <strong>{currentAddress.full_name}</strong>
                      <br />
                      {currentAddress.full_address}
                      <br />
                      Contact: {currentAddress.contact_number}
                    </p>
                    <button type="button" className="edit-button" onClick={() => setEditingAddress(true)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => handleDeleteAddress(currentAddress.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
                {editingAddress && (
                  <div className="delivery-form">
                    <FormInput
                      label="Full Name *"
                      value={delivery.fullName}
                      onChange={(v) => setDelivery({ ...delivery, fullName: v })}
                    />
                    <FormTextarea
                      label="Address * (Street, Barangay, City, Province)"
                      value={delivery.fullAddress}
                      onChange={(v) => setDelivery({ ...delivery, fullAddress: v })}
                    />
                    <FormInput
                      label="Contact Number *"
                      value={delivery.contact}
                      onChange={(v) => setDelivery({ ...delivery, contact: v })}
                    />
                    <button type="button" className="apply-address-btn" onClick={handleApplyAddress}>
                      Save Address
                    </button>
                  </div>
                )}
                {addresses.length > 0 && (
                  <button type="button" className="add-address-btn" onClick={handleAddNewAddress}>
                    + Add New Address
                  </button>
                )}
              </>
            )}
            {checkoutType === 'onsite' && (
              <FormInput label="Full Name:" value={customerName} onChange={setCustomerName} required />
            )}
            {checkoutType === 'onsite' && hasUnlimitedRates && (
              <FormInput
                label="Number of Persons at Table:"
                type="number"
                value={numberOfPersons}
                min={1}
                onChange={(v) => setNumberOfPersons(Math.max(1, parseInt(v) || 1))}
              />
            )}
            <div className="form-group">
              <label>Payment Method:</label>
              {checkoutType === 'online' ? (
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} required>
                  <option value="Cash on Delivery">Cash on Delivery</option>
                  <option value="Gcash">Gcash</option>
                </select>
              ) : (
                <div className="payment-options-radio">
                  {['Cash', 'GCash'].map((opt) => (
                    <label key={opt}>
                      <input
                        type="radio"
                        value={opt}
                        checked={paymentMethod === opt}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="modal-total">
            <strong>Total: ₱{finalTotal.toFixed(2)}</strong>
          </div>
          <button type="submit" className="submit-order-btn">
            {checkoutType === 'online' ? 'Place Online Order' : 'Confirm Onsite Order'}
          </button>
        </form>
      </div>
    </div>
  );
}

function FormInput({ label, type = 'text', value, onChange, ...props }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} {...props} />
    </div>
  );
}

function FormTextarea({ label, value, onChange, ...props }) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} {...props} />
    </div>
  );
}
