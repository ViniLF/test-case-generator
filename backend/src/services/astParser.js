const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');

class ASTParser {
  constructor() {
    this.supportedLanguages = ['javascript'];
    this.maxCodeSize = parseInt(process.env.MAX_CODE_SIZE) || 1048576; // 1MB
  }

  /**
   * Analisa código JavaScript e extrai informações estruturais
   * @param {string} sourceCode
   * @param {string} language
   * @returns {Object}
   */
  async analyzeCode(sourceCode, language = 'javascript') {
    try {
      if (!sourceCode || typeof sourceCode !== 'string') {
        throw new Error('Código fonte inválido');
      }

      if (sourceCode.length > this.maxCodeSize) {
        throw new Error(`Código muito grande (máximo ${this.maxCodeSize} caracteres)`);
      }

      if (!this.supportedLanguages.includes(language)) {
        throw new Error(`Linguagem não suportada: ${language}`);
      }

      switch (language) {
        case 'javascript':
          return await this.analyzeJavaScript(sourceCode);
        default:
          throw new Error(`Análise não implementada para: ${language}`);
      }

    } catch (error) {
      console.error('❌ Erro na análise AST:', error);
      throw new Error(`Erro na análise: ${error.message}`);
    }
  }

  /**
   * Analisa código JavaScript usando Babel Parser
   * @param {string} sourceCode
   * @returns {Object}
   */
  async analyzeJavaScript(sourceCode) {
    try {
      const ast = parse(sourceCode, {
        sourceType: 'module',
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'classProperties',
          'asyncGenerators',
          'functionBind',
          'exportDefaultFrom',
          'exportNamespaceFrom',
          'dynamicImport',
          'nullishCoalescingOperator',
          'optionalChaining',
          'objectRestSpread'
        ]
      });

      const analysis = {
        functions: [],
        classes: [],
        variables: [],
        imports: [],
        exports: [],
        conditionals: [],
        loops: [],
        trycatch: [],
        complexity: {
          cyclomaticComplexity: 1,
          linesOfCode: sourceCode.split('\n').length,
          functionsCount: 0,
          classesCount: 0,
          maxNestingDepth: 0
        }
      };

      let currentDepth = 0;
      let maxDepth = 0;

      traverse(ast, {
        FunctionDeclaration: (path) => {
          this.extractFunctionInfo(path, analysis, 'declaration');
        },
        FunctionExpression: (path) => {
          this.extractFunctionInfo(path, analysis, 'expression');
        },
        ArrowFunctionExpression: (path) => {
          this.extractFunctionInfo(path, analysis, 'arrow');
        },

        ClassDeclaration: (path) => {
          this.extractClassInfo(path, analysis);
        },

        VariableDeclaration: (path) => {
          this.extractVariableInfo(path, analysis);
        },

        ImportDeclaration: (path) => {
          this.extractImportInfo(path, analysis);
        },
        ExportDeclaration: (path) => {
          this.extractExportInfo(path, analysis);
        },

        IfStatement: (path) => {
          this.extractConditionalInfo(path, analysis, 'if');
          analysis.complexity.cyclomaticComplexity++;
        },
        SwitchStatement: (path) => {
          this.extractConditionalInfo(path, analysis, 'switch');
          analysis.complexity.cyclomaticComplexity += path.node.cases.length;
        },
        ConditionalExpression: (path) => {
          this.extractConditionalInfo(path, analysis, 'ternary');
          analysis.complexity.cyclomaticComplexity++;
        },

        ForStatement: (path) => {
          this.extractLoopInfo(path, analysis, 'for');
          analysis.complexity.cyclomaticComplexity++;
        },
        WhileStatement: (path) => {
          this.extractLoopInfo(path, analysis, 'while');
          analysis.complexity.cyclomaticComplexity++;
        },
        DoWhileStatement: (path) => {
          this.extractLoopInfo(path, analysis, 'do-while');
          analysis.complexity.cyclomaticComplexity++;
        },
        ForInStatement: (path) => {
          this.extractLoopInfo(path, analysis, 'for-in');
          analysis.complexity.cyclomaticComplexity++;
        },
        ForOfStatement: (path) => {
          this.extractLoopInfo(path, analysis, 'for-of');
          analysis.complexity.cyclomaticComplexity++;
        },

        TryStatement: (path) => {
          this.extractTryCatchInfo(path, analysis);
          analysis.complexity.cyclomaticComplexity++;
        },

        enter(path) {
          if (this.isBlockStatement(path)) {
            currentDepth++;
            maxDepth = Math.max(maxDepth, currentDepth);
          }
        },
        exit(path) {
          if (this.isBlockStatement(path)) {
            currentDepth--;
          }
        }
      });

      analysis.complexity.maxNestingDepth = maxDepth;
      analysis.complexity.functionsCount = analysis.functions.length;
      analysis.complexity.classesCount = analysis.classes.length;

      return {
        ast: this.serializeAST(ast),
        analysis,
        metadata: {
          language: 'javascript',
          parserVersion: require('@babel/parser/package.json').version,
          analysisTimestamp: new Date().toISOString(),
          codeLength: sourceCode.length,
          linesOfCode: analysis.complexity.linesOfCode
        }
      };

    } catch (error) {
      if (error.code === 'BABEL_PARSE_ERROR') {
        throw new Error(`Erro de sintaxe: ${error.message}`);
      }
      throw error;
    }
  }

  extractFunctionInfo(path, analysis, type) {
    const node = path.node;
    const functionInfo = {
      name: node.id ? node.id.name : '<anonymous>',
      type,
      params: node.params.map(param => {
        if (t.isIdentifier(param)) return { name: param.name, type: 'identifier' };
        if (t.isAssignmentPattern(param)) return { name: param.left.name, type: 'default' };
        if (t.isRestElement(param)) return { name: param.argument.name, type: 'rest' };
        return { name: 'unknown', type: 'complex' };
      }),
      async: node.async || false,
      generator: node.generator || false,
      line: node.loc ? node.loc.start.line : null,
      complexity: 1
    };

    let localComplexity = 1;
    path.traverse({
      IfStatement: () => localComplexity++,
      SwitchCase: () => localComplexity++,
      ForStatement: () => localComplexity++,
      WhileStatement: () => localComplexity++,
      DoWhileStatement: () => localComplexity++,
      ConditionalExpression: () => localComplexity++,
      LogicalExpression: (innerPath) => {
        if (innerPath.node.operator === '&&' || innerPath.node.operator === '||') {
          localComplexity++;
        }
      }
    });

    functionInfo.complexity = localComplexity;
    analysis.functions.push(functionInfo);
  }

  extractClassInfo(path, analysis) {
    const node = path.node;
    const classInfo = {
      name: node.id ? node.id.name : '<anonymous>',
      superClass: node.superClass ? node.superClass.name : null,
      methods: [],
      properties: [],
      line: node.loc ? node.loc.start.line : null
    };

    node.body.body.forEach(member => {
      if (t.isMethodDefinition(member) || t.isClassMethod(member)) {
        classInfo.methods.push({
          name: member.key.name || '<computed>',
          kind: member.kind,
          static: member.static || false,
          async: member.async || false
        });
      } else if (t.isClassProperty(member) || t.isPropertyDefinition(member)) {
        classInfo.properties.push({
          name: member.key.name || '<computed>',
          static: member.static || false
        });
      }
    });

    analysis.classes.push(classInfo);
  }

  extractVariableInfo(path, analysis) {
    const node = path.node;
    node.declarations.forEach(declaration => {
      if (t.isIdentifier(declaration.id)) {
        analysis.variables.push({
          name: declaration.id.name,
          kind: node.kind, // var, let, const
          hasInitializer: !!declaration.init,
          line: node.loc ? node.loc.start.line : null
        });
      }
    });
  }

  extractImportInfo(path, analysis) {
    const node = path.node;
    analysis.imports.push({
      source: node.source.value,
      specifiers: node.specifiers.map(spec => ({
        type: spec.type,
        local: spec.local.name,
        imported: spec.imported ? spec.imported.name : null
      }))
    });
  }

  extractExportInfo(path, analysis) {
    const node = path.node;
    const exportInfo = {
      type: node.type,
      line: node.loc ? node.loc.start.line : null
    };

    if (node.declaration) {
      if (t.isFunctionDeclaration(node.declaration)) {
        exportInfo.name = node.declaration.id.name;
        exportInfo.kind = 'function';
      } else if (t.isClassDeclaration(node.declaration)) {
        exportInfo.name = node.declaration.id.name;
        exportInfo.kind = 'class';
      } else if (t.isVariableDeclaration(node.declaration)) {
        exportInfo.kind = 'variable';
        exportInfo.names = node.declaration.declarations.map(d => d.id.name);
      }
    }

    analysis.exports.push(exportInfo);
  }

  extractConditionalInfo(path, analysis, type) {
    analysis.conditionals.push({
      type,
      line: path.node.loc ? path.node.loc.start.line : null,
      hasElse: type === 'if' && !!path.node.alternate
    });
  }

  extractLoopInfo(path, analysis, type) {
    analysis.loops.push({
      type,
      line: path.node.loc ? path.node.loc.start.line : null
    });
  }

  extractTryCatchInfo(path, analysis) {
    analysis.tryCache.push({
      hasCatch: !!path.node.handler,
      hasFinally: !!path.node.finalizer,
      line: path.node.loc ? path.node.loc.start.line : null
    });
  }

  isBlockStatement(path) {
    return t.isBlockStatement(path.node) || 
           t.isFunctionDeclaration(path.node) ||
           t.isIfStatement(path.node) ||
           t.isForStatement(path.node) ||
           t.isWhileStatement(path.node);
  }

  serializeAST(ast) {
    return JSON.parse(JSON.stringify(ast, (key, value) => {
      if (key === 'parent' || key === 'hub' || key === 'scope') {
        return undefined;
      }
      return value;
    }));
  }
}

module.exports = new ASTParser();