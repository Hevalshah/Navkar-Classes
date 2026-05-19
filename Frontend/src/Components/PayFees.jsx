import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { getProfile, logoutUser } from "../Services/authService";
import "../Styles/dashboard.css";
import "../Styles/pages.css";

const PayFees = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState("upi");
    const [isPaying, setIsPaying] = useState(false);
    const [paySuccess, setPaySuccess] = useState(false);
    const [txnDetails, setTxnDetails] = useState(null);

    // Form inputs
    const [upiId, setUpiId] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [cardExpiry, setCardExpiry] = useState("");
    const [cardCvv, setCardCvv] = useState("");

    const fallbackUser = {
        name: "Student (Demo Mode)",
        role: "student",
        profileImg: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
    };

    const feeBreakdown = [
        { id: 1, head: "Tuition Fee - CA Intermediate (Group 1)", amount: 12000 },
        { id: 2, head: "Weekly Assessment Test & Material Charge", amount: 2000 },
        { id: 3, head: "Library & Lab Digital Subscription", amount: 1000 }
    ];

    const totalAmount = feeBreakdown.reduce((sum, item) => sum + item.amount, 0);

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                setUser(fallbackUser);
                return;
            }
            try {
                const userData = await getProfile(token);
                setUser(userData);
            } catch (error) {
                console.warn("Failed to load profile from API, falling back to mock user", error);
                setUser(fallbackUser);
            }
        };
        fetchProfile();
    }, []);

    const handleLogout = async () => {
        const token = localStorage.getItem("token");
        try {
            if (token) {
                await logoutUser(token);
            }
        } catch (error) {
            console.error("Failed to record logout", error);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            navigate("/");
        }
    };

    const handlePaymentSubmit = (e) => {
        e.preventDefault();
        
        // Simple form validation
        if (paymentMethod === "upi" && !upiId.includes("@")) {
            alert("Please enter a valid UPI ID (e.g. user@okhdfcbank)");
            return;
        }
        if (paymentMethod === "card" && (cardNumber.replace(/\s/g, "").length !== 16 || !cardExpiry || cardCvv.length !== 3)) {
            alert("Please complete all Credit/Debit card fields correctly.");
            return;
        }

        setIsPaying(true);

        // Simulate payment gateway API processing
        setTimeout(() => {
            setIsPaying(false);
            setPaySuccess(true);
            setTxnDetails({
                id: "TXN" + Math.floor(1000000000 + Math.random() * 9000000000),
                date: "18-May-2026 09:37 PM",
                amount: totalAmount,
                method: paymentMethod.toUpperCase(),
                ref: "NAV" + Math.floor(100000 + Math.random() * 900000)
            });
        }, 2200);
    };

    return (
        <div className="dashboard-layout">
            <Navbar role="student" user={user} onLogout={handleLogout} />

            <div className="dashboard-main-container">
                <div className="page-container">
                    
                    {/* Header */}
                    <div className="page-header">
                        <h2><i className="fas fa-file-invoice-dollar"></i> Online Fee Payment</h2>
                    </div>

                    {paySuccess ? (
                        /* Success Transaction View */
                        <div className="portal-card green-theme" style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center", padding: "40px 20px" }}>
                            <div style={{ width: "70px", height: "70px", borderRadius: "50%", background: "#dcfce7", color: "#2ecc71", display: "flex", alignItems: "center", justify: "center", fontSize: "36px", margin: "0 auto 20px auto", animation: "bounce 1s infinite" }}>
                                <i className="fas fa-check"></i>
                            </div>
                            <h3 style={{ color: "#2ecc71", margin: "0 0 10px 0" }}>Payment Successful!</h3>
                            <p style={{ color: "#4a5568", margin: "0 0 25px 0" }}>Your fee payment has been successfully recorded in the student portal database.</p>

                            <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "20px", textAlign: "left", marginBottom: "30px", fontSize: "14px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                                    <span style={{ color: "#718096" }}>Transaction ID:</span>
                                    <strong>{txnDetails?.id}</strong>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                                    <span style={{ color: "#718096" }}>Payment Time:</span>
                                    <span>{txnDetails?.date}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                                    <span style={{ color: "#718096" }}>Payment Method:</span>
                                    <strong>{txnDetails?.method}</strong>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                                    <span style={{ color: "#718096" }}>Reference No:</span>
                                    <span>{txnDetails?.ref}</span>
                                </div>
                                <hr style={{ border: "0", borderTop: "1px solid #cbd5e1", margin: "12px 0" }} />
                                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "16px" }}>
                                    <span>Paid Amount:</span>
                                    <span style={{ color: "#007bff" }}>₹{txnDetails?.amount.toLocaleString()}</span>
                                </div>
                            </div>

                            <button onClick={() => navigate("/dashboard")} className="portal-btn primary">
                                <i className="fas fa-home"></i> Back to Dashboard
                            </button>
                        </div>
                    ) : (
                        /* Standard Billing and Form View */
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "30px", alignItems: "start" }}>
                            
                            {/* Billing details column */}
                            <div className="portal-card">
                                <h3 style={{ margin: "0 0 15px 0", fontSize: "16px", textTransform: "uppercase", color: "#4a5568", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>Fee Breakdown</h3>
                                
                                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                                    {feeBreakdown.map(fee => (
                                        <div key={fee.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", alignItems: "center" }}>
                                            <span style={{ color: "#334155", maxWidth: "70%" }}>{fee.head}</span>
                                            <span style={{ fontWeight: "600", color: "#1e293b" }}>₹{fee.amount.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>

                                <hr style={{ border: "0", borderTop: "1px solid #e2e8f0", margin: "20px 0" }} />

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                                    <span style={{ fontWeight: "700", color: "#1a202c" }}>Total Payable Balance</span>
                                    <span style={{ fontSize: "20px", fontWeight: "bold", color: "#e74c3c" }}>₹{totalAmount.toLocaleString()}</span>
                                </div>

                                <div className="no-record" style={{ margin: "0", padding: "10px 15px", borderRadius: "4px", background: "#fef3c7", color: "#92400e", fontSize: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                                    <i className="fas fa-exclamation-triangle" style={{ fontSize: "14px" }}></i>
                                    <span>Due Date: <strong>30-May-2026</strong>. Late charges apply after this.</span>
                                </div>
                            </div>

                            {/* Payment Method Column */}
                            <div className="portal-card blue-theme">
                                <h3 style={{ margin: "0 0 15px 0", fontSize: "16px", textTransform: "uppercase", color: "#4a5568", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>Payment Information</h3>
                                
                                <form onSubmit={handlePaymentSubmit} className="portal-form">
                                    <div className="portal-form-group">
                                        <label>Select Payment Method:</label>
                                        <div style={{ display: "flex", gap: "15px", marginTop: "5px" }}>
                                            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px" }}>
                                                <input 
                                                    type="radio" 
                                                    name="method" 
                                                    value="upi" 
                                                    checked={paymentMethod === "upi"}
                                                    onChange={() => setPaymentMethod("upi")}
                                                />
                                                UPI (GPay/PhonePe)
                                            </label>
                                            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px" }}>
                                                <input 
                                                    type="radio" 
                                                    name="method" 
                                                    value="card" 
                                                    checked={paymentMethod === "card"}
                                                    onChange={() => setPaymentMethod("card")}
                                                />
                                                Credit / Debit Card
                                            </label>
                                        </div>
                                    </div>

                                    {paymentMethod === "upi" ? (
                                        <div className="portal-form-group" style={{ animation: "fadeIn 0.3s" }}>
                                            <label>Enter UPI ID:</label>
                                            <div className="portal-input-wrapper">
                                                <i className="fas fa-mobile-alt portal-input-icon"></i>
                                                <input 
                                                    type="text" 
                                                    className="portal-form-input with-icon"
                                                    placeholder="username@okhdfcbank"
                                                    value={upiId}
                                                    onChange={(e) => setUpiId(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <span style={{ fontSize: "11px", color: "#718096" }}>Pay using BHIM, Google Pay, PhonePe, Paytm, or any banking app.</span>
                                        </div>
                                    ) : (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "15px", animation: "fadeIn 0.3s" }}>
                                            <div className="portal-form-group">
                                                <label>Card Number:</label>
                                                <div className="portal-input-wrapper">
                                                    <i className="far fa-credit-card portal-input-icon"></i>
                                                    <input 
                                                        type="text" 
                                                        className="portal-form-input with-icon"
                                                        placeholder="XXXX XXXX XXXX XXXX"
                                                        maxLength="19"
                                                        value={cardNumber}
                                                        onChange={(e) => {
                                                            // Auto spacing for card numbers
                                                            const val = e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();
                                                            setCardNumber(val);
                                                        }}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-row">
                                                <div className="portal-form-group">
                                                    <label>Expiry Date:</label>
                                                    <input 
                                                        type="text" 
                                                        className="portal-form-input" 
                                                        placeholder="MM/YY" 
                                                        maxLength="5"
                                                        value={cardExpiry}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/\D/g, "");
                                                            if (val.length >= 2) {
                                                                setCardExpiry(val.slice(0, 2) + "/" + val.slice(2, 4));
                                                            } else {
                                                                setCardExpiry(val);
                                                            }
                                                        }}
                                                        required
                                                    />
                                                </div>

                                                <div className="portal-form-group">
                                                    <label>CVV Number:</label>
                                                    <input 
                                                        type="password" 
                                                        className="portal-form-input" 
                                                        placeholder="123" 
                                                        maxLength="3"
                                                        value={cardCvv}
                                                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <button 
                                        type="submit" 
                                        className="portal-btn danger" 
                                        style={{ marginTop: "15px", height: "45px" }}
                                        disabled={isPaying}
                                    >
                                        {isPaying ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin"></i> Contacting Bank Server...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-shield-alt"></i> Secure Pay ₹{totalAmount.toLocaleString()}
                                            </>
                                        )}
                                    </button>

                                    <div style={{ textAlign: "center", color: "#a0aec0", fontSize: "11px", marginTop: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                                        <i className="fas fa-lock"></i> Secured 256-bit SSL encrypted transaction gateway.
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PayFees;
