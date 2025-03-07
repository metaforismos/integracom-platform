const mongoose = require('mongoose');

const renditionSchema = new mongoose.Schema(
  {
    folio: {
      type: String,
      required: true,
      unique: true,
    },
    serviceRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    description: {
      type: String,
      required: [true, 'La descripción es obligatoria'],
      trim: true,
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['Pendiente', 'Enviada', 'En revisión', 'Aprobada', 'Rechazada'],
      default: 'Pendiente',
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
      capturedAt: {
        type: Date,
        default: Date.now,
      },
    },
    workDetails: {
      startTime: Date,
      endTime: Date,
      materialsUsed: [
        {
          name: String,
          quantity: Number,
          unit: String,
        },
      ],
      workPerformed: String,
    },
    expenses: [
      {
        category: {
          type: String,
          required: true,
          trim: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        description: {
          type: String,
          trim: true,
        },
        paymentProof: {
          url: String,
          name: String,
          type: String, // usually pdf, image
          uploadedAt: {
            type: Date,
            default: Date.now,
          },
        },
      },
    ],
    attachments: [
      {
        url: String,
        name: String,
        type: String, // image, video, audio, document
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewDate: Date,
    reviewComments: String,
    rejectionReason: {
      type: String,
      enum: [
        'Falta documentación',
        'Montos incorrectos',
        'Categoría incorrecta',
        'Duplicado',
        'Gastos no autorizados',
        'Otros'
      ],
    },
    rejectionComments: String,
    offline: {
      type: Boolean,
      default: false,
    },
    syncedAt: Date,
  },
  { timestamps: true }
);

// Índices para búsquedas eficientes
renditionSchema.index({ folio: 1 }, { unique: true });
renditionSchema.index({ serviceRequest: 1 });
renditionSchema.index({ project: 1 });
renditionSchema.index({ technician: 1 });
renditionSchema.index({ status: 1 });
renditionSchema.index({ 'location.coordinates': '2dsphere' });

// Método para generar un folio único
renditionSchema.statics.generateFolio = async function() {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  
  // Obtener la última rendición para generar el número secuencial
  const lastRendition = await this.findOne({}, {}, { sort: { 'createdAt': -1 } });
  
  let sequenceNumber = 1;
  if (lastRendition && lastRendition.folio) {
    // Extraer el número secuencial del último folio
    const parts = lastRendition.folio.split('-');
    if (parts.length > 1) {
      sequenceNumber = parseInt(parts[parts.length - 1], 10) + 1;
    }
  }
  
  // Formatear como RND-YYMMDD-001
  return `RND-${year}${month}${day}-${sequenceNumber.toString().padStart(3, '0')}`;
};

// Middleware para generar el folio antes de guardar
renditionSchema.pre('save', async function (next) {
  if (this.isNew && !this.folio) {
    this.folio = await this.constructor.generateFolio();
  }
  
  // Si se aprueba la rendición, actualizar la solicitud de servicio
  if (this.isModified('status') && this.status === 'Aprobada') {
    const ServiceRequest = mongoose.model('ServiceRequest');
    const serviceRequest = await ServiceRequest.findById(this.serviceRequest);
    
    if (serviceRequest) {
      serviceRequest.status = 'Resuelta';
      serviceRequest._lastModifiedBy = this.reviewedBy;
      serviceRequest._statusChangeNotes = 'Actualizado automáticamente tras aprobación de rendición';
      await serviceRequest.save();
    }
  }
  
  next();
});

const Rendition = mongoose.model('Rendition', renditionSchema);

module.exports = Rendition;