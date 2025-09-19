const { query, transaction } = require('../config/database');

const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    const result = await query(`
      INSERT INTO projects (user_id, name, description) 
      VALUES ($1, $2, $3) 
      RETURNING id, name, description, created_at
    `, [userId, name, description || null]);

    const newProject = result.rows[0];

    console.log(`✅ Projeto criado: ${name} por ${req.user.email}`);

    res.status(201).json({
      message: 'Projeto criado com sucesso',
      project: newProject
    });

  } catch (error) {
    console.error('❌ Erro ao criar projeto:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível criar o projeto'
    });
  }
};

const getProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    const result = await query(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.created_at,
        p.updated_at,
        COUNT(ca.id) as analyses_count,
        COUNT(tc.id) as test_cases_count
      FROM projects p
      LEFT JOIN code_analyses ca ON ca.project_id = p.id
      LEFT JOIN test_cases tc ON tc.analysis_id = ca.id
      WHERE p.user_id = $1
      GROUP BY p.id, p.name, p.description, p.created_at, p.updated_at
      ORDER BY p.updated_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    const countResult = await query(
      'SELECT COUNT(*) FROM projects WHERE user_id = $1',
      [userId]
    );

    const totalProjects = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalProjects / limit);

    const projects = result.rows.map(project => ({
      ...project,
      analyses_count: parseInt(project.analyses_count),
      test_cases_count: parseInt(project.test_cases_count)
    }));

    res.json({
      projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalProjects,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar projetos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível carregar os projetos'
    });
  }
};

const getProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await query(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.created_at,
        p.updated_at,
        COUNT(ca.id) as analyses_count,
        COUNT(tc.id) as test_cases_count,
        COALESCE(AVG(cm.estimated_coverage), 0) as avg_coverage
      FROM projects p
      LEFT JOIN code_analyses ca ON ca.project_id = p.id
      LEFT JOIN test_cases tc ON tc.analysis_id = ca.id
      LEFT JOIN coverage_metrics cm ON cm.analysis_id = ca.id
      WHERE p.id = $1 AND p.user_id = $2
      GROUP BY p.id, p.name, p.description, p.created_at, p.updated_at
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Projeto não encontrado',
        message: 'O projeto não existe ou você não tem acesso a ele'
      });
    }

    const project = {
      ...result.rows[0],
      analyses_count: parseInt(result.rows[0].analyses_count),
      test_cases_count: parseInt(result.rows[0].test_cases_count),
      avg_coverage: parseFloat(result.rows[0].avg_coverage).toFixed(2)
    };

    res.json({
      project
    });

  } catch (error) {
    console.error('❌ Erro ao buscar projeto:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível carregar o projeto'
    });
  }
};

const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, description } = req.body;

    const existingProject = await query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingProject.rows.length === 0) {
      return res.status(404).json({
        error: 'Projeto não encontrado',
        message: 'O projeto não existe ou você não tem acesso a ele'
      });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Nenhum campo para atualizar',
        message: 'Forneça pelo menos um campo para atualizar'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id, userId);

    const result = await query(`
      UPDATE projects 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      RETURNING id, name, description, updated_at
    `, values);

    const updatedProject = result.rows[0];

    console.log(`✅ Projeto atualizado: ${updatedProject.name} por ${req.user.email}`);

    res.json({
      message: 'Projeto atualizado com sucesso',
      project: updatedProject
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar projeto:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível atualizar o projeto'
    });
  }
};

const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await transaction(async (client) => {
      const projectResult = await client.query(
        'SELECT name FROM projects WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (projectResult.rows.length === 0) {
        throw new Error('PROJECT_NOT_FOUND');
      }

      const projectName = projectResult.rows[0].name;

      const statsResult = await client.query(`
        SELECT 
          COUNT(ca.id) as analyses_count,
          COUNT(tc.id) as test_cases_count
        FROM projects p
        LEFT JOIN code_analyses ca ON ca.project_id = p.id
        LEFT JOIN test_cases tc ON tc.analysis_id = ca.id
        WHERE p.id = $1
        GROUP BY p.id
      `, [id]);

      const stats = statsResult.rows[0] || { analyses_count: '0', test_cases_count: '0' };

      await client.query(
        'DELETE FROM projects WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      return {
        projectName,
        deletedStats: {
          analyses: parseInt(stats.analyses_count),
          testCases: parseInt(stats.test_cases_count)
        }
      };
    });

    console.log(`✅ Projeto deletado: ${result.projectName} por ${req.user.email}`);

    res.json({
      message: 'Projeto deletado com sucesso',
      deletedProject: result.projectName,
      deletedStats: result.deletedStats
    });

  } catch (error) {
    console.error('❌ Erro ao deletar projeto:', error);

    if (error.message === 'PROJECT_NOT_FOUND') {
      return res.status(404).json({
        error: 'Projeto não encontrado',
        message: 'O projeto não existe ou você não tem acesso a ele'
      });
    }

    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível deletar o projeto'
    });
  }
};

const getProjectAnalyses = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const projectResult = await query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Projeto não encontrado',
        message: 'O projeto não existe ou você não tem acesso a ele'
      });
    }

    const offset = (page - 1) * limit;

    const result = await query(`
      SELECT 
        ca.id,
        ca.language,
        ca.file_name,
        ca.created_at,
        COUNT(tc.id) as test_cases_count,
        COALESCE(cm.estimated_coverage, 0) as coverage
      FROM code_analyses ca
      LEFT JOIN test_cases tc ON tc.analysis_id = ca.id
      LEFT JOIN coverage_metrics cm ON cm.analysis_id = ca.id
      WHERE ca.project_id = $1
      GROUP BY ca.id, ca.language, ca.file_name, ca.created_at, cm.estimated_coverage
      ORDER BY ca.created_at DESC
      LIMIT $2 OFFSET $3
    `, [id, limit, offset]);

    const countResult = await query(
      'SELECT COUNT(*) FROM code_analyses WHERE project_id = $1',
      [id]
    );

    const totalAnalyses = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalAnalyses / limit);

    const analyses = result.rows.map(analysis => ({
      ...analysis,
      test_cases_count: parseInt(analysis.test_cases_count),
      coverage: parseFloat(analysis.coverage)
    }));

    res.json({
      analyses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalAnalyses,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar análises do projeto:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível carregar as análises do projeto'
    });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  getProjectAnalyses
};