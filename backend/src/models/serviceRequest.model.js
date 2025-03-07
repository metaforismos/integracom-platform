const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      required: true,
      unique: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'El título de la solicitud es obligatorio'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'La descripción de la solicitud es obligatoria'],
      trim: true,
    },
    priority: {
      type: String,
      enum: ['Alta', 'Media', 'Baja'],
      default: 'Media',
    },
    status: {
      type: String,
      enum: ['Solicitada', 'En revisión', 'Aceptada', 'Finalizada', 'Cancelada'],
      default: 'Solicitada',
    },
    requestType: {
      type: String,
      enum: ['Mantenimiento', 'Reparación', 'Consulta', 'Emergencia', 'Otro'],
      default: 'Mantenimiento',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
      address: String,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    scheduledDate: {
      type: Date,
    },
    completionDate: {
      type: Date,
    },
    attachments: [
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
    comments: [
      {
        text: String,
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
    history: [
      {
        status: String,
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        notes: String,
      },
    ],
    renditions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Rendition',
      },
    ],
  },
  { timestamps: true }
);

// Índices para búsquedas eficientes
serviceRequestSchema.index({ requestNumber: 1 }, { unique: true });
serviceRequestSchema.index({ project: 1 });
serviceRequestSchema.index({ status: 1 });
serviceRequestSchema.index({ priority: 1 });
serviceRequestSchema.index({ 'requestedBy': 1 });
serviceRequestSchema.index({ 'assignedTo': 1 });
serviceRequestSchema.index({ 'location.coordinates': '2dsphere' });

// Método para generar un número de solicitud único
serviceRequestSchema.statics.generateRequestNumber = async function() {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  
  // Obtener la última solicitud para generar el número secuencial
  const lastRequest = await this.findOne({}, {}, { sort: { 'createdAt': -1 } });
  
  let sequenceNumber = 1;
  if (lastRequest && lastRequest.requestNumber) {
    // Extraer el número secuencial del último request
    const lastSequenceStr = lastRequest.requestNumber.split('-')[2];
    if (lastSequenceStr) {
      sequenceNumber = parseInt(lastSequenceStr, 10) + 1;
    }
  }
  
  // Formatear como SR-YYMM-0001
  return `SR-${year}${month}-${sequenceNumber.toString().padStart(4, '0')}`;
};

// Middleware para actualizar el historial cuando cambia el estado
serviceRequestSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Generar número de solicitud si es nuevo
    if (!this.requestNumber) {
      this.requestNumber = await this.constructor.generateRequestNumber();
    }
    
    // Añadir primer estado al historial
    this.history.push({
      status: this.status,
      changedBy: this.requestedBy,
      notes: 'Solicitud creada',
    });
  } else if (this.isModified('status')) {
    // Añadir cambio de estado al historial
    this.history.push({
      status: this.status,
      changedBy: this._lastModifiedBy || this.requestedBy, // Se debe establecer _lastModifiedBy antes de guardar
      notes: this._statusChangeNotes || '',
    });
  }
  
  next();
});

// Middleware para actualizar métricas del proyecto asociado
serviceRequestSchema.post('save', async function () {
  if (this.project) {
    const Project = mongoose.model('Project');
    await Project.updateMetrics(this.project);
  }
});

module.exports = mongoose.models.ServiceRequest || mongoose.model('ServiceRequest', serviceRequestSchema);