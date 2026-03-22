const validator = require('validator');

function sanitizeString(input) {
  if (typeof input !== 'string') {
    return '';
  }
  return validator.escape(input.trim());
}

function parseArray(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeString(item)).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((segment) => sanitizeString(segment))
      .filter(Boolean);
  }
  return [];
}

function validateRecipePayload(payload) {
  const title = sanitizeString(payload.title);
  const description = sanitizeString(payload.description);
  const ingredients = parseArray(payload.ingredients);
  const steps = parseArray(payload.steps);

  if (!title || title.length < 3) {
    throw new Error('Recipe title must be at least 3 characters');
  }
  if (ingredients.length === 0) {
    throw new Error('Provide at least one ingredient');
  }
  if (steps.length === 0) {
    throw new Error('Provide at least one step');
  }

  return {
    title,
    description,
    ingredients,
    steps,
    tags: parseArray(payload.tags)
  };
}

module.exports = {
  sanitizeString,
  parseArray,
  validateRecipePayload
};
