const express = require('express');
const router = express.Router();

// Middleware
const { protect } = require('../middlewares/auth.middleware');

// Controladores
const {
  getNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../controllers/notification.controller');

// Rutas de notificaciones
router.get('/', protect, getNotifications);
router.get('/unread', protect, getUnreadNotifications);
router.put('/:id/read', protect, markAsRead);
router.put('/read-all', protect, markAllAsRead);
router.delete('/:id', protect, deleteNotification);

module.exports = router;