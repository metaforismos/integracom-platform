const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info',
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    relatedTo: {
      model: {
        type: String,
        enum: ['Project', 'ServiceRequest', 'Rendition', 'User'],
      },
      id: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
    link: {
      type: String,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Índices para búsquedas eficientes
notificationSchema.index({ recipient: 1 });
notificationSchema.index({ read: 1 });
notificationSchema.index({ 'relatedTo.model': 1, 'relatedTo.id': 1 });
notificationSchema.index({ createdAt: -1 });

// Método estático para crear y enviar una notificación
notificationSchema.statics.createNotification = async function(data) {
  try {
    const notification = new this({
      recipient: data.recipient,
      title: data.title,
      message: data.message,
      type: data.type || 'info',
      relatedTo: data.relatedTo,
      link: data.link,
    });
    
    await notification.save();
    
    // Aquí se puede implementar la lógica para enviar por email
    // O mediante WebSockets, si se implementa esa funcionalidad
    
    return notification;
  } catch (error) {
    console.error('Error al crear notificación:', error);
    throw error;
  }
};

// Método estático para marcar como leída
notificationSchema.statics.markAsRead = async function(id, userId) {
  try {
    const notification = await this.findOne({
      _id: id,
      recipient: userId,
    });
    
    if (!notification) {
      throw new Error('Notificación no encontrada');
    }
    
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
    
    return notification;
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    throw error;
  }
};

// Método estático para marcar todas como leídas para un usuario
notificationSchema.statics.markAllAsRead = async function(userId) {
  try {
    const result = await this.updateMany(
      { recipient: userId, read: false },
      { read: true, readAt: new Date() }
    );
    
    return result;
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    throw error;
  }
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;