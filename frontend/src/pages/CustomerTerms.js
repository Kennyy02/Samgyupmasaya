// src/components/CustomerTermsModal.js
import React from 'react';
// Import the new CSS file for the modal structure
import './CustomerTerms.css'; 
import { 
    FaDatabase, 
    FaLock, 
    FaUserShield, 
    FaShareAlt, 
    FaBalanceScale, 
    FaCheckCircle,
    FaTimes // Icon for the close button
} from 'react-icons/fa';

// Props: isOpen to control visibility, onClose to handle the close action
const CustomerTermsModal = ({ isOpen, onClose }) => {

    // If the modal is not open, return null to render nothing
    if (!isOpen) {
        return null;
    }

    return (
        // Modal Backdrop: The dark overlay that covers the rest of the screen
        <div className="ct-modal-backdrop" onClick={onClose}>
            {/* Modal Content: Prevents clicks inside from closing the modal */}
            <div className="ct-modal-content" onClick={e => e.stopPropagation()}>
                
                {/* Modal Header */}
                <div className="ct-modal-header">
                    <h1 className="ct-main-heading">Terms and Conditions & Privacy Statement</h1>
                    <button className="ct-close-btn" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>
                <p className="ct-last-updated">Last Updated: September 08, 2025</p>

                {/* Scrollable Terms Body */}
                <div className="ct-modal-body">

                    {/* 1. Data Collection and Storage */}
                    <section className="ct-terms-section">
                        <h2 className="ct-section-heading">
                            <FaDatabase className="ct-icon" /> 1. Data Collection and Storage
                        </h2>
                        <p className="ct-section-content">
                            At SamgyupMasaya, we take your privacy and security seriously. When you register an account to use our online ordering system, we collect information such as your username and a safely encrypted password. We use this information only to create your account, let you log in securely, and make your online ordering experience smooth. We store your data safely, make sure only authorized staff can access it, and keep it only as long as needed. When your data is no longer needed, we delete it securely to prevent anyone else from accessing it.
                        </p>
                    </section>

                    {/* 2. Password Security */}
                    <section className="ct-terms-section">
                        <h2 className="ct-section-heading">
                            <FaLock className="ct-icon" /> 2. Password Security
                        </h2>
                        <p className="ct-section-content">
                            To ensure the highest level of protection for our users' accounts, all passwords are <strong className="ct-highlight">hashed and encrypted</strong> using industry-standard cryptographic algorithms prior to storage within our systems. Under no circumstances are plain-text passwords stored or transmitted. Users are required to create passwords that adhere to the following security standards to prevent unauthorized access and enhance account integrity:
                        </p>
                        <ul className="ct-policy-list">
                            <li>Must contain a minimum of eight (8) characters in total</li>
                            <li>Must include at least one uppercase letter (A-Z)</li>
                            <li>Must include at least one lowercase letter (a-z)</li>
                            <li>Must include at least one numeric digit (0-9)</li>
                            <li>Must include at least one special character (e.g., !@#$%^&amp;*)</li>
                        </ul>
                        <p className="ct-section-content">
                            We strongly encourage users to regularly update their passwords and to avoid reusing passwords from other accounts or services. Non-compliance with these password requirements may result in temporary denial of account registration, and failure to maintain password confidentiality may result in unauthorized access, for which users remain responsible.
                        </p>
                    </section>

                    {/* 3. User Responsibilities */}
                    <section className="ct-terms-section">
                        <h2 className="ct-section-heading">
                            <FaUserShield className="ct-icon" /> 3. User Responsibilities
                        </h2>
                        <p className="ct-section-content">
                            As a registered user of SamgyupMasaya, you bear the full responsibility for safeguarding your account login credentials, including your username and password. Sharing, distributing, or disclosing your login information to third parties is strictly prohibited under these Terms. All activities performed under your account will be assumed to have been conducted by you. Should you suspect unauthorized access, experience unusual account activity, or believe that your credentials have been compromised, it is your obligation to notify our support team immediately. Timely reporting allows us to implement necessary security measures, including temporary account suspension or other protective actions, to prevent potential misuse and safeguard your personal information.
                        </p>
                    </section>

                    {/* 4. Data Sharing Policies */}
                    <section className="ct-terms-section">
                        <h2 className="ct-section-heading">
                            <FaShareAlt className="ct-icon" /> 4. Data Sharing and Disclosure
                        </h2>
                        <p className="ct-section-content">
                            We value and respect your privacy. SamgyupMasaya strictly limits the disclosure of personal information collected from our users and does not sell, rent, or trade such information to any third parties for commercial purposes. Disclosure of personal data may only occur under exceptional circumstances, such as:
                        </p>
                        <ul className="ct-policy-list">
                            <li>When required to comply with applicable laws, legal processes, subpoenas, or court orders</li>
                            <li>When necessary to protect the rights, safety, or property of users, other individuals, or the company itself</li>
                            <li>When users have provided explicit, informed, and written consent to share such information</li>
                        </ul>
                        <p className="ct-section-content">
                            Any sharing or disclosure of personal information under these conditions will be performed in a lawful, transparent, and proportionate manner, ensuring that only the minimum necessary data is disclosed to meet the intended purpose.
                        </p>
                    </section>

                    {/* 5. Compliance with RA 10173 */}
                    <section className="ct-terms-section">
                        <h2 className="ct-section-heading">
                            <FaBalanceScale className="ct-icon" /> 5. Compliance with RA 10173 (Data Privacy Act of 2012)
                        </h2>
                        <p className="ct-section-content">
                            SamgyupMasaya is fully compliant with the provisions of the Philippine Data Privacy Act of 2012 (RA 10173). In adherence to the principles of transparency, legitimate purpose, and proportionality, we ensure that personal information is collected, stored, and processed only for clearly defined and lawful purposes. As a user, you are entitled to exercise the following rights in accordance with the Data Privacy Act:
                        </p>
                        <ul className="ct-policy-list">
                            <li>The right to be fully informed about how your personal data is collected, processed, and stored</li>
                            <li>The right to access and obtain a copy of your personal information maintained by SamgyupMasaya</li>
                            <li>The right to request correction or update of any inaccurate, incomplete, or outdated personal data</li>
                            <li>The right to withdraw consent or object to the processing of personal information under specific circumstances</li>
                            <li>The right to file a complaint with the National Privacy Commission if you believe your data privacy rights have been violated</li>
                        </ul>
                        <p className="ct-section-content">
                            SamgyupMasaya is committed to upholding and protecting these rights and encourages all users to reach out to us should they wish to exercise any of these rights or seek clarification regarding our data privacy practices.
                        </p>
                    </section>

                    {/* 6. Acceptance of Terms */}
                    <section className="ct-terms-section">
                        <h2 className="ct-section-heading">
                            <FaCheckCircle className="ct-icon" /> 6. Acceptance of Terms
                        </h2>
                        <p className="ct-section-content">
                            By registering for an account and using the SamgyupMasaya online ordering platform, you explicitly acknowledge that you have read, understood, and agreed to be bound by these Terms and Conditions as well as our Privacy Statement. Your continued use of our services constitutes your voluntary consent to the collection, storage, and processing of your personal information as described herein. If you do not agree with any portion of these terms, you must immediately discontinue the use of our services to avoid unauthorized processing of your personal data.
                        </p>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default CustomerTermsModal;