const express = require('express');
const router = express.Router();

const projectController = require('../controllers/projectController');
const { authenticateToken, authLogger } = require('../middleware/auth');
const { validate, projectSchemas, paramSchemas, querySchemas } = require('../middleware/validation');

router.use(authenticateToken);
router.use(authLogger);

/**
 * @route   GET /api/projects
 * @desc    Listar projetos do usuário
 * @access  Private
 * @query   ?page=1&limit=10
 * @headers Authorization: Bearer <token>
 */
router.get('/',
  validate(querySchemas.pagination, 'query'),
  projectController.getProjects
);

/**
 * @route   POST /api/projects
 * @desc    Criar novo projeto
 * @access  Private
 * @body    { name, description? }
 * @headers Authorization: Bearer <token>
 */
router.post('/',
  validate(projectSchemas.create),
  projectController.createProject
);

/**
 * @route   GET /api/projects/:id
 * @desc    Obter projeto específico com estatísticas
 * @access  Private
 * @params  id (UUID)
 * @headers Authorization: Bearer <token>
 */
router.get('/:id',
  validate(paramSchemas.uuid, 'params'),
  projectController.getProject
);

/**
 * @route   PUT /api/projects/:id
 * @desc    Atualizar projeto
 * @access  Private
 * @params  id (UUID)
 * @body    { name?, description? }
 * @headers Authorization: Bearer <token>
 */
router.put('/:id',
  validate(paramSchemas.uuid, 'params'),
  validate(projectSchemas.update),
  projectController.updateProject
);

/**
 * @route   DELETE /api/projects/:id
 * @desc    Deletar projeto e todos os dados relacionados
 * @access  Private
 * @params  id (UUID)
 * @headers Authorization: Bearer <token>
 */
router.delete('/:id',
  validate(paramSchemas.uuid, 'params'),
  projectController.deleteProject
);

/**
 * @route   GET /api/projects/:id/analyses
 * @desc    Listar análises de um projeto
 * @access  Private
 * @params  id (UUID)
 * @query   ?page=1&limit=10
 * @headers Authorization: Bearer <token>
 */
router.get('/:id/analyses',
  validate(paramSchemas.uuid, 'params'),
  validate(querySchemas.pagination, 'query'),
  projectController.getProjectAnalyses
);

router.use((error, req, res, next) => {
  console.error('❌ Erro nas rotas de projetos:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: error.details
    });
  }
  
  if (error.code === '23503') {
    return res.status(404).json({
      error: 'Recurso não encontrado',
      message: 'Projeto relacionado não foi encontrado'
    });
  }
  
  if (error.code === '23505') {
    return res.status(409).json({
      error: 'Dados duplicados',
      message: 'Já existe um projeto com este nome'
    });
  }
  
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: 'Erro nas operações de projetos'
  });
});

module.exports = router;