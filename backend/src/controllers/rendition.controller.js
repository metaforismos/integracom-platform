const Rendition = require('../models/rendition.model');
const ServiceRequest = require('../models/serviceRequest.model');
const Project = require('../models/project.model');
const ExpenseCategory = require('../models/expenseCategory.model');
const Notification = require('../models/notification.model');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// @desc    Crear una nueva rendición
// @route   POST /api/renditions
// @access  Private/Technician
exports.createRendition = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      serviceRequest,
      description,
      workDetails,
      offline,
      location,
    } = req.body;

    // Verificar si la solicitud existe
    const srExists = await ServiceRequest.findById(serviceRequest);
    if (!srExists) {
      return res.status(404).json({
        success: false,
        message: 'Solicitud de servicio no encontrada',
      });
    }

    // Verificar acceso (solo técnicos asignados a la solicitud pueden crear rendiciones)
    if (
      srExists.assignedTo &&
      srExists.assignedTo.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'No está autorizado para crear rendiciones para esta solicitud',
      });
    }

    // Crear la rendición
    const rendition = new Rendition({
      serviceRequest,
      project: srExists.project,
      description,
      technician: req.user._id,
      workDetails: workDetails || {},
      offline: offline || false,
      location: location || {
        type: 'Point',
        coordinates: [0, 0],
      },
    });

    // Si hay archivos adjuntos desde multer, añadirlos
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        rendition.attachments.push({
          url: `/uploads/${file.filename}`,
          name: file.originalname,
          type: file.mimetype,
        });
      }
    }

    // Generar folio único
    rendition.folio = await Rendition.generateFolio();

    // Si se específica hora de inicio/fin
    if (req.body.startTime) {
      rendition.workDetails.startTime = new Date(req.body.startTime);
    }
    
    if (req.body.endTime) {
      rendition.workDetails.endTime = new Date(req.body.endTime);
    }

    // Guardar la rendición
    await rendition.save();

    // Actualizar la solicitud para incluir la rendición
    srExists.renditions.push(rendition._id);
    await srExists.save();

    // Notificar a los administradores
    await notifyNewRendition(rendition, srExists);

    res.status(201).json({
      success: true,
      data: rendition,
    });
  } catch (error) {
    console.error('Error al crear rendición:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la rendición',
      error: error.message,
    });
  }
};

// @desc    Obtener todas las rendiciones
// @route   GET /api/renditions
// @access  Private
exports.getRenditions = async (req, res) => {
  try {
    let query = {};

    // Filtrar por rol del usuario
    if (req.user.role === 'technician') {
      // Técnicos solo ven sus propias rendiciones
      query.technician = req.user._id;
    }

    // Filtros adicionales
    if (req.query.project) {
      query.project = req.query.project;
    }

    if (req.query.serviceRequest) {
      query.serviceRequest = req.query.serviceRequest;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.search) {
      query.$or = [
        { folio: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // Paginación
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Ejecutar consulta
    const renditions = await Rendition.find(query)
      .populate('project', 'name location')
      .populate('serviceRequest', 'requestNumber title status')
      .populate('technician', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName email')
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Obtener total de documentos para paginación
    const total = await Rendition.countDocuments(query);

    res.status(200).json({
      success: true,
      count: renditions.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
      data: renditions,
    });
  } catch (error) {
    console.error('Error al obtener rendiciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las rendiciones',
      error: error.message,
    });
  }
};

// @desc    Obtener una rendición por ID
// @route   GET /api/renditions/:id
// @access  Private
exports.getRenditionById = async (req, res) => {
  try {
    const rendition = await Rendition.findById(req.params.id)
      .populate('project', 'name location')
      .populate('serviceRequest', 'requestNumber title status')
      .populate('technician', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName email');

    if (!rendition) {
      return res.status(404).json({
        success: false,
        message: 'Rendición no encontrada',
      });
    }

    // Verificar acceso según rol
    if (req.user.role === 'technician' && rendition.technician.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para ver esta rendición',
      });
    } else if (req.user.role === 'client') {
      // Los clientes no pueden ver rendiciones
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para ver rendiciones',
      });
    }

    res.status(200).json({
      success: true,
      data: rendition,
    });
  } catch (error) {
    console.error('Error al obtener rendición:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la rendición',
      error: error.message,
    });
  }
};

