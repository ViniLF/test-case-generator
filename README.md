# Test Case Generator 🧪

Sistema web para geração automática de casos de teste a partir da análise de código fonte usando AST (Abstract Syntax Tree).

## 📋 Sobre o Projeto

O Test Case Generator é uma ferramenta desenvolvida para auxiliar desenvolvedores na criação automática de casos de teste, analisando o código fonte e gerando testes unitários, cenários válidos/inválidos e edge cases.

## 🚀 Tecnologias

### Backend
- **Node.js** + Express
- **PostgreSQL** (Neon.com)
- **JWT** para autenticação
- **Babel Parser** + **Acorn** para análise AST
- **Jest** para testes

### Frontend
- **React** + **TypeScript**
- **Tailwind CSS** para estilização
- **Monaco Editor** (VS Code editor)
- **React Hook Form** para formulários
- **Recharts** para gráficos

## 📁 Estrutura do Projeto

```
test-case-generator/
├── backend/          # API Node.js
├── frontend/         # React App
├── docs/             # Documentação
└── scripts/          # Scripts utilitários
```

## ⚙️ Configuração do Ambiente

### 1. Clonar o repositório
```bash
git clone https://github.com/ViniLF/test-case-generator.git
cd test-case-generator
```

### 2. Instalar dependências
```bash
npm run install:all
```

### 3. Configurar variáveis de ambiente
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar com suas configurações
# - DATABASE_URL do Neon PostgreSQL
# - JWT_SECRET
```

### 4. Configurar banco de dados
```bash
# Executar migrações (quando disponível)
cd backend
npm run db:migrate
```

## 🏃‍♂️ Como Executar

### Desenvolvimento
```bash
# Executar backend e frontend simultaneamente
npm run dev

# Ou executar separadamente:
npm run dev:backend
npm run dev:frontend
```

### Produção
```bash
npm run build
npm start
```

## 🧪 Funcionalidades

- [x] Upload/input de código fonte
- [x] Análise AST para JavaScript
- [x] Geração automática de casos de teste
- [x] Interface para visualização dos testes
- [x] Export para Jest/PyTest
- [x] Dashboard com métricas
- [x] Histórico de análises
- [ ] Suporte para Python
- [ ] Templates customizáveis
- [ ] Integração com CI/CD

## 📊 Como Funciona

1. **Upload**: Usuário faz upload ou cola código fonte
2. **Análise**: Sistema analisa o código usando AST
3. **Geração**: IA gera casos de teste baseados na análise
4. **Visualização**: Usuário visualiza e edita os testes
5. **Export**: Exporta testes em formato Jest/PyTest

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👤 Autor

**Seu Nome**
- GitHub: [@ViniLF](https://github.com/ViniLF)
- LinkedIn: [Seu LinkedIn](https://www.linkedin.com/in/viniciuslucasfaria/)

---

⭐ Se este projeto te ajudou, deixe uma estrela!
