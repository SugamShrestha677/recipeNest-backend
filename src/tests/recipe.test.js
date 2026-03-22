const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');

let mongoServer;
let authToken;

const credentials = {
  name: 'Recipe Tester',
  email: 'chef@example.com',
  password: 'securepass'
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  const registerResponse = await request(app).post('/api/auth/register').send(credentials);
  authToken = registerResponse.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await mongoose.connection.collection('recipes').deleteMany({});
});

describe('Recipe endpoints', () => {
  test('creates and fetches recipe', async () => {
    const createRes = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Tomato Soup',
        description: 'Warm and comforting',
        ingredients: ['Tomatoes', 'Water', 'Salt'],
        steps: ['Blend tomatoes', 'Simmer', 'Serve'],
        tags: ['comfort', 'veggie']
      });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.title).toBe('Tomato Soup');

    const listRes = await request(app)
      .get('/api/recipes')
      .set('Authorization', `Bearer ${authToken}`);

    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.recipes).toHaveLength(1);
    expect(listRes.body.total).toBe(1);
  });

  test('updates a recipe belonging to user', async () => {
    const createRes = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Grilled Cheese',
        ingredients: ['Bread', 'Cheese'],
        steps: ['Assemble', 'Grill']
      });

    const updated = await request(app)
      .put(`/api/recipes/${createRes.body._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Grilled Cheese Deluxe',
        ingredients: ['Bread', 'Cheese', 'Butter'],
        steps: ['Butter bread', 'Assemble', 'Grill'],
        tags: ['comfort']
      });

    expect(updated.statusCode).toBe(200);
    expect(updated.body.title).toBe('Grilled Cheese Deluxe');
    expect(updated.body.tags).toContain('comfort');
  });

  test('deletes a recipe', async () => {
    const createRes = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Salad',
        ingredients: ['Lettuce'],
        steps: ['Serve']
      });

    const deleteRes = await request(app)
      .delete(`/api/recipes/${createRes.body._id}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body.message).toMatch(/deleted/i);
  });
});
