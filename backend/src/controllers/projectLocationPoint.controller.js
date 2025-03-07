const express = require('express');
const { check } = require('express-validator');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Controladores
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  uploadProjectPhotos,
} = require('../controllers/project.controller');

const {
  addMilestone,
  getMilestones,
  getMilestoneById,
  updateMilestone,
  deleteMilestone,
} = require('../controllers/milestone.controller');

const {
  addLocationPoint,
  getLocationPoints,
  getLocationPointById,
  updateLocationPoint,
  deleteLocationPoint,
} = require('../controllers/locationPoint.controller');

// Middlewares
const { protect, authorize } = require('../middlewares/auth.middleware');

// Configuración de multer para carga de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
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

// Rutas de proyectos
router
  .route('/')
  .post(
    [
      protect,
      authorize('admin'),
      check('name', 'El nombre es obligatorio').not().isEmpty(),
      check('location', 'La ubicación es obligatoria').not().isEmpty(),
    ],
    createProject
  )
  .get(protect, getProjects);

router
  .route('/:id')
  .get(protect, getProjectById)
  .put(
    [
      protect,
      authorize('admin'),
      check('name', 'El nombre es obligatorio').not().isEmpty(),
      check('location', 'La ubicación es obligatoria').not().isEmpty(),
    ],
    updateProject
  )
  .delete(protect, authorize('admin'), deleteProject);

// Rutas para fotos de proyectos
router.post(
  '/:id/photos',
  protect,
  authorize('admin', 'technician'),
  upload.array('photos', 10),
  uploadProjectPhotos
);

// Rutas para hitos de proyectos
router
  .route('/:projectId/milestones')
  .post(
    [
      protect,
      check('title', 'El título es obligatorio').not().isEmpty(),
      check('description', 'La descripción es obligatoria').not().isEmpty(),
    ],
    upload.array('attachments', 5),
    addMilestone
  )
  .get(protect, getMilestones);

router
  .route('/:projectId/milestones/:milestoneId')
  .get(protect, getMilestoneById)
  .put(
    [
      protect,
      check('title', 'El título es obligatorio').optional().not().isEmpty(),
      check('description', 'La descripción es obligatoria').optional().not().isEmpty(),
    ],
    upload.array('attachments', 5),
    updateMilestone
  )
  .delete(protect, deleteMilestone);

// Rutas para puntos de localización
router
  .route('/:projectId/location-points')
  .post(
    [
      protect,
      authorize('admin'),
      check('name', 'El nombre es obligatorio').not().isEmpty(),
      check('coordinates', 'Las coordenadas son obligatorias').isArray().notEmpty(),
    ],
    addLocationPoint
  )
  .get(protect, getLocationPoints);

router
  .route('/:projectId/location-points/:pointId')
  .get(protect, getLocationPointById)
  .put(
    [
      protect,
      authorize('admin'),
      check('name', 'El nombre es obligatorio').optional().not().isEmpty(),
    ],
    updateLocationPoint
  )
  .delete(protect, authorize('admin'), deleteLocationPoint);

module.exports = router;