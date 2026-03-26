const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Recipe = require('../models/Recipe');

let mongoServer;
let authToken;
let userId;
let secondUserId;
let secondUserToken;

const testUser = {
  name: 'Test Chef',
  email: 'chef@test.com',
  password: 'password123'
};

const secondUser = {
  name: 'Another Chef',
  email: 'another@test.com',
  password: 'password123'
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  
  // Create first user
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send(testUser);
  authToken = registerRes.body.token;
  userId = registerRes.body.user.id;
  
  // Create second user
  const secondRes = await request(app)
    .post('/api/auth/register')
    .send(secondUser);
  secondUserToken = secondRes.body.token;
  secondUserId = secondRes.body.user.id;
  
  // Create some recipes for first chef
  await Recipe.create({
    title: 'Test Recipe 1',
    ingredients: ['ing1', 'ing2'],
    instructions: ['step1', 'step2'],
    createdBy: userId,
    published: true
  });
  
  await Recipe.create({
    title: 'Test Recipe 2',
    ingredients: ['ing1', 'ing2'],
    instructions: ['step1', 'step2'],
    createdBy: userId,
    published: true
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Chef Routes', () => {
  
  test('GET /api/chefs - Get all chefs', async () => {
    const res = await request(app)
      .get('/api/chefs')
      .expect(200);
    
    expect(res.body.chefs).toBeDefined();
    expect(res.body.chefs.length).toBeGreaterThanOrEqual(2);
    expect(res.body.chefs[0]).toHaveProperty('name');
  });
  
  test('GET /api/chefs/:id - Get specific chef', async () => {
    const res = await request(app)
      .get(`/api/chefs/${userId}`)
      .expect(200);
    
    expect(res.body.name).toBe(testUser.name);
    expect(res.body.email).toBe(testUser.email);
    expect(res.body.recipeCount).toBe(2);
    expect(res.body.recentRecipes).toBeDefined();
    expect(res.body.recentRecipes.length).toBe(2);
  });
  
  test('GET /api/chefs/:id/recipes - Get chef recipes', async () => {
    const res = await request(app)
      .get(`/api/chefs/${userId}/recipes`)
      .expect(200);
    
    expect(res.body.recipes).toBeDefined();
    expect(res.body.total).toBe(2);
    expect(res.body.recipes.length).toBe(2);
  });
  
  test('GET /api/chefs/:id/stats - Get chef statistics', async () => {
    const res = await request(app)
      .get(`/api/chefs/${userId}/stats`)
      .expect(200);
    
    expect(res.body.totalRecipes).toBe(2);
    expect(res.body.totalLikes).toBe(0);
    expect(res.body.followerCount).toBe(0);
  });
  
  test('POST /api/chefs/:id/follow - Follow a chef', async () => {
    const res = await request(app)
      .post(`/api/chefs/${userId}/follow`)
      .set('Authorization', `Bearer ${secondUserToken}`)
      .expect(200);
    
    expect(res.body.following).toBe(true);
    expect(res.body.followerCount).toBe(1);
  });
  
  test('POST /api/chefs/:id/follow - Unfollow a chef', async () => {
    const res = await request(app)
      .post(`/api/chefs/${userId}/follow`)
      .set('Authorization', `Bearer ${secondUserToken}`)
      .expect(200);
    
    expect(res.body.following).toBe(false);
    expect(res.body.followerCount).toBe(0);
  });
  
  test('GET /api/chefs/:id/followers - Get chef followers', async () => {
    // First follow
    await request(app)
      .post(`/api/chefs/${userId}/follow`)
      .set('Authorization', `Bearer ${secondUserToken}`);
    
    const res = await request(app)
      .get(`/api/chefs/${userId}/followers`)
      .expect(200);
    
    expect(res.body.count).toBe(1);
    expect(res.body.followers[0].name).toBe(secondUser.name);
  });
  
  test('GET /api/chefs/following - Get chefs current user follows', async () => {
    const res = await request(app)
      .get('/api/chefs/following')
      .set('Authorization', `Bearer ${secondUserToken}`)
      .expect(200);
    
    expect(res.body.count).toBe(1);
    expect(res.body.following[0].name).toBe(testUser.name);
  });
  
  test('PUT /api/chefs/profile - Update chef profile', async () => {
    const updateData = {
      name: 'Updated Chef Name',
      bio: 'This is my updated bio',
      specialty: 'Italian Cuisine',
      experience: 10,
      location: 'Rome, Italy',
      website: 'https://mywebsite.com',
      phone: '+39 123 456 7890'
    };
    
    const res = await request(app)
      .put('/api/chefs/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData)
      .expect(200);
    
    expect(res.body.user.name).toBe(updateData.name);
    expect(res.body.user.bio).toBe(updateData.bio);
    expect(res.body.user.specialty).toBe(updateData.specialty);
    expect(res.body.user.experience).toBe(updateData.experience);
    expect(res.body.user.location).toBe(updateData.location);
    expect(res.body.user.website).toBe(updateData.website);
  });
  
  test('GET /api/chefs/top-rated - Get top rated chefs', async () => {
    const res = await request(app)
      .get('/api/chefs/top-rated')
      .expect(200);
    
    expect(res.body.chefs).toBeDefined();
  });
});