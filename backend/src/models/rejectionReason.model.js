const mongoose = require('mongoose');

const rejectionReasonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del motivo es obligatorio'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Índice para búsqueda
rejectionReasonSchema.index({ name: 1 });

const RejectionReason = mongoose.model('RejectionReason', rejectionReasonSchema);

module.exports = RejectionReason;