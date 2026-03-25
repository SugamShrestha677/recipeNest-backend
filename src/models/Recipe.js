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
      maxlength: 600,
      default: ''
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
    // New fields for detailed recipe
    image: {
      type: String,
      default: ''
    },
    prepTime: {
      type: Number,
      default: 30 // minutes
    },
    cookTime: {
      type: Number,
      default: 30 // minutes
    },
    servings: {
      type: Number,
      default: 4
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium'
    },
    cuisine: {
      type: String,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    saves: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    views: {
      type: Number,
      default: 0
    },
    published: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const Recipe = mongoose.model('Recipe', recipeSchema);
module.exports = Recipe;
