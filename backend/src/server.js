const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Importación de rutas
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const projectRoutes = require('./routes/project.routes');
const serviceRequestRoutes = require('./routes/serviceRequest.routes');
const renditionRoutes = require('./routes/rendition.routes');
const reportRoutes = require('./routes/report.routes');
const notificationRoutes = require('./routes/notification.routes');

// Inicializar app
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));
app.use(helmet());

// Carpeta pública para archivos
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Rutas base
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/service-requests', serviceRequestRoutes);
app.use('/api/renditions', renditionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API de Integracom funcionando correctamente');
});

// Conexión a la base de datos
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Conexión a MongoDB establecida');
    
    // Inicializar datos predeterminados
    try {
      const ExpenseCategory = require('./models/expenseCategory.model');
      await ExpenseCategory.initDefaultCategories();
      console.log('Categorías de gastos inicializadas');
    } catch (err) {
      console.error('Error al inicializar categorías de gastos:', err.message);
    }
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error al conectar a MongoDB:', err.message);
  });

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Error en el servidor', error: err.message });
});

module.exports = app;