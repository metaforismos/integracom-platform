const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const { 
  register, 
  login, 
  getMe,
  forgotPassword 
} = require('../controllers/auth.controller');
const { protect, authorize } = require('../middlewares/auth.middleware');

// Ruta de registro - solo admin puede registrar usuarios
router.post(
  '/register',
  [
    protect, 
    authorize('admin'),
    check('firstName', 'El nombre es obligatorio').not().isEmpty(),
    check('lastName', 'El apellido es obligatorio').not().isEmpty(),
    check('email', 'Por favor incluya un email válido').isEmail(),
    check('password', 'Por favor ingrese una contraseña de 6 o más caracteres').isLength({ min: 6 }),
  ],
  register
);

// Ruta de login
router.post(
  '/login',
  [
    check('email', 'Por favor incluya un email válido').isEmail(),
    check('password', 'La contraseña es obligatoria').exists(),
  ],
  login
);

// Obtener usuario actual
router.get('/me', protect, getMe);

// Olvidó contraseña
router.post(
  '/forgot-password',
  [
    check('email', 'Por favor incluya un email válido').isEmail(),
  ],
  forgotPassword
);

module.exports = router;