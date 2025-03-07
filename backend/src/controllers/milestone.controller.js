const Project = require('../models/project.model');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// @desc    Agregar un nuevo hito a un proyecto
// @route   POST /api/projects/:projectId/milestones
// @access  Private
exports.addMilestone = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, description } = req.body;
    const projectId = req.params.projectId;

    // Verificar si el proyecto existe
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Verificar acceso según rol
    if (req.user.role === 'client' && !project.clients.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para modificar este proyecto',
      });
    }

    if (req.user.role === 'technician' && project.technician.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para modificar este proyecto',
      });
    }

    // Crear el nuevo hito
    const newMilestone = {
      title,
      description,
      createdBy: req.user._id,
      attachments: [],
    };

    // Manejar archivos adjuntos si hay
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        newMilestone.attachments.push({
          url: file.path, // ruta del archivo guardado
          name: file.originalname,
          type: file.mimetype,
          uploadedBy: req.user._id,
        });
      }
    }

    // Agregar el hito al proyecto
    project.milestones.push(newMilestone);
    await project.save();

    // Enviar notificación a usuarios relevantes
    await notifyMilestoneCreation(project, newMilestone, req.user);

    res.status(201).json({
      success: true,
      data: project.milestones[project.milestones.length - 1],
    });
  } catch (error) {
    console.error('Error al agregar hito:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar hito al proyecto',
      error: error.message,
    });
  }
};

// @desc    Obtener todos los hitos de un proyecto
// @route   GET /api/projects/:projectId/milestones
// @access  Private
exports.getMilestones = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    // Verificar si el proyecto existe
    const project = await Project.findById(projectId)
      .populate({
        path: 'milestones.createdBy',
        select: 'firstName lastName email',
      });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Verificar acceso según rol
    if (!project.hasAccess(req.user._id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para ver este proyecto',
      });
    }

    res.status(200).json({
      success: true,
      count: project.milestones.length,
      data: project.milestones,
    });
  } catch (error) {
    console.error('Error al obtener hitos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener hitos del proyecto',
      error: error.message,
    });
  }
};

// @desc    Obtener un hito específico de un proyecto
// @route   GET /api/projects/:projectId/milestones/:milestoneId
// @access  Private
exports.getMilestoneById = async (req, res) => {
  try {
    const { projectId, milestoneId } = req.params;

    // Verificar si el proyecto existe
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Verificar acceso según rol
    if (!project.hasAccess(req.user._id, req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para ver este proyecto',
      });
    }

    // Encontrar el hito específico
    const milestone = project.milestones.id(milestoneId);

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Hito no encontrado',
      });
    }

    res.status(200).json({
      success: true,
      data: milestone,
    });
  } catch (error) {
    console.error('Error al obtener hito:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener hito del proyecto',
      error: error.message,
    });
  }
};

// @desc    Actualizar un hito de un proyecto
// @route   PUT /api/projects/:projectId/milestones/:milestoneId
// @access  Private
exports.updateMilestone = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { projectId, milestoneId } = req.params;
    const { title, description } = req.body;

    // Verificar si el proyecto existe
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Verificar acceso según rol y solo permitir al creador del hito o admin
    const milestone = project.milestones.id(milestoneId);
    
    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Hito no encontrado',
      });
    }

    if (
      req.user.role !== 'admin' && 
      milestone.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para modificar este hito',
      });
    }

    // Actualizar el hito
    milestone.title = title || milestone.title;
    milestone.description = description || milestone.description;

    // Manejar archivos adjuntos si hay nuevos
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        milestone.attachments.push({
          url: file.path,
          name: file.originalname,
          type: file.mimetype,
          uploadedBy: req.user._id,
        });
      }
    }

    await project.save();

    res.status(200).json({
      success: true,
      data: milestone,
    });
  } catch (error) {
    console.error('Error al actualizar hito:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar hito del proyecto',
      error: error.message,
    });
  }
};

// @desc    Eliminar un hito de un proyecto
// @route   DELETE /api/projects/:projectId/milestones/:milestoneId
// @access  Private
exports.deleteMilestone = async (req, res) => {
  try {
    const { projectId, milestoneId } = req.params;

    // Verificar si el proyecto existe
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Encontrar el hito
    const milestone = project.milestones.id(milestoneId);
    
    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Hito no encontrado',
      });
    }

    // Verificar permisos (solo admin o el creador pueden eliminar)
    if (
      req.user.role !== 'admin' && 
      milestone.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para eliminar este hito',
      });
    }

    // Eliminar el hito
    project.milestones.pull(milestoneId);
    await project.save();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Hito eliminado correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar hito:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar hito del proyecto',
      error: error.message,
    });
  }
};

// Función auxiliar para notificar la creación de hitos
async function notifyMilestoneCreation(project, milestone, creator) {
  try {
    const Notification = mongoose.model('Notification');
    
    // Notificar a los clientes del proyecto
    if (project.clients && project.clients.length > 0) {
      for (const clientId of project.clients) {
        await Notification.createNotification({
          recipient: clientId,
          title: 'Nuevo hito en proyecto',
          message: `Se ha agregado un nuevo hito "${milestone.title}" al proyecto "${project.name}"`,
          type: 'info',
          relatedTo: {
            model: 'Project',
            id: project._id,
          },
          link: `/projects/${project._id}`,
        });
      }
    }
    
    // Notificar al técnico asignado si no es el creador
    if (
      project.technician && 
      creator._id.toString() !== project.technician.toString()
    ) {
      await Notification.createNotification({
        recipient: project.technician,
        title: 'Nuevo hito en proyecto',
        message: `Se ha agregado un nuevo hito "${milestone.title}" al proyecto "${project.name}"`,
        type: 'info',
        relatedTo: {
          model: 'Project',
          id: project._id,
        },
        link: `/projects/${project._id}`,
      });
    }
    
  } catch (error) {
    console.error('Error al enviar notificaciones de hito:', error);
    // No lanzamos error para no interrumpir el flujo principal
  }
}