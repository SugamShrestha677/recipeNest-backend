const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: 3,
      maxlength: 120
    },
    description: {
      type: String,
      trim: true,
      maxlength: 600
    },
    ingredients: {
      type: [String],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'At least one ingredient is required'
      }
    },
    steps: {
      type: [String],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'At least one step is required'
      }
    },
    tags: {
      type: [String],
      default: []
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

const Recipe = mongoose.model('Recipe', recipeSchema);
module.exports = Recipe;
