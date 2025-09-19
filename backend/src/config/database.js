const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', (client) => {
  console.log('✅ Nova conexão PostgreSQL estabelecida');
});

pool.on('error', (err, client) => {
  console.error('❌ Erro inesperado no cliente PostgreSQL:', err);
  process.exit(-1);
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Query executada: ${duration}ms | Rows: ${res.rowCount}`);
    }
    
    return res;
  } catch (error) {
    console.error('❌ Erro na query:', {
      text: text.substring(0, 100) + '...',
      error: error.message
    });
    throw error;
  }
};

const transaction = async (callback) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() as timestamp, version() as version');
    console.log('✅ Conexão com banco testada:', {
      timestamp: result.rows[0].timestamp,
      version: result.rows[0].version.split(' ')[0]
    });
    return true;
  } catch (error) {
    console.error('❌ Falha no teste de conexão:', error.message);
    return false;
  }
};

const checkTables = async () => {
  try {
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tables = result.rows.map(row => row.table_name);
    console.log('📋 Tabelas encontradas:', tables);
    
    const requiredTables = ['users', 'projects', 'code_analyses', 'test_cases', 'test_templates'];
    const missingTables = requiredTables.filter(table => !tables.includes(table));
    
    if (missingTables.length > 0) {
      console.warn('⚠️ Tabelas faltando:', missingTables);
      console.log('💡 Execute: node scripts/migrate.js');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error.message);
    return false;
  }
};

const getStats = async () => {
  try {
    const result = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM projects) as projects_count,
        (SELECT COUNT(*) FROM code_analyses) as analyses_count,
        (SELECT COUNT(*) FROM test_cases) as test_cases_count,
        (SELECT COUNT(*) FROM test_templates) as templates_count
    `);
    
    return result.rows[0];
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error.message);
    return null;
  }
};

process.on('SIGTERM', () => {
  console.log('🔄 Fechando conexões do banco...');
  pool.end(() => {
    console.log('✅ Pool de conexões fechado');
    process.exit(0);
  });
});

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  checkTables,
  getStats
};