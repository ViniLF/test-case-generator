const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Token de acesso requerido',
      message: 'Inclua o token no header: Authorization: Bearer <token>'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const result = await query(
      'SELECT id, email, name FROM users WHERE id = $1', 
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Token inválido',
        message: 'Usuário não encontrado'
      });
    }

    req.user = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      name: result.rows[0].name
    };
    
    next();
  } catch (error) {
    console.error('❌ Erro na autenticação:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        message: 'Faça login novamente'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido',
        message: 'Token malformado ou incorreto'
      });
    }
    
    return res.status(500).json({ 
      error: 'Erro interno de autenticação' 
    });
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const result = await query(
      'SELECT id, email, name FROM users WHERE id = $1', 
      [decoded.userId]
    );
    
    if (result.rows.length > 0) {
      req.user = {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: result.rows[0].name
      };
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
  }
  
  next();
};

const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET, 
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'test-case-generator',
      audience: 'test-case-generator-users'
    }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' }, 
    process.env.JWT_SECRET, 
    { 
      expiresIn: '7d',
      issuer: 'test-case-generator'
    }
  );
};

const checkResourceOwnership = (resourceField = 'user_id') => {
  return (req, res, next) => {
    const resourceUserId = req.body[resourceField] || req.params[resourceField];
    
    if (resourceUserId && resourceUserId !== req.user.id) {
      return res.status(403).json({ 
        error: 'Acesso negado',
        message: 'Você não tem permissão para acessar este recurso'
      });
    }
    
    next();
  };
};

const authLogger = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔐 Auth: ${req.method} ${req.path} - User: ${req.user?.email || 'anonymous'}`);
  }
  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  generateToken,
  generateRefreshToken,
  checkResourceOwnership,
  authLogger
};