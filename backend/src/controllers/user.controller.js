const User = require('../models/user.models');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// @desc    Obtener todos los usuarios
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    // Filtros
    let query = {};
    
    if (req.query.role) {
      query.role = req.query.role;
    }
    
    if (req.query.active) {
      query.active = req.query.active === 'true';
    }
    
    if (req.query.search) {
      query.$or = [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // Paginación
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Ejecutar consulta
    const users = await User.find(query)
      .select('-password')
      .populate({
        path: 'projects',
        select: 'name location',
      })
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Obtener total de documentos para paginación
    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
      data: users,
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error.message,
    });
  }
};

// @desc    Obtener un usuario por ID
// @route   GET /api/users/:id
// @access  Private
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate({
        path: 'projects',
        select: 'name location status',
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Verificar permisos - solo admin puede ver cualquier usuario
    // Otros usuarios solo pueden verse a sí mismos
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para ver este usuario',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuario',
      error: error.message,
    });
  }
};

// @desc    Crear un nuevo usuario
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      phone,
      projects,
    } = req.body;

    // Verificar si el usuario ya existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'El usuario con ese email ya existe',
      });
    }

    // Crear usuario
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      role,
      phone,
      projects: projects || [],
    });

    await user.save();

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear usuario',
      error: error.message,
    });
  }
};

// @desc    Actualizar un usuario
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      firstName,
      lastName,
      email,
      role,
      phone,
      projects,
      active,
    } = req.body;

    let user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Verificar si el email ya está en uso (si se está cambiando)
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'El email ya está en uso',
        });
      }
    }

    // Crear objeto con los campos a actualizar
    const updateFields = {};
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (email) updateFields.email = email;
    if (role) updateFields.role = role;
    if (phone) updateFields.phone = phone;
    if (projects) updateFields.projects = projects;
    if (active !== undefined) updateFields.active = active;

    // Actualizar usuario
    user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar usuario',
      error: error.message,
    });
  }
};

// @desc    Eliminar un usuario
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // No permitir eliminar al último administrador
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar al último administrador',
        });
      }
    }

    // En vez de eliminar, marcar como inactivo
    user.active = false;
    await user.save();

    res.status(200).json({
      success: true,
      data: {},
      message: 'Usuario desactivado correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: error.message,
    });
  }
};

// @desc    Subir imagen de perfil
// @route   PUT /api/users/:id/profile-picture
// @access  Private
exports.uploadProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Verificar permisos - solo admin puede actualizar cualquier usuario
    // Otros usuarios solo pueden actualizarse a sí mismos
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permiso para actualizar este usuario',
      });
    }

    // Verificar si se subió una imagen
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Por favor suba una imagen',
      });
    }

    // Eliminar imagen anterior si no es la predeterminada
    if (user.profilePicture !== 'default-profile.png') {
      try {
        const previousImagePath = path.join(__dirname, '../../public/uploads/profiles/', user.profilePicture);
        if (fs.existsSync(previousImagePath)) {
          fs.unlinkSync(previousImagePath);
        }
      } catch (err) {
        console.error('Error al eliminar imagen anterior:', err);
        // No detener el proceso si hay error al eliminar la imagen anterior
      }
    }

    // Actualizar ruta de la imagen
    user.profilePicture = req.file.filename;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        profilePicture: user.profilePicture,
      },
      message: 'Imagen de perfil actualizada correctamente',
    });
  } catch (error) {
    console.error('Error al subir imagen de perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al subir imagen de perfil',
      error: error.message,
    });
  }
};

// @desc    Restablecer contraseña de usuario
// @route   PUT /api/users/:id/reset-password
// @access  Private/Admin
exports.resetUserPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { newPassword } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Generar hash de nueva contraseña
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Contraseña restablecida correctamente',
    });
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error al restablecer contraseña',
      error: error.message,
    });
  }
};

// @desc    Actualizar perfil propio
// @route   PUT /api/users/profile/update
// @access  Private
exports.updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      firstName,
      lastName,
      phone,
      currentPassword,
      newPassword,
    } = req.body;

    // Obtener usuario con contraseña
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Crear objeto con los campos a actualizar
    const updateFields = {};
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (phone) updateFields.phone = phone;

    // Verificar si se quiere cambiar la contraseña
    if (newPassword) {
      // Verificar contraseña actual
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Debe proporcionar la contraseña actual',
        });
      }

      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Contraseña actual incorrecta',
        });
      }

      // Generar hash de nueva contraseña
      const salt = await bcrypt.genSalt(10);
      updateFields.password = await bcrypt.hash(newPassword, salt);
    }

    // Actualizar usuario
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'Perfil actualizado correctamente',
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar perfil',
      error: error.message,
    });
  }
};