const express = require("express");
const AdminController = require("../controllers/AdminController");
const { authenticateJWT, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", AdminController.adminLogin);
router.post("/refresh", AdminController.adminRefresh);
router.post("/logout", authenticateJWT, authorizeRoles("admin"), AdminController.adminLogout);
router.get("/profile", authenticateJWT, authorizeRoles("admin"), AdminController.adminProfile);
router.get("/verify", authenticateJWT, authorizeRoles("admin"), AdminController.adminVerify);

module.exports = router;
