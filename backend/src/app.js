require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { testConnection, checkTables, getStats } = require('./config/database');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    error: 'Muitas requisições, tente novamente em 15 minutos.'
  }
});

app.use(limiter);
app.use(helmet()); // Segurança
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path} - ${new Date().toLocaleTimeString()}`);
    next();
  });
}

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);

app.get('/api/health', async (req, res) => {
  const health = {
    status: 'OK',
    message: 'Test Case Generator API está rodando!',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  try {
    const dbConnected = await testConnection();
    health.database = dbConnected ? 'connected' : 'disconnected';

    if (process.env.NODE_ENV === 'development') {
      const tablesOk = await checkTables();
      health.tables = tablesOk ? 'ok' : 'missing';
    }

    res.json(health);
  } catch (error) {
    health.status = 'ERROR';
    health.database = 'error';
    health.error = error.message;
    res.status(500).json(health);
  }
});

if (process.env.NODE_ENV === 'development') {
  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await getStats();
      res.json({
        message: 'Estatísticas do banco',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao buscar estatísticas',
        message: error.message
      });
    }
  });
}

app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend funcionando perfeitamente! 🚀',
    environment: process.env.NODE_ENV || 'development',
    features: [
      '✅ Express server',
      '✅ PostgreSQL (Neon)',
      '✅ JWT Authentication',
      '✅ Validation middleware',
      '✅ Security headers',
      '✅ Rate limiting'
    ]
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Erro não tratado:', err.stack);
  
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'JSON inválido',
      message: 'Formato de dados inválido'
    });
  }
  
  res.status(500).json({ 
    error: 'Algo deu errado!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor',
    timestamp: new Date().toISOString()
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    path: req.originalUrl,
    method: req.method,
    message: 'A rota solicitada não existe',
    availableRoutes: [
      'GET /api/health',
      'GET /api/test',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/profile',
      'PUT /api/auth/profile',
      'PUT /api/auth/change-password',
      'POST /api/auth/logout',
      'GET /api/auth/verify'
    ]
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('🚀 Iniciando Test Case Generator API...');
    
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.warn('⚠️ Banco de dados não conectado - algumas funcionalidades podem não funcionar');
    }
    
    if (process.env.NODE_ENV === 'development') {
      const tablesOk = await checkTables();
      if (!tablesOk) {
        console.warn('⚠️ Execute: node scripts/migrate.js para criar as tabelas');
      }
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`✅ Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Auth Test: http://localhost:${PORT}/api/test`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;