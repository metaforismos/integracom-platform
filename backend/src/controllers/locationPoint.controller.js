const Project = require('../models/project.model');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// @desc    Agregar un nuevo punto de localización a un proyecto
// @route   POST /api/projects/:projectId/location-points
// @access  Private/Admin
exports.addLocationPoint = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, type, description, coordinates } = req.body;
    const projectId = req.params.projectId;

    // Verificar si el proyecto existe
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Crear el nuevo punto de localización
    const newLocationPoint = {
      name,
      type: type || 'Otro',
      description,
      coordinates: {
        type: 'Point',
        coordinates: coordinates, // Debe ser [longitude, latitude]
      },
      createdBy: req.user._id,
    };

    // Agregar el punto al proyecto
    project.locationPoints.push(newLocationPoint);
    await project.save();

    res.status(201).json({
      success: true,
      data: project.locationPoints[project.locationPoints.length - 1],
      message: 'Punto de localización agregado correctamente',
    });
  } catch (error) {
    console.error('Error al agregar punto de localización:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar punto de localización al proyecto',
      error: error.message,
    });
  }
};

// @desc    Obtener todos los puntos de localización de un proyecto
// @route   GET /api/projects/:projectId/location-points
// @access  Private
exports.getLocationPoints = async (req, res) => {
  try {
    const projectId = req.params.projectId;

    // Verificar si el proyecto existe
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    res.status(200).json({
      success: true,
      count: project.locationPoints.length,
      data: project.locationPoints,
    });
  } catch (error) {
    console.error('Error al obtener puntos de localización:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener puntos de localización del proyecto',
      error: error.message,
    });
  }
};

// @desc    Obtener un punto de localización específico de un proyecto
// @route   GET /api/projects/:projectId/location-points/:pointId
// @access  Private
exports.getLocationPointById = async (req, res) => {
  try {
    const { projectId, pointId } = req.params;

    // Verificar si el proyecto existe
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Encontrar el punto específico
    const locationPoint = project.locationPoints.id(pointId);
    if (!locationPoint) {
      return res.status(404).json({
        success: false,
        message: 'Punto de localización no encontrado',
      });
    }

    res.status(200).json({
      success: true,
      data: locationPoint,
    });
  } catch (error) {
    console.error('Error al obtener punto de localización:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener punto de localización del proyecto',
      error: error.message,
    });
  }
};

// @desc    Actualizar un punto de localización de un proyecto
// @route   PUT /api/projects/:projectId/location-points/:pointId
// @access  Private/Admin
exports.updateLocationPoint = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { projectId, pointId } = req.params;
    const { name, type, description, coordinates } = req.body;

    // Verificar si el proyecto existe
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Encontrar y actualizar el punto
    const locationPoint = project.locationPoints.id(pointId);
    if (!locationPoint) {
      return res.status(404).json({
        success: false,
        message: 'Punto de localización no encontrado',
      });
    }

    // Actualizar campos
    if (name) locationPoint.name = name;
    if (type) locationPoint.type = type;
    if (description !== undefined) locationPoint.description = description;
    if (coordinates) {
      locationPoint.coordinates = {
        type: 'Point',
        coordinates: coordinates,
      };
    }

    await project.save();

    res.status(200).json({
      success: true,
      data: locationPoint,
      message: 'Punto de localización actualizado correctamente',
    });
  } catch (error) {
    console.error('Error al actualizar punto de localización:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar punto de localización del proyecto',
      error: error.message,
    });
  }
};

// @desc    Eliminar un punto de localización de un proyecto
// @route   DELETE /api/projects/:projectId/location-points/:pointId
// @access  Private/Admin
exports.deleteLocationPoint = async (req, res) => {
  try {
    const { projectId, pointId } = req.params;

    // Verificar si el proyecto existe
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Proyecto no encontrado',
      });
    }

    // Encontrar el punto
    const locationPoint = project.locationPoints.id(pointId);
    if (!locationPoint) {
      return res.status(404).json({
        success: false,
        message: 'Punto de localización no encontrado',
      });
    }

    // Eliminar el punto
    project.locationPoints.pull(pointId);
    await project.save();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Punto de localización eliminado correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar punto de localización:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar punto de localización del proyecto',
      error: error.message,
    });
  }
};