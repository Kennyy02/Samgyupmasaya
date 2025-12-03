import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr'; 

// Import the new CSS file
import './ScanQRCode.css';

const ScanQRCode = () => {
    const navigate = useNavigate();
    const [isScanning, setIsScanning] = useState(true);
    const [scanError, setScanError] = useState(null); 
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const intervalRef = useRef(null); 

    // --- MODIFIED: Use environment variable for the navigation path ---
    // This line uses the environment variable, falling back to '/onsite-menu' if it's missing.
    const ONSITE_MENU_ROUTE = process.env.REACT_APP_ONSITE_MENU_ROUTE || '/onsite-menu';
    // -----------------------------------------------------------------

    const scanCode = useCallback(() => {
        if (videoRef.current && canvasRef.current && isScanning) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (!context) {
                console.error("Could not get 2D context from canvas.");
                return;
            }

            // Ensure video stream is ready before drawing frames
            if (video.readyState === video.HAVE_ENOUGH_DATA) { 
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                
                // Decode QR code
                const code = jsQR(imageData.data, imageData.width, imageData.height); 

                if (code) {
                    setIsScanning(false); // Stop scanning
                    setScanError(null); 

                    // Store scanned data (e.g., table ID) and redirect
                    // NOTE: We are using localStorage for temporary storage of the table ID
                    localStorage.setItem('table_code', code.data); 
                    console.log(`QR Scanner: Stored table_code "${code.data}" in localStorage.`);

                    // Redirect using the configurable route
                    navigate(ONSITE_MENU_ROUTE, { state: { scannedTableId: code.data } });
                }
            }
        }
    }, [isScanning, navigate, ONSITE_MENU_ROUTE]); // Added ONSITE_MENU_ROUTE to dependencies

    // Effect for managing the scanning interval
    useEffect(() => {
        if (isScanning && videoRef.current) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            // Scan every 100ms
            intervalRef.current = setInterval(scanCode, 100); 
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isScanning, scanCode]); 

    // Effect for opening and managing the camera stream
    useEffect(() => {
        const openCamera = async () => {
            setScanError(null); 
            try {
                // Request access to the user's camera (preferring the environment/back camera)
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.setAttribute('playsinline', 'true'); 
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current.play();
                    };
                }
            } catch (error) {
                console.error("Error accessing camera:", error);
                setScanError('Failed to access the camera. Please ensure camera access is enabled and try again.');
                setIsScanning(false); 
            }
        };

        openCamera();

        // Cleanup function: stop camera tracks when component unmounts
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject;
                const tracks = stream.getTracks();
                tracks.forEach((track) => track.stop());
                videoRef.current.srcObject = null;
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, []); 

    const handleCancel = () => {
        setIsScanning(false); 
        navigate('/'); 
    };

    return (
        <div className="qr-scanner-wrapper">
            <div className="qr-content-container">
                <h1 className="qr-heading">Scan Table QR Code</h1>

                <div className="qr-video-container">
                    {scanError ? (
                        <p className="qr-message qr-error-message">{scanError}</p>
                    ) : (
                        isScanning ? (
                            <video ref={videoRef} className="qr-video-element" autoPlay muted playsInline />
                        ) : (
                            <p className="qr-message">Scanning stopped.</p>
                        )
                    )}
                </div>

                <canvas ref={canvasRef} style={{ display: 'none' }} /> 

                {scanError && (
                    <button onClick={() => window.location.reload()} className="qr-button qr-button-retry">
                        Retry Camera
                    </button>
                )}

                <button
                    onClick={handleCancel}
                    className="qr-button qr-button-cancel"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default ScanQRCode;
