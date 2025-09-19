import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [backendStatus, setBackendStatus] = useState('Verificando...');
  const [backendData, setBackendData] = useState(null);

  useEffect(() => {
    const testBackend = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/health');
        const data = await response.json();
        setBackendStatus('✅ Conectado');
        setBackendData(data);
      } catch (error) {
        setBackendStatus('❌ Erro na conexão');
        console.error('Erro ao conectar com backend:', error);
      }
    };

    testBackend();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🧪 Test Case Generator</h1>
        <p>Sistema de Geração Automática de Casos de Teste</p>
        
        <div className="status-card">
          <h3>Status do Backend</h3>
          <p>{backendStatus}</p>
          {backendData && (
            <div className="backend-info">
              <p><strong>Mensagem:</strong> {backendData.message}</p>
              <p><strong>Versão:</strong> {backendData.version}</p>
              <p><strong>Timestamp:</strong> {new Date(backendData.timestamp).toLocaleString()}</p>
            </div>
          )}
        </div>

        <div className="features">
          <h3>🚀 Funcionalidades Planejadas</h3>
          <ul>
            <li>📤 Upload de código fonte</li>
            <li>🔍 Análise AST automática</li>
            <li>🧪 Geração de casos de teste</li>
            <li>📊 Dashboard com métricas</li>
            <li>💾 Export para Jest/PyTest</li>
          </ul>
        </div>

        <div className="tech-stack">
          <h3>⚡ Stack Tecnológica</h3>
          <p><strong>Frontend:</strong> React + TypeScript</p>
          <p><strong>Backend:</strong> Node.js + Express</p>
          <p><strong>Database:</strong> PostgreSQL (Neon)</p>
          <p><strong>Parser:</strong> Babel AST + Acorn</p>
        </div>
      </header>
    </div>
  );
}

export default App;