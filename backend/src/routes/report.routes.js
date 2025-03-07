const express = require('express');
const router = express.Router();

// Middleware
const { protect, authorize } = require('../middlewares/auth.middleware');

// Controladores
const {
  getProjectsReport,
  getServiceRequestsReport,
  getRenditionsReport,
  getTechnicianPerformanceReport,
  getMonthlyReport,
} = require('../controllers/report.controller');

// Rutas de reportes (solo admin)
router.get('/projects', protect, authorize('admin'), getProjectsReport);
router.get('/service-requests', protect, authorize('admin'), getServiceRequestsReport);
router.get('/renditions', protect, authorize('admin'), getRenditionsReport);
router.get('/technician-performance', protect, authorize('admin'), getTechnicianPerformanceReport);
router.get('/monthly', protect, authorize('admin'), getMonthlyReport);

module.exports = router;