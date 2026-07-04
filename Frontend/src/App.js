import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./Components/Landing";
import Login from "./Components/Login";
import AdminLogin from "./Components/AdminLogin";
import ProtectedRoute from "./Components/ProtectedRoute";
import StudentDashboard from "./Components/StudentDashboard";
import AdminDashboard from "./Components/AdminDashboard";

// Pages Imports
import Timetable from "./Components/Timetable";
import Attendance from "./Components/Attendance";
import Result from "./Components/Result";
import PayFees from "./Components/PayFees";
import FeeHistory from "./Components/FeeHistory";
import Materials from "./Components/Materials";
import Tests from "./Components/Tests";
import CertificateRequest from "./Components/CertificateRequest";
import Feedback from "./Components/Feedback";
import MyProfile from "./Components/MyProfile";
import ChangePassword from "./Components/ChangePassword";
import StudentRegistration from "./Components/StudentRegistration";
import StudentManagement from "./Components/StudentManagement";
import TeacherRegistration from "./Components/TeacherRegistration";
import TeacherDashboard from "./Components/TeacherDashboard";

function App() {
  return (
    <Router>
      <Routes>
        {/* Core Auth & Dashboard Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["student"]}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/teacher-dashboard" element={<ProtectedRoute allowedRoles={["teacher"]}><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/teacher-registration" element={<ProtectedRoute allowedRoles={["admin"]}><TeacherRegistration /></ProtectedRoute>} />

        {/* Timetable Dropdown */}
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/attendance" element={<Attendance />} />

        {/* Exam Dropdown */}
        <Route path="/result" element={<Result />} />

        {/* Fee Dropdown */}
        <Route path="/pay-fees" element={<PayFees />} />
        <Route path="/fee-history" element={<FeeHistory />} />

        {/* Courses Dropdown */}
        <Route path="/materials" element={<Materials />} />
        <Route path="/tests" element={<Tests />} />

        {/* Student Registration */}
        <Route path="/student-registration" element={<ProtectedRoute allowedRoles={["admin"]}><StudentRegistration /></ProtectedRoute>} />
        <Route path="/students" element={<ProtectedRoute allowedRoles={["admin", "teacher"]}><StudentManagement /></ProtectedRoute>} />

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
