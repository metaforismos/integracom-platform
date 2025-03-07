require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const ExpenseCategory = require('../models/expenseCategory.model');
const User = require('../models/user.models');

// Función para inicializar las categorías de gastos
async function initializeExpenseCategories() {
  try {
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
    const count = await ExpenseCategory.countDocuments();
    if (count === 0) {
      // Si no hay categorías, insertar las predeterminadas
      await ExpenseCategory.insertMany(defaultCategories);
      console.log('Categorías de gastos predeterminadas inicializadas');
    } else {
      console.log('Ya existen categorías de gastos en la base de datos');
    }
  } catch (error) {
    console.error('Error al inicializar categorías de gastos:', error);
  }
}

// Función para inicializar usuario administrador
async function initializeAdminUser() {
  try {
    // Verificar si existe usuario admin
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      // Crear usuario administrador
      const adminUser = new User({
        firstName: 'Admin',
        lastName: 'Integracom',
        email: 'admin@integracom.cl',
        password: 'Admin123!',
        role: 'admin',
        phone: '+56912345678',
        active: true
      });

      await adminUser.save();
      console.log('Usuario administrador creado exitosamente:');
      console.log('Email: admin@integracom.cl');
      console.log('Contraseña: Admin123!');
      console.log('Por favor, cambie esta contraseña después del primer inicio de sesión');
    } else {
      console.log('Ya existe un usuario administrador en la base de datos');
    }
  } catch (error) {
    console.error('Error al inicializar usuario administrador:', error);
  }
}

// Inicializar datos predeterminados
const initializeData = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/integracom');
    console.log('Conexión a MongoDB establecida');

    // Inicializar categorías de gastos
    await initializeExpenseCategories();
    
    // Inicializar usuario administrador
    await initializeAdminUser();

    console.log('Inicialización de datos completada');
    await mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada');
  } catch (error) {
    console.error('Error en la inicialización de datos:', error);
    process.exit(1);
  }
};

// Ejecutar inicialización
initializeData();