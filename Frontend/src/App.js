import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Components/Login";
import Register from "./Components/Register";
import StudentDashboard from "./Components/StudentDashboard";
import AdminDashboard from "./Components/AdminDashboard";

// Missing Pages Imports
import Timetable from "./Components/Timetable";
import Attendance from "./Components/Attendance";
import AdmitCard from "./Components/AdmitCard";
import Result from "./Components/Result";
import PayFees from "./Components/PayFees";
import FeeHistory from "./Components/FeeHistory";
import Materials from "./Components/Materials";
import Tests from "./Components/Tests";
import CertificateRequest from "./Components/CertificateRequest";
import Feedback from "./Components/Feedback";
import MyProfile from "./Components/MyProfile";
import ChangePassword from "./Components/ChangePassword";

function App() {
  return (
    <Router>
      <Routes>
        {/* Core Auth & Dashboard Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />

        {/* Timetable Dropdown */}
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/attendance" element={<Attendance />} />

        {/* Exam Dropdown */}
        <Route path="/admit-card" element={<AdmitCard />} />
        <Route path="/result" element={<Result />} />

        {/* Fee Dropdown */}
        <Route path="/pay-fees" element={<PayFees />} />
        <Route path="/fee-history" element={<FeeHistory />} />

        {/* Courses Dropdown */}
        <Route path="/materials" element={<Materials />} />
        <Route path="/tests" element={<Tests />} />

        {/* Other Dropdown */}
        <Route path="/certificate-request" element={<CertificateRequest />} />
        <Route path="/feedback" element={<Feedback />} />

        {/* Profile Dropdown */}
        <Route path="/profile" element={<MyProfile />} />
        <Route path="/change-password" element={<ChangePassword />} />
      </Routes>
    </Router>
  );
}

export default App;
