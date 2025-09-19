const { query } = require('../config/database');

class TestGenerator {
  constructor() {
    this.testTypes = {
      UNIT: 'unit',
      INTEGRATION: 'integration',
      EDGE_CASE: 'edge_case',
      NEGATIVE: 'negative'
    };

    this.priorities = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3
    };
  }

  /**
   * Gera casos de teste baseado na análise AST
   * @param {Object} analysis
   * @param {string} analysisId 
   * @returns {Array} 
   */
  async generateTestCases(analysis, analysisId) {
    try {
      const testCases = [];

      for (const func of analysis.functions) {
        const functionTests = await this.generateFunctionTests(func, analysisId);
        testCases.push(...functionTests);
      }

      for (const cls of analysis.classes) {
        const classTests = await this.generateClassTests(cls, analysisId);
        testCases.push(...classTests);
      }

      const conditionalTests = await this.generateConditionalTests(analysis.conditionals, analysisId);
      testCases.push(...conditionalTests);

      const loopTests = await this.generateLoopTests(analysis.loops, analysisId);
      testCases.push(...loopTests);

      console.log(`✅ Gerados ${testCases.length} casos de teste`);
      return testCases;

    } catch (error) {
      console.error('❌ Erro na geração de testes:', error);
      throw new Error(`Falha na geração de testes: ${error.message}`);
    }
  }

  async generateFunctionTests(func, analysisId) {
    const tests = [];

    const basicTest = {
      analysis_id: analysisId,
      function_name: func.name,
      test_type: this.testTypes.UNIT,
      description: `Teste básico para a função ${func.name}`,
      input_data: this.generateInputData(func.params),
      expected_output: this.generateExpectedOutput(func),
      test_code: await this.generateTestCode(func, 'basic'),
      priority: this.calculatePriority(func),
      status: 'generated'
    };
    tests.push(basicTest);

    for (let i = 0; i < func.params.length; i++) {
      const param = func.params[i];
      
      const validParamTest = {
        analysis_id: analysisId,
        function_name: func.name,
        test_type: this.testTypes.UNIT,
        description: `Teste com parâmetro ${param.name} válido`,
        input_data: this.generateValidParamData(func.params, i),
        expected_output: this.generateExpectedOutput(func),
        test_code: await this.generateTestCode(func, 'valid_param', i),
        priority: this.priorities.MEDIUM,
        status: 'generated'
      };
      tests.push(validParamTest);

      const invalidParamTest = {
        analysis_id: analysisId,
        function_name: func.name,
        test_type: this.testTypes.EDGE_CASE,
        description: `Teste com parâmetro ${param.name} inválido`,
        input_data: this.generateInvalidParamData(func.params, i),
        expected_output: this.generateErrorExpectation(func),
        test_code: await this.generateTestCode(func, 'invalid_param', i),
        priority: this.priorities.HIGH,
        status: 'generated'
      };
      tests.push(invalidParamTest);
    }

    if (func.params.length > 0) {
      const nullTest = {
        analysis_id: analysisId,
        function_name: func.name,
        test_type: this.testTypes.NEGATIVE,
        description: `Teste com parâmetros null/undefined para ${func.name}`,
        input_data: this.generateNullParamData(func.params),
        expected_output: this.generateErrorExpectation(func),
        test_code: await this.generateTestCode(func, 'null_params'),
        priority: this.priorities.HIGH,
        status: 'generated'
      };
      tests.push(nullTest);
    }

    if (func.async) {
      const asyncTest = {
        analysis_id: analysisId,
        function_name: func.name,
        test_type: this.testTypes.UNIT,
        description: `Teste assíncrono para ${func.name}`,
        input_data: this.generateInputData(func.params),
        expected_output: this.generateExpectedOutput(func, true),
        test_code: await this.generateTestCode(func, 'async'),
        priority: this.priorities.MEDIUM,
        status: 'generated'
      };
      tests.push(asyncTest);
    }

    return tests;
  }

  async generateClassTests(cls, analysisId) {
    const tests = [];

    const instantiationTest = {
      analysis_id: analysisId,
      function_name: cls.name,
      test_type: this.testTypes.UNIT,
      description: `Teste de instanciação da classe ${cls.name}`,
      input_data: this.generateClassConstructorData(cls),
      expected_output: { type: 'object', instanceof: cls.name },
      test_code: await this.generateClassTestCode(cls, 'instantiation'),
      priority: this.priorities.HIGH,
      status: 'generated'
    };
    tests.push(instantiationTest);

    for (const method of cls.methods) {
      if (method.kind === 'constructor') continue;

      const methodTest = {
        analysis_id: analysisId,
        function_name: `${cls.name}.${method.name}`,
        test_type: this.testTypes.UNIT,
        description: `Teste do método ${method.name} da classe ${cls.name}`,
        input_data: this.generateMethodInputData(method),
        expected_output: this.generateMethodExpectedOutput(method),
        test_code: await this.generateMethodTestCode(cls, method),
        priority: method.kind === 'constructor' ? this.priorities.HIGH : this.priorities.MEDIUM,
        status: 'generated'
      };
      tests.push(methodTest);
    }

    return tests;
  }

  async generateConditionalTests(conditionals, analysisId) {
    const tests = [];

    for (let i = 0; i < conditionals.length; i++) {
      const conditional = conditionals[i];

      const truePathTest = {
        analysis_id: analysisId,
        function_name: `conditional_${i}`,
        test_type: this.testTypes.UNIT,
        description: `Teste do caminho verdadeiro da condicional na linha ${conditional.line}`,
        input_data: { condition: true, testCase: 'true_path' },
        expected_output: { path: 'true' },
        test_code: await this.generateConditionalTestCode(conditional, 'true'),
        priority: this.priorities.MEDIUM,
        status: 'generated'
      };
      tests.push(truePathTest);

      const falsePathTest = {
        analysis_id: analysisId,
        function_name: `conditional_${i}`,
        test_type: this.testTypes.UNIT,
        description: `Teste do caminho falso da condicional na linha ${conditional.line}`,
        input_data: { condition: false, testCase: 'false_path' },
        expected_output: { path: 'false' },
        test_code: await this.generateConditionalTestCode(conditional, 'false'),
        priority: this.priorities.MEDIUM,
        status: 'generated'
      };
      tests.push(falsePathTest);
    }

    return tests;
  }

  async generateLoopTests(loops, analysisId) {
    const tests = [];

    for (let i = 0; i < loops.length; i++) {
      const loop = loops[i];

      const normalTest = {
        analysis_id: analysisId,
        function_name: `loop_${i}`,
        test_type: this.testTypes.UNIT,
        description: `Teste de iteração normal do ${loop.type} na linha ${loop.line}`,
        input_data: { iterations: 5, testCase: 'normal' },
        expected_output: { completed: true, iterations: 5 },
        test_code: await this.generateLoopTestCode(loop, 'normal'),
        priority: this.priorities.MEDIUM,
        status: 'generated'
      };
      tests.push(normalTest);

      const zeroTest = {
        analysis_id: analysisId,
        function_name: `loop_${i}`,
        test_type: this.testTypes.EDGE_CASE,
        description: `Teste com zero iterações do ${loop.type} na linha ${loop.line}`,
        input_data: { iterations: 0, testCase: 'zero' },
        expected_output: { completed: true, iterations: 0 },
        test_code: await this.generateLoopTestCode(loop, 'zero'),
        priority: this.priorities.HIGH,
        status: 'generated'
      };
      tests.push(zeroTest);
    }

    return tests;
  }

  generateInputData(params) {
    const inputData = {};

    params.forEach((param, index) => {
      switch (param.type) {
        case 'identifier':
          inputData[param.name] = this.generateSampleValueByName(param.name);
          break;
        case 'default':
          inputData[param.name] = 'DEFAULT_VALUE';
          break;
        case 'rest':
          inputData[param.name] = [1, 2, 3];
          break;
        default:
          inputData[param.name] = `param${index}`;
      }
    });

    return inputData;
  }

  generateSampleValueByName(paramName) {
    const name = paramName.toLowerCase();
    
    if (name.includes('id') || name.includes('index') || name.includes('count')) {
      return 1;
    }
    if (name.includes('age') || name.includes('year')) {
      return 25;
    }
    if (name.includes('price') || name.includes('amount') || name.includes('value')) {
      return 100.50;
    }

    if (name.includes('name') || name.includes('title')) {
      return 'Test Name';
    }
    if (name.includes('email')) {
      return 'test@example.com';
    }
    if (name.includes('url') || name.includes('link')) {
      return 'https://example.com';
    }
    if (name.includes('password')) {
      return 'Test123!';
    }

    if (name.includes('is') || name.includes('has') || name.includes('can')) {
      return true;
    }

    if (name.includes('list') || name.includes('array') || name.includes('items')) {
      return ['item1', 'item2'];
    }

    if (name.includes('user') || name.includes('person')) {
      return { id: 1, name: 'Test User' };
    }
    if (name.includes('config') || name.includes('options')) {
      return { option1: true, option2: 'value' };
    }

    return 'testValue';
  }

  generateInvalidParamData(params, targetIndex) {
    const inputData = this.generateInputData(params);
    const targetParam = params[targetIndex];
    
    const invalidValues = [null, undefined, '', 0, -1, NaN, {}, [], false];
    inputData[targetParam.name] = invalidValues[targetIndex % invalidValues.length];
    
    return inputData;
  }

  generateNullParamData(params) {
    const inputData = {};
    params.forEach(param => {
      inputData[param.name] = Math.random() > 0.5 ? null : undefined;
    });
    return inputData;
  }

  generateValidParamData(params, targetIndex) {
    const inputData = this.generateInputData(params);
    const targetParam = params[targetIndex];
    
    inputData[targetParam.name] = this.generateHighQualityValue(targetParam.name);
    
    return inputData;
  }

  generateHighQualityValue(paramName) {
    const name = paramName.toLowerCase();
    
    if (name.includes('email')) return 'user@domain.com';
    if (name.includes('phone')) return '+1234567890';
    if (name.includes('date')) return new Date().toISOString();
    if (name.includes('url')) return 'https://validurl.com/path';
    if (name.includes('name')) return 'Valid Name';
    
    return 'validValue';
  }

  generateExpectedOutput(func, isAsync = false) {
    const output = {
      type: 'unknown',
      description: `Saída esperada de ${func.name}`
    };

    const name = func.name.toLowerCase();
    
    if (name.includes('get') || name.includes('find')) {
      output.type = 'object_or_null';
      output.value = { id: 1, data: 'example' };
    } else if (name.includes('is') || name.includes('has') || name.includes('can')) {
      output.type = 'boolean';
      output.value = true;
    } else if (name.includes('count') || name.includes('length')) {
      output.type = 'number';
      output.value = 0;
    } else if (name.includes('list') || name.includes('all')) {
      output.type = 'array';
      output.value = [];
    } else if (name.includes('create') || name.includes('save')) {
      output.type = 'object';
      output.value = { id: 1, created: true };
    }

    if (isAsync) {
      return {
        type: 'promise',
        resolves: output
      };
    }

    return output;
  }

  generateErrorExpectation(func) {
    return {
      type: 'error',
      shouldThrow: true,
      errorType: 'Error',
      message: `Erro esperado em ${func.name} com parâmetros inválidos`
    };
  }

  calculatePriority(func) {
    if (func.complexity >= 10) return this.priorities.HIGH;
    if (func.complexity >= 5) return this.priorities.MEDIUM;
    return this.priorities.LOW;
  }

  async generateTestCode(func, testType, paramIndex = null) {
    const templates = await this.getTestTemplates('javascript', 'jest');
    
    switch (testType) {
      case 'basic':
        return this.populateTemplate(templates.unit, {
          functionName: func.name,
          testDescription: `deve executar ${func.name} corretamente`,
          inputData: JSON.stringify(this.generateInputData(func.params)),
          inputParams: func.params.map(p => p.name).join(', '),
          assertion: 'toBeDefined',
          expectedOutput: 'result'
        });
      
      case 'async':
        return `describe("${func.name}", () => {
  test("deve executar função async corretamente", async () => {
    const input = ${JSON.stringify(this.generateInputData(func.params))};
    
    const result = await ${func.name}(${func.params.map(p => `input.${p.name}`).join(', ')});
    
    expect(result).toBeDefined();
  });
});`;

      case 'invalid_param':
        const param = func.params[paramIndex];
        return `describe("${func.name}", () => {
  test("deve lidar com parâmetro ${param.name} inválido", () => {
    expect(() => {
      ${func.name}(${func.params.map((p, i) => 
        i === paramIndex ? 'null' : `'validValue'`
      ).join(', ')});
    }).toThrow();
  });
});`;

      default:
        return `// Código de teste para ${func.name} - ${testType}`;
    }
  }

  async getTestTemplates(language, framework) {
    try {
      const result = await query(`
        SELECT test_type, template_code 
        FROM test_templates 
        WHERE language = $1 AND test_framework = $2
      `, [language, framework]);

      const templates = {};
      result.rows.forEach(row => {
        templates[row.test_type] = row.template_code;
      });

      return templates;
    } catch (error) {
      console.warn('⚠️ Não foi possível carregar templates, usando padrões');
      return this.getDefaultTemplates();
    }
  }

  getDefaultTemplates() {
    return {
      unit: `describe("{{functionName}}", () => {
  test("{{testDescription}}", () => {
    const input = {{inputData}};
    const expected = {{expectedOutput}};
    
    const result = {{functionName}}({{inputParams}});
    
    expect(result).{{assertion}}(expected);
  });
});`,
      edge_case: `describe("{{functionName}} - Edge Cases", () => {
  test("should handle {{edgeCase}}", () => {
    expect(() => {{functionName}}({{inputData}})).{{expectation}};
  });
});`
    };
  }

  populateTemplate(template, data) {
    let populated = template;
    
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      populated = populated.replace(regex, data[key]);
    });

    return populated;
  }

  async generateClassTestCode(cls, type) {
    return `// Teste de classe ${cls.name} - ${type}`;
  }

  async generateMethodTestCode(cls, method) {
    return `// Teste de método ${cls.name}.${method.name}`;
  }

  async generateConditionalTestCode(conditional, path) {
    return `// Teste condicional ${conditional.type} - caminho ${path}`;
  }

  async generateLoopTestCode(loop, type) {
    return `// Teste de loop ${loop.type} - ${type}`;
  }

  generateClassConstructorData(cls) {
    return { constructorArgs: [] };
  }

  generateMethodInputData(method) {
    return { methodInput: 'testData' };
  }

  generateMethodExpectedOutput(method) {
    return { methodOutput: 'expected' };
  }
}

module.exports = new TestGenerator();