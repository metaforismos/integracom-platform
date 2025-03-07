require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/user.models');

const createAdminUser = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conexión a MongoDB establecida');

    // Verificar si ya existe un administrador
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (adminExists) {
      console.log('Ya existe un usuario administrador en la base de datos');
      await mongoose.connection.close();
      return;
    }

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

    // Cerrar conexión
    await mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Ejecutar función
createAdminUser();