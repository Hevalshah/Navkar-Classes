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
        <Route path="/timetable" element={<ProtectedRoute allowedRoles={["admin", "staff", "teacher", "student"]}><Timetable /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute allowedRoles={["admin", "staff", "teacher", "student"]}><Attendance /></ProtectedRoute>} />

        {/* Exam Dropdown */}
        <Route path="/result" element={<ProtectedRoute allowedRoles={["admin", "staff", "teacher", "student"]}><Result /></ProtectedRoute>} />

        {/* Fee Dropdown */}
        <Route path="/pay-fees" element={<ProtectedRoute allowedRoles={["student"]}><PayFees /></ProtectedRoute>} />
        <Route path="/fee-history" element={<ProtectedRoute allowedRoles={["admin", "staff", "teacher", "student"]}><FeeHistory /></ProtectedRoute>} />

        {/* Courses Dropdown */}
        <Route path="/materials" element={<ProtectedRoute allowedRoles={["admin", "staff", "teacher", "student"]}><Materials /></ProtectedRoute>} />
        <Route path="/tests" element={<ProtectedRoute allowedRoles={["admin", "staff", "teacher", "student"]}><Tests /></ProtectedRoute>} />

        {/* Student Registration */}
        <Route path="/student-registration" element={<ProtectedRoute allowedRoles={["admin"]}><StudentRegistration /></ProtectedRoute>} />
        <Route path="/students" element={<ProtectedRoute allowedRoles={["admin", "teacher"]}><StudentManagement /></ProtectedRoute>} />

        {/* Other Dropdown */}
        <Route path="/certificate-request" element={<ProtectedRoute allowedRoles={["student"]}><CertificateRequest /></ProtectedRoute>} />
        <Route path="/feedback" element={<ProtectedRoute allowedRoles={["admin", "staff", "teacher", "student"]}><Feedback /></ProtectedRoute>} />

        {/* Profile Dropdown */}
        <Route path="/profile" element={<ProtectedRoute allowedRoles={["admin", "staff", "teacher", "student"]}><MyProfile /></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute allowedRoles={["staff", "teacher", "student"]}><ChangePassword /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
