const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticateToken, authLogger } = require('../middleware/auth');
const { validate, authSchemas } = require('../middleware/validation');

router.use(authLogger);


/**
 * @route   POST /api/auth/register
 * @desc    Registrar novo usuário
 * @access  Public
 * @body    { name, email, password, confirmPassword }
 */
router.post('/register', 
  validate(authSchemas.register),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login do usuário
 * @access  Public
 * @body    { email, password }
 */
router.post('/login',
  validate(authSchemas.login),
  authController.login
);


/**
 * @route   GET /api/auth/profile
 * @desc    Obter perfil do usuário atual
 * @access  Private
 * @headers Authorization: Bearer <token>
 */
router.get('/profile',
  authenticateToken,
  authController.getProfile
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Atualizar perfil do usuário
 * @access  Private
 * @body    { name?, email? }
 * @headers Authorization: Bearer <token>
 */
router.put('/profile',
  authenticateToken,
  validate(authSchemas.updateProfile || {
    name: authSchemas.register.extract('name').optional(),
    email: authSchemas.register.extract('email').optional()
  }),
  authController.updateProfile
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Alterar senha do usuário
 * @access  Private
 * @body    { currentPassword, newPassword, confirmNewPassword }
 * @headers Authorization: Bearer <token>
 */
router.put('/change-password',
  authenticateToken,
  validate({
    currentPassword: authSchemas.login.extract('password'),
    newPassword: authSchemas.register.extract('password'),
    confirmNewPassword: authSchemas.register.extract('confirmPassword').valid(require('joi').ref('newPassword'))
  }),
  authController.changePassword
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout do usuário
 * @access  Private
 * @headers Authorization: Bearer <token>
 */
router.post('/logout',
  authenticateToken,
  authController.logout
);

/**
 * @route   GET /api/auth/verify
 * @desc    Verificar se o token é válido
 * @access  Private
 * @headers Authorization: Bearer <token>
 */
router.get('/verify',
  authenticateToken,
  (req, res) => {
    res.json({
      message: 'Token válido',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  }
);

router.use((error, req, res, next) => {
  console.error('❌ Erro nas rotas de autenticação:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: error.details
    });
  }
  
  if (error.code === '23505') {
    return res.status(409).json({
      error: 'Dados duplicados',
      message: 'Email já está em uso'
    });
  }
  
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: 'Erro nas operações de autenticação'
  });
});

module.exports = router;