import { it, expect, describe, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { execSync } from 'node:child_process';
import { app } from '../src/app';

describe('Books routes', () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    execSync('npx knex migrate:rollback --all');
    execSync('npx knex migrate:latest');
  });

  async function createUserAndGetToken() {
    // Registrar usuário
    await request(app.server).post('/users/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    });

    // Fazer login
    const loginResponse = await request(app.server).post('/session').send({
      email: 'test@example.com',
      password: 'password123',
    });

    return loginResponse.get('Set-Cookie') ?? [];
  }

  it('should be able to create a new book', async () => {
    const cookies = await createUserAndGetToken();

    const response = await request(app.server)
      .post('/books')
      .set('Cookie', cookies)
      .send({
        title: 'Test Book',
        author: 'Test Author',
        genrer: 'Test Genre',
      });

    expect(response.status).toBe(201);
  });

  describe('GET/books', () => {
    it('should be able to list all books', async () => {
      const cookies = await createUserAndGetToken();

      const book = {
        title: 'Test Book 2',
        author: 'Test Author 2',
        genrer: 'Test Genre 2',
      };

      await request(app.server)
        .post('/books')
        .set('Cookie', cookies)
        .send(book);

      const listBooksResponse = await request(app.server)
        .get('/books')
        .set('Cookie', cookies)
        .expect(200);

      expect(listBooksResponse.body.books).toEqual([
        expect.objectContaining(book),
      ]);
    });

    it('should retur status 401 when there is not cookies', async () => {
      const listBooksResponse = await request(app.server).get('/books');

      expect(listBooksResponse.status).toBe(401);
    });
  });

  it('should be able to get a specific book', async () => {
    const cookies = await createUserAndGetToken();

    const book = {
      title: 'Test Book 2',
      author: 'Test Author 2',
      genrer: 'Test Genre 2',
    };

    await request(app.server)
      .post('/books')
      .set('Cookie', cookies)
      .send(book);

    const listBooksResponse = await request(app.server)
      .get('/books')
      .set('Cookie', cookies)
      .expect(200);

    const bookId = listBooksResponse.body.books[0].id;

    const getBookResponse = await request(app.server)
      .get(`/books/${bookId}`)
      .set('Cookie', cookies)
      .expect(200);

    expect(getBookResponse.body.book).toEqual(expect.objectContaining(book));
  });

  it('should be able to edit a specific book', async () => {
    const cookies = await createUserAndGetToken();

    const book = {
      title: 'Test Book',
      author: 'Test Author',
      genrer: 'Test Genre',
    };

    const createResponse = await request(app.server)
      .post('/books')
      .set('Cookie', cookies)
      .send(book);

    const listBooksResponse = await request(app.server)
      .get('/books')
      .set('Cookie', cookies)
      .expect(200);

    const bookId = listBooksResponse.body.books[0].id;

    const updateResponse = await request(app.server)
      .put(`/books/${bookId}`)
      .set('Cookie', cookies)
      .send({
        title: 'Updated Book Title',
        author: 'Updated Author',
      })
      .expect(200);

    expect(updateResponse.body).toHaveProperty('message');

    const getBookResponse = await request(app.server)
      .get(`/books/${bookId}`)
      .set('Cookie', cookies)
      .expect(200);

    expect(getBookResponse.body.book.title).toBe('Updated Book Title');
    expect(getBookResponse.body.book.author).toBe('Updated Author');
  });

  it('should be able to delete a specific book', async () => {
    const cookies = await createUserAndGetToken();

    const book = {
      title: 'Test Book',
      author: 'Test Author',
      genrer: 'Test Genre',
    };

    await request(app.server)
      .post('/books')
      .set('Cookie', cookies)
      .send(book);

    const listBooksResponse = await request(app.server)
      .get('/books')
      .set('Cookie', cookies)
      .expect(200);

    const bookId = listBooksResponse.body.books[0].id;

    await request(app.server)
      .delete(`/books/${bookId}`)
      .set('Cookie', cookies)
      .expect(204);

    const getBookResponse = await request(app.server)
      .get(`/books/${bookId}`)
      .set('Cookie', cookies);

    expect(getBookResponse.body.book).toBeUndefined();
  });
});
