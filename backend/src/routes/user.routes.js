const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Controladores
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  uploadProfilePicture,
  resetUserPassword,
  updateProfile,
} = require('../controllers/user.controller');

// Middleware
const { protect, authorize } = require('../middlewares/auth.middleware');

// Configuración de multer para carga de imágenes de perfil
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/uploads/profiles/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'profile-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  // Aceptar solo imágenes
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: fileFilter,
});

// Rutas de usuarios
router
  .route('/')
  .get(protect, authorize('admin'), getUsers)
  .post(
    [
      protect,
      authorize('admin'),
      check('firstName', 'El nombre es obligatorio').not().isEmpty(),
      check('lastName', 'El apellido es obligatorio').not().isEmpty(),
      check('email', 'Por favor incluya un email válido').isEmail(),
      check('password', 'Por favor ingrese una contraseña de 6 o más caracteres').isLength({ min: 6 }),
      check('role', 'El rol es obligatorio').isIn(['admin', 'client', 'technician']),
    ],
    createUser
  );

router
  .route('/:id')
  .get(protect, getUserById)
  .put(
    [
      protect,
      authorize('admin'),
      check('firstName', 'El nombre es obligatorio').optional().not().isEmpty(),
      check('lastName', 'El apellido es obligatorio').optional().not().isEmpty(),
      check('email', 'Por favor incluya un email válido').optional().isEmail(),
      check('role', 'El rol es obligatorio').optional().isIn(['admin', 'client', 'technician']),
    ],
    updateUser
  )
  .delete(protect, authorize('admin'), deleteUser);

// Ruta para subir imagen de perfil
router.put(
  '/:id/profile-picture',
  protect,
  upload.single('profilePicture'),
  uploadProfilePicture
);

// Ruta para restablecer contraseña (solo admin)
router.put(
  '/:id/reset-password',
  [
    protect,
    authorize('admin'),
    check('newPassword', 'La nueva contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
  ],
  resetUserPassword
);

// Ruta para actualizar perfil propio (cualquier usuario)
router.put(
  '/profile/update',
  [
    protect,
    check('firstName', 'El nombre es obligatorio').optional().not().isEmpty(),
    check('lastName', 'El apellido es obligatorio').optional().not().isEmpty(),
    check('phone', 'El teléfono es inválido').optional().isMobilePhone(),
    check('currentPassword', 'La contraseña actual es obligatoria para cambiar la contraseña').optional(),
    check('newPassword', 'La nueva contraseña debe tener al menos 6 caracteres').optional().isLength({ min: 6 }),
  ],
  updateProfile
);

module.exports = router;