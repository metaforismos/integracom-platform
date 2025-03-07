const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del proyecto es obligatorio'],
      trim: true,
    },
    milestones: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          required: true,
          trim: true,
        },
        attachments: [
          {
            url: String,
            name: String,
            type: String, // image, video, document, pdf
            uploadedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User',
            },
            uploadedAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    location: {
      type: String,
      required: [true, 'La ubicación del proyecto es obligatoria'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    orderNumber: {
      type: String,
      trim: true,
      unique: true,
    },
    identificationNumber: {
      type: String,
      trim: true,
    },
    receptionType: {
      type: String,
      enum: ['Parcial', 'Total', 'Otro'],
      default: 'Total',
    },
    companyResponsible: {
      type: String,
      trim: true,
    },
    clientContactName: {
      type: String,
      trim: true,
    },
    clientCompanyName: {
      type: String,
      trim: true,
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    costCenter: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['En progreso', 'Finalizado', 'En pausa', 'Cancelado', 'En revisión'],
      default: 'En progreso',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    photos: [
      {
        url: String,
        description: String,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    documents: [
      {
        url: String,
        name: String,
        type: String,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    clients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Métricas y KPIs
    metrics: {
      totalRequests: {
        type: Number,
        default: 0,
      },
      openRequests: {
        type: Number,
        default: 0,
      },
      completedRequests: {
        type: Number,
        default: 0,
      },
      averageResponseTime: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true }
);

// Índices para búsquedas eficientes
projectSchema.index({ name: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ 'clients': 1 });
projectSchema.index({ 'technician': 1 });

// Middleware para actualizar métricas
projectSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Lógica para proyectos nuevos si es necesario
  }
  next();
});

// Método para verificar si un usuario tiene acceso al proyecto
projectSchema.methods.hasAccess = function (userId, role) {
  // Administradores siempre tienen acceso
  if (role === 'admin') return true;
  
  // Técnico asignado tiene acceso
  if (role === 'technician' && this.technician && this.technician.toString() === userId.toString()) {
    return true;
  }
  
  // Cliente asignado tiene acceso
  if (role === 'client' && this.clients.some(clientId => clientId.toString() === userId.toString())) {
    return true;
  }
  
  return false;
};

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;