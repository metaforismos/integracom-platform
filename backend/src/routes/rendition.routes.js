const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Middleware
const { protect, authorize } = require('../middlewares/auth.middleware');

// Controladores
const {
  createRendition,
  getRenditions,
  getRenditionById,
  updateRendition,
  deleteRendition,
  approveRendition,
  rejectRendition,
  addExpense,
  uploadAttachments,
} = require('../controllers/rendition.controller');

// Configuración de multer para carga de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'rendition-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  // Aceptar imágenes, PDFs, videos y documentos
  if (
    file.mimetype.startsWith('image/') ||
    file.mimetype === 'application/pdf' ||
    file.mimetype.startsWith('video/') ||
    file.mimetype === 'application/msword' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.mimetype === 'application/vnd.ms-excel' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Formato de archivo no soportado'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
  fileFilter: fileFilter,
});

// Rutas de rendiciones
router
  .route('/')
  .post(
    [
      protect,
      authorize('technician'),
      check('serviceRequest', 'La solicitud de servicio es obligatoria').isMongoId(),
      check('description', 'La descripción es obligatoria').not().isEmpty(),
    ],
    createRendition
  )
  .get(protect, getRenditions);

router
  .route('/:id')
  .get(protect, getRenditionById)
  .put(
    [
      protect,
      authorize('technician'),
      check('description', 'La descripción es obligatoria').optional().not().isEmpty(),
    ],
    updateRendition
  )
  .delete(protect, authorize('admin', 'technician'), deleteRendition);

// Ruta para aprobar rendición
router.put(
  '/:id/approve',
  [
    protect,
    authorize('admin'),
    check('reviewComments', 'Los comentarios son opcionales').optional(),
  ],
  approveRendition
);

// Ruta para rechazar rendición
router.put(
  '/:id/reject',
  [
    protect,
    authorize('admin'),
    check('rejectionReason', 'El motivo de rechazo es obligatorio').isIn([
      'Falta documentación',
      'Montos incorrectos',
      'Categoría incorrecta',
      'Duplicado',
      'Gastos no autorizados',
      'Otros'
    ]),
    check('rejectionComments', 'Los comentarios de rechazo son obligatorios').not().isEmpty(),
  ],
  rejectRendition
);

// Ruta para agregar gastos
router.post(
  '/:id/expenses',
  [
    protect,
    authorize('technician'),
    check('category', 'La categoría es obligatoria').not().isEmpty(),
    check('amount', 'El monto es obligatorio').isNumeric(),
    check('description', 'La descripción es obligatoria').not().isEmpty(),
  ],
  upload.single('paymentProof'),
  addExpense
);

// Ruta para subir archivos adjuntos
router.post(
  '/:id/attachments',
  protect,
  authorize('technician'),
  upload.array('files', 10),
  uploadAttachments
);

module.exports = router;