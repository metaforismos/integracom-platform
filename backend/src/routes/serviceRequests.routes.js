const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Middleware
const { protect, authorize } = require('../middlewares/auth.middleware');

// Controladores
const {
  createServiceRequest,
  getServiceRequests,
  getServiceRequestById,
  updateServiceRequest,
  deleteServiceRequest,
  addComment,
  uploadAttachments,
  changeStatus,
} = require('../controllers/serviceRequest.controller');

// Configuración de multer para carga de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'sr-' + uniqueSuffix + ext);
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

// Rutas de solicitudes de servicio
router
  .route('/')
  .post(
    [
      protect,
      check('project', 'El proyecto es obligatorio').isMongoId(),
      check('title', 'El título es obligatorio').not().isEmpty(),
      check('description', 'La descripción es obligatoria').not().isEmpty(),
    ],
    createServiceRequest
  )
  .get(protect, getServiceRequests);

router
  .route('/:id')
  .get(protect, getServiceRequestById)
  .put(
    [
      protect,
      authorize('admin'),
      check('title', 'El título es obligatorio').optional().not().isEmpty(),
      check('description', 'La descripción es obligatoria').optional().not().isEmpty(),
    ],
    updateServiceRequest
  )
  .delete(protect, authorize('admin'), deleteServiceRequest);

// Ruta para cambiar estado
router.put(
  '/:id/status',
  [
    protect,
    authorize('admin', 'technician'),
    check('status', 'El estado es obligatorio').isIn([
      'Solicitada',
      'En revisión',
      'Aceptada',
      'Finalizada',
      'Cancelada',
    ]),
    check('notes', 'Las notas son obligatorias').optional().not().isEmpty(),
  ],
  changeStatus
);

// Ruta para agregar comentarios
router.post(
  '/:id/comments',
  [
    protect,
    check('text', 'El comentario es obligatorio').not().isEmpty(),
  ],
  addComment
);

// Ruta para subir archivos adjuntos
router.post(
  '/:id/attachments',
  protect,
  upload.array('files', 10),
  uploadAttachments
);

module.exports = router;