// @desc    Actualizar una rendición
// @route   PUT /api/renditions/:id
// @access  Private/Technician
exports.updateRendition = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      description,
      workDetails,
    } = req.body;

    const rendition = await Rendition.findById(req.params.id);

    if (!rendition) {
      return res.status(404).json({
        success: false,
        message: 'Rendición no encontrada',
      });
    }

    // Solo el técnico que creó la rendición puede actualizarla y solo si no está aprobada/rechazada
    if (rendition.technician.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para actualizar esta rendición',
      });
    }

    if (rendition.status === 'Aprobada' || rendition.status === 'Rechazada') {
      return res.status(400).json({
        success: false,
        message: 'No se puede modificar una rendición que ya ha sido aprobada o rechazada',
      });
    }

    // Actualizar los campos
    if (description) rendition.description = description;
    
    if (workDetails) {
      if (workDetails.workPerformed) rendition.workDetails.workPerformed = workDetails.workPerformed;
      
      if (workDetails.materialsUsed && Array.isArray(workDetails.materialsUsed)) {
        rendition.workDetails.materialsUsed = workDetails.materialsUsed;
      }
    }

    if (req.body.startTime) {
      rendition.workDetails.startTime = new Date(req.body.startTime);
    }
    
    if (req.body.endTime) {
      rendition.workDetails.endTime = new Date(req.body.endTime);
    }

    // Si hay archivos adjuntos nuevos, añadirlos
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        rendition.attachments.push({
          url: `/uploads/${file.filename}`,
          name: file.originalname,
          type: file.mimetype,
        });
      }
    }

    // Actualizar estado a Enviada si estaba Pendiente
    if (rendition.status === 'Pendiente') {
      rendition.status = 'Enviada';
    }

    await rendition.save();

    res.status(200).json({
      success: true,
      data: rendition,
    });
  } catch (error) {
    console.error('Error al actualizar rendición:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la rendición',
      error: error.message,
    });
  }
};

// @desc    Eliminar una rendición
// @route   DELETE /api/renditions/:id
// @access  Private/Admin,Technician
exports.deleteRendition = async (req, res) => {
  try {
    const rendition = await Rendition.findById(req.params.id);

    if (!rendition) {
      return res.status(404).json({
        success: false,
        message: 'Rendición no encontrada',
      });
    }

    // Verificar permisos
    if (
      req.user.role !== 'admin' &&
      (req.user.role !== 'technician' || rendition.technician.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para eliminar esta rendición',
      });
    }

    // No permitir eliminar rendiciones aprobadas
    if (rendition.status === 'Aprobada') {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una rendición aprobada',
      });
    }

    // Eliminar la referencia de la solicitud de servicio
    await ServiceRequest.findByIdAndUpdate(
      rendition.serviceRequest,
      { $pull: { renditions: rendition._id } }
    );

    await rendition.remove();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Rendición eliminada correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar rendición:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la rendición',
      error: error.message,
    });
  }
};

// @desc    Aprobar una rendición
// @route   PUT /api/renditions/:id/approve
// @access  Private/Admin
exports.approveRendition = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { reviewComments } = req.body;

    const rendition = await Rendition.findById(req.params.id);

    if (!rendition) {
      return res.status(404).json({
        success: false,
        message: 'Rendición no encontrada',
      });
    }

    // Solo administradores pueden aprobar
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo administradores pueden aprobar rendiciones',
      });
    }

    // Verificar que no esté ya aprobada
    if (rendition.status === 'Aprobada') {
      return res.status(400).json({
        success: false,
        message: 'Esta rendición ya ha sido aprobada',
      });
    }

    // Actualizar estado
    rendition.status = 'Aprobada';
    rendition.reviewedBy = req.user._id;
    rendition.reviewDate = Date.now();
    
    if (reviewComments) {
      rendition.reviewComments = reviewComments;
    }

    await rendition.save();

    // Notificar al técnico
    await Notification.createNotification({
      recipient: rendition.technician,
      title: 'Rendición aprobada',
      message: `Su rendición ${rendition.folio} ha sido aprobada`,
      type: 'success',
      relatedTo: {
        model: 'Rendition',
        id: rendition._id,
      },
      link: `/renditions/${rendition._id}`,
    });

    res.status(200).json({
      success: true,
      data: rendition,
    });
  } catch (error) {
    console.error('Error al aprobar rendición:', error);
    res.status(500).json({
      success: false,
      message: 'Error al aprobar la rendición',
      error: error.message,
    });
  }
};

// @desc    Rechazar una rendición
// @route   PUT /api/renditions/:id/reject
// @access  Private/Admin
exports.rejectRendition = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { rejectionReason, rejectionComments } = req.body;

    const rendition = await Rendition.findById(req.params.id);

    if (!rendition) {
      return res.status(404).json({
        success: false,
        message: 'Rendición no encontrada',
      });
    }

    // Solo administradores pueden rechazar
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para rechazar rendiciones',
      });
    }

    // Verificar que no esté ya aprobada
    if (rendition.status === 'Aprobada') {
      return res.status(400).json({
        success: false,
        message: 'No se puede rechazar una rendición ya aprobada',
      });
    }

    // Actualizar estado
    rendition.status = 'Rechazada';
    rendition.reviewedBy = req.user._id;
    rendition.reviewDate = Date.now();
    rendition.rejectionReason = rejectionReason;
    rendition.rejectionComments = rejectionComments;

    await rendition.save();

    // Notificar al técnico
    await Notification.createNotification({
      recipient: rendition.technician,
      title: 'Rendición rechazada',
      message: `Su rendición ${rendition.folio} ha sido rechazada: ${rejectionReason}`,
      type: 'error',
      relatedTo: {
        model: 'Rendition',
        id: rendition._id,
      },
      link: `/renditions/${rendition._id}`,
    });

    res.status(200).json({
      success: true,
      data: rendition,
    });
  } catch (error) {
    console.error('Error al rechazar rendición:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar la rendición',
      error: error.message,
    });
  }
};

