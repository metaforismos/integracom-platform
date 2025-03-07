const Notification = require('../models/notification.model');

// @desc    Obtener notificaciones del usuario
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    // Paginación
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    // Obtener notificaciones del usuario
    const notifications = await Notification.find({ recipient: req.user._id })
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Contar total para paginación
    const total = await Notification.countDocuments({ recipient: req.user._id });

    res.status(200).json({
      success: true,
      count: notifications.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
      data: notifications,
    });
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones',
      error: error.message,
    });
  }
};

// @desc    Obtener notificaciones no leídas
// @route   GET /api/notifications/unread
// @access  Private
exports.getUnreadNotifications = async (req, res) => {
  try {
    // Obtener notificaciones no leídas
    const notifications = await Notification.find({
      recipient: req.user._id,
      read: false,
    }).sort({ createdAt: -1 });

    // Contar total
    const count = notifications.length;

    res.status(200).json({
      success: true,
      count,
      data: notifications,
    });
  } catch (error) {
    console.error('Error al obtener notificaciones no leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones no leídas',
      error: error.message,
    });
  }
};

// @desc    Marcar notificación como leída
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada',
      });
    }

    // Marcar como leída
    notification.read = true;
    notification.readAt = Date.now();
    await notification.save();

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar notificación como leída',
      error: error.message,
    });
  }
};

// @desc    Marcar todas las notificaciones como leídas
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true, readAt: Date.now() }
    );

    res.status(200).json({
      success: true,
      data: {
        count: result.nModified,
        message: `${result.nModified} notificaciones marcadas como leídas`,
      },
    });
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar todas las notificaciones como leídas',
      error: error.message,
    });
  }
};

// @desc    Eliminar una notificación
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada',
      });
    }

    await notification.remove();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Notificación eliminada correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar notificación',
      error: error.message,
    });
  }
};