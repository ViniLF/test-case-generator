const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { generateToken, generateRefreshToken } = require('../middleware/auth');

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Email já cadastrado',
        message: 'Este email já está sendo usado por outro usuário'
      });
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await query(`
      INSERT INTO users (name, email, password) 
      VALUES ($1, $2, $3) 
      RETURNING id, name, email, created_at
    `, [name, email, hashedPassword]);

    const newUser = result.rows[0];

    const token = generateToken(newUser.id);
    const refreshToken = generateRefreshToken(newUser.id);

    console.log(`✅ Novo usuário registrado: ${email}`);

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        created_at: newUser.created_at
      },
      token,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

  } catch (error) {
    console.error('❌ Erro no registro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível criar o usuário'
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT id, name, email, password FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        message: 'Email ou senha incorretos'
      });
    }

    const user = result.rows[0];

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Credenciais inválidas',
        message: 'Email ou senha incorretos'
      });
    }

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await query(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    console.log(`✅ Login realizado: ${email}`);

    res.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      token,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

  } catch (error) {
    console.error('❌ Erro no login:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível realizar o login'
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.created_at,
        COUNT(p.id) as projects_count
      FROM users u
      LEFT JOIN projects p ON p.user_id = u.id
      WHERE u.id = $1
      GROUP BY u.id, u.name, u.email, u.created_at
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        message: 'Perfil não localizado'
      });
    }

    const user = result.rows[0];

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
        projects_count: parseInt(user.projects_count)
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar perfil:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível carregar o perfil'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email } = req.body;

    if (email && email !== req.user.email) {
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          error: 'Email já cadastrado',
          message: 'Este email já está sendo usado por outro usuário'
        });
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (email) {
      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Nenhum campo para atualizar',
        message: 'Forneça pelo menos um campo para atualizar'
      });
    }

    values.push(userId);
    const whereClause = `$${paramCount}`;

    const result = await query(`
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${whereClause}
      RETURNING id, name, email, updated_at
    `, values);

    const updatedUser = result.rows[0];

    console.log(`✅ Perfil atualizado: ${updatedUser.email}`);

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: updatedUser
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar perfil:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível atualizar o perfil'
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const result = await query(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );

    const user = result.rows[0];

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Senha atual incorreta',
        message: 'A senha atual fornecida está incorreta'
      });
    }

    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, userId]
    );

    console.log(`✅ Senha alterada: ${req.user.email}`);

    res.json({
      message: 'Senha alterada com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro ao alterar senha:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível alterar a senha'
    });
  }
};

const logout = async (req, res) => {
  try {


    console.log(`✅ Logout realizado: ${req.user.email}`);

    res.json({
      message: 'Logout realizado com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro no logout:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: 'Não foi possível realizar o logout'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout
};