// @desc    Agregar un gasto a una rendición
// @route   POST /api/renditions/:id/expenses
// @access  Private/Technician
exports.addExpense = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { category, amount, description } = req.body;

    const rendition = await Rendition.findById(req.params.id);

    if (!rendition) {
      return res.status(404).json({
        success: false,
        message: 'Rendición no encontrada',
      });
    }

    // Verificar permisos
    if (req.user.role !== 'technician' || rendition.technician.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para agregar gastos a esta rendición',
      });
    }

    // Verificar que la rendición no esté aprobada o rechazada
    if (rendition.status === 'Aprobada' || rendition.status === 'Rechazada') {
      return res.status(400).json({
        success: false,
        message: 'No se pueden agregar gastos a una rendición aprobada o rechazada',
      });
    }

    // Verificar que la categoría exista (opcional)
    try {
      await ExpenseCategory.findOne({ name: category, active: true });
    } catch (error) {
      console.log('Categoría no encontrada, pero permitimos continuar');
    }

    // Crear el objeto de gasto
    const expense = {
      category,
      amount: parseFloat(amount),
      description,
    };

    // Si hay comprobante de pago, añadirlo
    if (req.file) {
      expense.paymentProof = {
        url: `/uploads/${req.file.filename}`,
        name: req.file.originalname,
        type: req.file.mimetype,
      };
    }

    // Agregar el gasto a la rendición
    rendition.expenses.push(expense);

    // Actualizar estado a Enviada si estaba Pendiente
    if (rendition.status === 'Pendiente') {
      rendition.status = 'Enviada';
    }

    await rendition.save();

    res.status(200).json({
      success: true,
      data: rendition.expenses[rendition.expenses.length - 1],
      message: 'Gasto agregado correctamente',
    });
  } catch (error) {
    console.error('Error al agregar gasto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar gasto a la rendición',
      error: error.message,
    });
  }
};

// @desc    Subir archivos adjuntos a una rendición
// @route   POST /api/renditions/:id/attachments
// @access  Private/Technician
exports.uploadAttachments = async (req, res) => {
  try {
    const rendition = await Rendition.findById(req.params.id);

    if (!rendition) {
      return res.status(404).json({
        success: false,
        message: 'Rendición no encontrada',
      });
    }

    // Verificar permisos
    if (req.user.role !== 'technician' || rendition.technician.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para agregar archivos a esta rendición',
      });
    }

    // Verificar que la rendición no esté aprobada o rechazada
    if (rendition.status === 'Aprobada' || rendition.status === 'Rechazada') {
      return res.status(400).json({
        success: false,
        message: 'No se pueden agregar archivos a una rendición aprobada o rechazada',
      });
    }

    // Verificar si hay archivos
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se han subido archivos',
      });
    }

    // Agregar archivos
    for (const file of req.files) {
      rendition.attachments.push({
        url: `/uploads/${file.filename}`,
        name: file.originalname,
        type: file.mimetype,
      });
    }

    // Actualizar estado a Enviada si estaba Pendiente
    if (rendition.status === 'Pendiente') {
      rendition.status = 'Enviada';
    }

    await rendition.save();

    res.status(200).json({
      success: true,
      data: rendition.attachments,
      message: `${req.files.length} archivo(s) subido(s) correctamente`,
    });
  } catch (error) {
    console.error('Error al subir archivos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir archivos a la rendición',
      error: error.message,
    });
  }
};

// Funciones auxiliares para notificaciones

// Notificar nueva rendición
async function notifyNewRendition(rendition, serviceRequest) {
  try {
    // Notificar a los administradores
    const admins = await User.find({ role: 'admin' });
    
    for (const admin of admins) {
      await Notification.createNotification({
        recipient: admin._id,
        title: 'Nueva rendición para revisar',
        message: `Se ha creado una nueva rendición: ${rendition.folio} para la solicitud ${serviceRequest.requestNumber}`,
        type: 'info',
        relatedTo: {
          model: 'Rendition',
          id: rendition._id,
        },
        link: `/renditions/${rendition._id}`,
      });
    }
  } catch (error) {
    console.error('Error al enviar notificaciones de nueva rendición:', error);
  }
}