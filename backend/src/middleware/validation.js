const Joi = require('joi');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Verifique os campos e tente novamente',
        details: errors
      });
    }

    req[property] = value;
    next();
  };
};

const authSchemas = {
  register: Joi.object({
    name: Joi.string()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Nome deve ter pelo menos 2 caracteres',
        'string.max': 'Nome deve ter no máximo 100 caracteres',
        'any.required': 'Nome é obrigatório'
      }),
    
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Email deve ter um formato válido',
        'any.required': 'Email é obrigatório'
      }),
    
    password: Joi.string()
      .min(6)
      .max(100)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'Senha deve ter pelo menos 6 caracteres',
        'string.max': 'Senha deve ter no máximo 100 caracteres',
        'string.pattern.base': 'Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula e 1 número',
        'any.required': 'Senha é obrigatória'
      }),
    
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Confirmação de senha deve ser igual à senha',
        'any.required': 'Confirmação de senha é obrigatória'
      })
  }),
  
  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Email deve ter um formato válido',
        'any.required': 'Email é obrigatório'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Senha é obrigatória'
      })
  })
};

const projectSchemas = {
  create: Joi.object({
    name: Joi.string()
      .min(1)
      .max(255)
      .required()
      .messages({
        'string.min': 'Nome do projeto não pode estar vazio',
        'string.max': 'Nome do projeto deve ter no máximo 255 caracteres',
        'any.required': 'Nome do projeto é obrigatório'
      }),
    
    description: Joi.string()
      .max(1000)
      .allow('')
      .messages({
        'string.max': 'Descrição deve ter no máximo 1000 caracteres'
      })
  }),
  
  update: Joi.object({
    name: Joi.string()
      .min(1)
      .max(255)
      .messages({
        'string.min': 'Nome do projeto não pode estar vazio',
        'string.max': 'Nome do projeto deve ter no máximo 255 caracteres'
      }),
    
    description: Joi.string()
      .max(1000)
      .allow('')
      .messages({
        'string.max': 'Descrição deve ter no máximo 1000 caracteres'
      })
  }).min(1)
};

const analysisSchemas = {
  create: Joi.object({
    project_id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.guid': 'ID do projeto deve ser um UUID válido',
        'any.required': 'ID do projeto é obrigatório'
      }),
    
    source_code: Joi.string()
      .min(1)
      .max(1048576)
      .required()
      .messages({
        'string.min': 'Código fonte não pode estar vazio',
        'string.max': 'Código fonte muito grande (máximo 1MB)',
        'any.required': 'Código fonte é obrigatório'
      }),
    
    language: Joi.string()
      .valid('javascript', 'python')
      .required()
      .messages({
        'any.only': 'Linguagem deve ser javascript ou python',
        'any.required': 'Linguagem é obrigatória'
      }),
    
    file_name: Joi.string()
      .max(255)
      .pattern(/\.(js|jsx|ts|tsx|py)$/)
      .messages({
        'string.max': 'Nome do arquivo deve ter no máximo 255 caracteres',
        'string.pattern.base': 'Arquivo deve ter extensão válida (.js, .jsx, .ts, .tsx, .py)'
      })
  })
};

const testCaseSchemas = {
  update: Joi.object({
    description: Joi.string()
      .min(1)
      .max(1000)
      .messages({
        'string.min': 'Descrição não pode estar vazia',
        'string.max': 'Descrição deve ter no máximo 1000 caracteres'
      }),
    
    test_code: Joi.string()
      .max(10000)
      .messages({
        'string.max': 'Código de teste muito grande (máximo 10KB)'
      }),
    
    priority: Joi.number()
      .integer()
      .min(1)
      .max(3)
      .messages({
        'number.base': 'Prioridade deve ser um número',
        'number.integer': 'Prioridade deve ser um número inteiro',
        'number.min': 'Prioridade deve ser 1, 2 ou 3',
        'number.max': 'Prioridade deve ser 1, 2 ou 3'
      }),
    
    status: Joi.string()
      .valid('generated', 'edited', 'approved')
      .messages({
        'any.only': 'Status deve ser: generated, edited ou approved'
      })
  }).min(1)
};

const paramSchemas = {
  uuid: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.guid': 'ID deve ser um UUID válido',
        'any.required': 'ID é obrigatório'
      })
  })
};

const querySchemas = {
  pagination: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.base': 'Página deve ser um número',
        'number.integer': 'Página deve ser um número inteiro',
        'number.min': 'Página deve ser maior que 0'
      }),
    
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(10)
      .messages({
        'number.base': 'Limite deve ser um número',
        'number.integer': 'Limite deve ser um número inteiro',
        'number.min': 'Limite deve ser maior que 0',
        'number.max': 'Limite deve ser no máximo 100'
      })
  })
};

const customValidation = (validatorFn, errorMessage) => {
  return (req, res, next) => {
    try {
      const isValid = validatorFn(req);
      if (!isValid) {
        return res.status(400).json({
          error: 'Validação customizada falhou',
          message: errorMessage
        });
      }
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Erro na validação',
        message: error.message
      });
    }
  };
};

module.exports = {
  validate,
  authSchemas,
  projectSchemas,
  analysisSchemas,
  testCaseSchemas,
  paramSchemas,
  querySchemas,
  customValidation
};