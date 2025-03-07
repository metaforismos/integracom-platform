const mongoose = require('mongoose');

const expenseCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la categoría es obligatorio'],
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

// Método estático para inicializar categorías predeterminadas
expenseCategorySchema.statics.initDefaultCategories = async function() {
  const defaultCategories = [
    { name: 'Gastos de combustible/petróleo', description: 'Gastos relacionados con combustible para vehículos', active: true },
    { name: 'Alimentación', description: 'Gastos de alimentación durante el servicio', active: true },
    { name: 'Materiales', description: 'Compra de materiales para el proyecto', active: true },
    { name: 'Hospedaje', description: 'Gastos de alojamiento durante el servicio', active: true },
    { name: 'Transporte', description: 'Gastos de transporte público o peajes', active: true },
    { name: 'Herramientas', description: 'Compra o alquiler de herramientas', active: true },
    { name: 'Otros', description: 'Otros gastos no categorizados', active: true }
  ];
  
  // Verificar si ya existen categorías
  const count = await this.countDocuments();
  if (count === 0) {
    // Si no hay categorías, insertar las predeterminadas
    await this.insertMany(defaultCategories);
    console.log('Categorías de gastos predeterminadas inicializadas');
  }
};

// Índice para búsqueda

const ExpenseCategory = mongoose.model('ExpenseCategory', expenseCategorySchema);

module.exports = ExpenseCategory;