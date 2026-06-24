import Joi from 'joi';

const productQuerySchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),

  cursor: Joi.string()
    .base64()
    .optional()
    .messages({
      'string.base64': 'Invalid cursor format. The cursor must be a valid Base64 encoded string.',
    }),

  category: Joi.string()
    .max(100)
    .trim()
    .optional(),
});

export const validateProductQuery = (req, res, next) => {
  const { error, value } = productQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => detail.message);
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors,
    });
  }

  req.validatedQuery = value;
  next();
};
