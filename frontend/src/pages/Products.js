// src/pages/Products.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Products.css';
import { FaEdit, FaTimes, FaPlus, FaTrash, FaArrowLeft, FaArrowRight } from 'react-icons/fa';

const Products = () => {
    const [onlineProducts, setOnlineProducts] = useState([]);
    const [onsiteProducts, setOnsiteProducts] = useState([]);
    const [productType, setProductType] = useState('all');
    const [categories, setCategories] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newProduct, setNewProduct] = useState({
        name: '',
        price: '',
        stock: '',
        category_name: '',
        description: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);

    // Pagination states
    const [onlinePage, setOnlinePage] = useState(1);
    const [onsitePage, setOnsitePage] = useState(1);
    const PRODUCTS_PER_PAGE = 5;

    // ✅ FIXED: Add a fallback/default URL for the base URL
    const BASE_URL = process.env.REACT_APP_PRODUCT_API_URL || 'http://localhost:5002'; 
    const PRODUCTS_ENDPOINT = `${BASE_URL}/products`;
    const CATEGORY_ENDPOINT = `${BASE_URL}/categories`;
    
    // Assuming the product service serves images from its base URL (e.g., http://localhost:5002)
    const IMAGE_BASE_URL = BASE_URL;
    // ---------------------------------------------------------------------------------

    // --- Data Fetching Functions ---
    const fetchProducts = async () => {
        try {
            // Correctly uses the full endpoint: http://.../products/online
            const onlineRes = await axios.get(`${PRODUCTS_ENDPOINT}/online`);
            const onsiteRes = await axios.get(`${PRODUCTS_ENDPOINT}/onsite`);
            setOnlineProducts(onlineRes.data);
            setOnsiteProducts(onsiteRes.data);
        } catch (error) {
            console.error(`Error fetching products:`, error);
            // Added an alert for better user feedback
            alert('Error fetching products. Check if Product Service is running.');
        }
    };

    const fetchCategories = async () => {
        try {
            // Correctly uses the full endpoint: http://.../categories
            const res = await axios.get(CATEGORY_ENDPOINT);
            setCategories(res.data);
        } catch (error) {
            console.error("Error fetching categories:", error);
            alert('Error fetching categories. Check if Product Service is running.');
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    // --- Form Input and File Handlers ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewProduct(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const resetForm = () => {
        setNewProduct({
            name: '',
            price: '',
            stock: '',
            category_name: '',
            description: ''
        });
        setSelectedFile(null);
        setEditingProduct(null);
        setShowAddForm(false);
    };

    // --- Add Product Handler ---
    const handleAddProduct = async (e) => {
        e.preventDefault();

        if (productType === 'all') {
            alert("Please select either 'Online Products' or 'Onsite Products' to add a product.");
            return;
        }

        if (!selectedFile) {
            alert("Please select an image for the product.");
            return;
        }

        const formData = new FormData();
        formData.append('name', newProduct.name);
        formData.append('price', newProduct.price);
        formData.append('stock', newProduct.stock);
        // ✅ FIX: Always append category_name and description, even if empty
        formData.append('category_name', newProduct.category_name || '');
        formData.append('description', newProduct.description || '');
        formData.append('image', selectedFile);

        try {
            // Correctly posts to the full endpoint: http://.../products/online or /onsite
            await axios.post(`${PRODUCTS_ENDPOINT}/${productType}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            alert(`Product added successfully to ${productType} inventory.`);
            resetForm();
            fetchProducts();
            fetchCategories();

        } catch (error) {
            console.error("Error adding product:", error);
            alert("Failed to add product. Ensure all fields are valid and the backend service is running.");
        }
    };

    // --- Stock Reduction Handler (New Functionality) ---
    // This function is generally not called directly from this component but serves as a reusable utility.
    const reduceStock = async (productId, quantityOrdered, type) => {
        try {
            // Correctly patches to the full endpoint: http://.../products/online/{id}
            const res = await axios.patch(`${PRODUCTS_ENDPOINT}/${type}/${productId}`, { quantity: quantityOrdered });
            
            fetchProducts();
            console.log(res.data.message);

        } catch (error) {
            console.error("Error reducing stock:", error);
            alert("Failed to update product stock.");
        }
    };

    // --- Delete Product Handler ---
    const deleteProduct = async (id, type) => {
        const endpointType = type || productType;

        if (window.confirm(`Are you sure you want to delete this ${endpointType} product?`)) {
            try {
                // Correctly deletes from the full endpoint: http://.../products/online/{id}
                await axios.delete(`${PRODUCTS_ENDPOINT}/${endpointType}/${id}`);
                fetchProducts();
            } catch (error) {
                console.error("Error deleting product:", error);
                alert("Failed to delete product.");
            }
        }
    };

    // --- Edit Product Handlers ---
    const startEdit = (product, type) => {
        setEditingProduct({ ...product, type });
        setNewProduct({
            name: product.name,
            price: product.price,
            stock: product.stock,
            category_name: product.category_name || '',
            description: product.description || ''
        });
        setSelectedFile(null);
        setProductType(type);
        setShowAddForm(true);
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();

        if (!editingProduct) return;

        const formData = new FormData();
        formData.append('name', newProduct.name);
        formData.append('price', newProduct.price);
        formData.append('stock', newProduct.stock);
        // ✅ FIX: Always append category_name and description, even if empty
        formData.append('category_name', newProduct.category_name || '');
        formData.append('description', newProduct.description || '');

        if (selectedFile) {
            formData.append('image', selectedFile);
        }

        try {
            // Correctly updates the full endpoint: http://.../products/online/{id}
            await axios.put(`${PRODUCTS_ENDPOINT}/${editingProduct.type}/${editingProduct.id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            alert(`Product updated successfully!`);
            resetForm();
            fetchProducts();

        } catch (error) {
            console.error("Error updating product:", error);
            alert("Failed to update product. Ensure all fields are valid and the backend service is running.");
        }
    };

    // --- Pagination Logic ---
    const paginate = (products, page) => {
        const startIndex = (page - 1) * PRODUCTS_PER_PAGE;
        return products.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
    };

    const paginatedOnlineProducts = paginate(onlineProducts, onlinePage);
    const paginatedOnsiteProducts = paginate(onsiteProducts, onsitePage);

    const totalOnlinePages = Math.ceil(onlineProducts.length / PRODUCTS_PER_PAGE);
    const totalOnsitePages = Math.ceil(onsiteProducts.length / PRODUCTS_PER_PAGE);

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


    // --- Rendered JSX ---
    const renderTable = (products, type) => {
        const tableHeaders = ["Image", "Name", "Category", "Price", "Stock", "Availability", "Actions"];
        const paginatedProducts = type === 'online' ? paginatedOnlineProducts : paginatedOnsiteProducts;
        const currentPage = type === 'online' ? onlinePage : onsitePage;
        const totalPages = type === 'online' ? totalOnlinePages : totalOnsitePages;
        const setPage = type === 'online' ? setOnlinePage : setOnsitePage;

        return (
            <div className="products-table-container">
                <h3>{type === 'online' ? 'Online Products' : 'Onsite Products'}</h3>
                <table className="products-table">
                    <thead>
                        <tr>
                            {tableHeaders.map((header) => (
                                <th key={header}>{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedProducts.length > 0 ? (
                            paginatedProducts.map((product) => (
                                <tr key={product.id}>
                                    <td className="product-image-cell">
                                        {product.image_url && (
                                            <img
                                                // Correctly constructs the image URL using the IMAGE_BASE_URL
                                                src={product.image_url.startsWith('http') ? product.image_url : `${IMAGE_BASE_URL}${product.image_url}`}
                                                alt={product.name}
                                                className="product-image"
                                            />
                                        )}
                                    </td>
                                    <td>{product.name}</td>
                                    <td>{product.category_name || 'N/A'}</td>
                                    <td><span className="product-tag price-tag">₱{product.price}</span></td>
                                    <td><span className="product-tag stock-tag">{product.stock}</span></td>
                                    {/* --- Availability Label --- */}
                                    <td>
                                        <span className={`availability-label ${product.stock > 0 ? 'available' : 'not-available'}`}>
                                            {product.stock > 0 ? 'Available' : 'Not Available'}
                                        </span>
                                    </td>
                                    {/* --------------------------- */}
                                    <td>
                                        <div className="product-actions">
                                            <button
                                                onClick={() => startEdit(product, type)}
                                                className="edit-button"
                                                disabled={!!editingProduct && editingProduct.id !== product.id}
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                onClick={() => deleteProduct(product.id, type)}
                                                className="delete-button"
                                                disabled={!!editingProduct}
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="no-products-message">No {type} products found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {renderPagination(currentPage, totalPages, setPage)}
            </div>
        );
    };

    const handleProductTypeChange = (e) => {
        setProductType(e.target.value);
    };

    return (
        <div className="products-container">
            <header className="products-header">
                <h2>Product Management</h2>
                <div className="header-controls">
                    <div className="filter-section">
                        <label htmlFor="productTypeSelect">Display Products: </label>
                        <div className="custom-select-wrapper">
                            <select
                                id="productTypeSelect"
                                value={productType}
                                onChange={handleProductTypeChange}
                                disabled={!!editingProduct || showAddForm}
                            >
                                <option value="all">All Products</option>
                                <option value="online">Online Products</option>
                                <option value="onsite">Onsite Products</option>
                            </select>
                        </div>
                    </div>
                    <button className="add-product-btn" onClick={() => {
                        setShowAddForm(!showAddForm);
                        if (showAddForm) resetForm();
                    }}>
                        <FaPlus /> {showAddForm ? 'Hide Form' : 'Add Product'}
                    </button>
                </div>
            </header>

            {showAddForm && (
                <section className="add-product-form-section">
                    <h3>
                        {editingProduct
                            ? `Edit ${editingProduct.type} Product`
                            : `Add ${productType === 'online' ? 'Online' : (productType === 'onsite' ? 'Onsite' : 'Product')}`
                        }
                    </h3>
                    {editingProduct && (
                        <p className="editing-status">Editing: {editingProduct.name}</p>
                    )}
                    <form onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct} className="add-product-form">
                        <input
                            type="text"
                            name="name"
                            placeholder="Product Name"
                            value={newProduct.name}
                            onChange={handleInputChange}
                            required
                            disabled={productType === 'all' && !editingProduct}
                        />
                        <input
                            type="number"
                            name="price"
                            placeholder="Price"
                            value={newProduct.price}
                            onChange={handleInputChange}
                            step="0.01"
                            required
                            disabled={productType === 'all' && !editingProduct}
                        />
                        <input
                            type="number"
                            name="stock"
                            placeholder="Stock"
                            value={newProduct.stock}
                            onChange={handleInputChange}
                            required
                            disabled={productType === 'all' && !editingProduct}
                        />
                        <input
                            type="file"
                            name="image"
                            placeholder="Product Image"
                            accept="image/*"
                            onChange={handleFileChange}
                            required={!editingProduct && !selectedFile}
                            disabled={productType === 'all' && !editingProduct}
                        />
                        {editingProduct && !selectedFile && editingProduct.image_url && (
                            <p>Current Image: <img 
                                // Correctly constructs the image URL
                                src={editingProduct.image_url.startsWith('http') ? editingProduct.image_url : `${IMAGE_BASE_URL}${editingProduct.image_url}`} 
                                alt="Current Product" style={{ maxWidth: '50px', maxHeight: '50px' }} /></p>
                        )}
                        <input
                            type="text"
                            name="category_name"
                            placeholder="Enter Category"
                            value={newProduct.category_name}
                            onChange={handleInputChange}
                            required
                            disabled={productType === 'all' && !editingProduct}
                        />
                        {(newProduct.category_name === 'Unlimited Rates' || newProduct.category_name === 'Limited Rules') && (
                            <input
                                type="text"
                                name="description"
                                placeholder="Enter Description"
                                value={newProduct.description}
                                onChange={handleInputChange}
                                required
                                disabled={productType === 'all' && !editingProduct}
                            />
                        )}
                        <div className="form-actions">
                            <button
                                type="submit"
                                disabled={productType === 'all' && !editingProduct}
                            >
                                {editingProduct ? <><FaEdit /> Update Product</> : 'Add Product'}
                            </button>
                            {editingProduct && (
                                <button type="button" className="cancel-edit-btn" onClick={resetForm}>
                                    <FaTimes /> Cancel Edit
                                </button>
                            )}
                        </div>
                    </form>
                </section>
            )}

            <section className="product-list-section">
                {productType === 'all' && (
                    <>
                        {renderTable(onlineProducts, 'online')}
                        {renderTable(onsiteProducts, 'onsite')}
                        {onlineProducts.length === 0 && onsiteProducts.length === 0 && (
                            <p className="no-products-message">No products found.</p>
                        )}
                    </>
                )}
                {productType === 'online' && renderTable(onlineProducts, 'online')}
                {productType === 'onsite' && renderTable(onsiteProducts, 'onsite')}
            </section>
        </div>
    );
};

export default Products;
