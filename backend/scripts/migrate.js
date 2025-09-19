require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const migrations = [
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
  
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,
  
  `CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,
  
  `CREATE TABLE IF NOT EXISTS code_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_code TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    file_name VARCHAR(255),
    ast_data JSONB,
    analysis_metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,
  
  `CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL REFERENCES code_analyses(id) ON DELETE CASCADE,
    function_name VARCHAR(255),
    test_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    input_data JSONB,
    expected_output JSONB,
    test_code TEXT,
    priority INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'generated',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,
  
  `CREATE TABLE IF NOT EXISTS test_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    language VARCHAR(50) NOT NULL,
    test_framework VARCHAR(100) NOT NULL,
    test_type VARCHAR(100) NOT NULL,
    template_code TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,
  
  `CREATE TABLE IF NOT EXISTS coverage_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL REFERENCES code_analyses(id) ON DELETE CASCADE,
    lines_of_code INTEGER,
    functions_count INTEGER,
    branches_count INTEGER,
    test_cases_count INTEGER,
    estimated_coverage DECIMAL(5,2),
    complexity_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`,
  
  `CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_code_analyses_project_id ON code_analyses(project_id);`,
  `CREATE INDEX IF NOT EXISTS idx_test_cases_analysis_id ON test_cases(analysis_id);`,
  `CREATE INDEX IF NOT EXISTS idx_test_cases_function_name ON test_cases(function_name);`,
  `CREATE INDEX IF NOT EXISTS idx_coverage_metrics_analysis_id ON coverage_metrics(analysis_id);`,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
  
  `CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN
       NEW.updated_at = CURRENT_TIMESTAMP;
       RETURN NEW;
   END;
   $$ language 'plpgsql';`,
  
  `DROP TRIGGER IF EXISTS update_users_updated_at ON users;
   CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
  
  `DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
   CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
  
  `DROP TRIGGER IF EXISTS update_test_cases_updated_at ON test_cases;
   CREATE TRIGGER update_test_cases_updated_at BEFORE UPDATE ON test_cases
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
];

const seedData = [
  `INSERT INTO test_templates (language, test_framework, test_type, template_code, description) 
   VALUES (
     'javascript',
     'jest',
     'unit',
     'describe("{{functionName}}", () => {
  test("{{testDescription}}", () => {
    // Arrange
    const input = {{inputData}};
    const expected = {{expectedOutput}};
    
    // Act
    const result = {{functionName}}({{inputParams}});
    
    // Assert
    expect(result).{{assertion}}(expected);
  });
});',
     'Template básico para testes unitários em Jest'
   ) ON CONFLICT DO NOTHING;`,
   
   `INSERT INTO test_templates (language, test_framework, test_type, template_code, description)
    VALUES (
      'javascript',
      'jest',
      'edge_case',
      'describe("{{functionName}} - Edge Cases", () => {
  test("should handle {{edgeCase}}", () => {
    expect(() => {{functionName}}({{inputData}})).{{expectation}};
  });
});',
      'Template para casos extremos em Jest'
    ) ON CONFLICT DO NOTHING;`,
];

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Iniciando migrações...');
    
    for (let i = 0; i < migrations.length; i++) {
      console.log(`📊 Executando migração ${i + 1}/${migrations.length}...`);
      await client.query(migrations[i]);
    }
    
    console.log('🌱 Inserindo dados iniciais...');
    for (const seed of seedData) {
      await client.query(seed);
    }
    
    console.log('✅ Migrações concluídas com sucesso!');
    console.log('📋 Tabelas criadas:');
    console.log('  - users');
    console.log('  - projects');
    console.log('  - code_analyses');
    console.log('  - test_cases');
    console.log('  - test_templates');
    console.log('  - coverage_metrics');
    
  } catch (error) {
    console.error('❌ Erro durante migração:', error);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;