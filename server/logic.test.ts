import test from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase, db } from './db.js';
import { createSession, getUserFromToken, revokeSession } from './auth.js';
import { researchCompany } from './search.js';
import { generateStudyPackPdf } from './pdf.js';

test('database initializes schema and seeds demo user', () => {
  initDatabase();
  const user = db.prepare('SELECT id, name, email FROM app_users WHERE email = ?').get('raghav@example.com') as any;
  assert.ok(user, 'Demo user should be seeded');
  assert.equal(user.name, 'Raghav');
  assert.equal(user.email, 'raghav@example.com');
});

test('session creation, retrieval, and revocation work securely', () => {
  initDatabase();
  const user = db.prepare('SELECT id FROM app_users WHERE email = ?').get('raghav@example.com') as any;
  assert.ok(user);

  const token = createSession(user.id);
  assert.ok(typeof token === 'string' && token.length > 20);

  const retrieved = getUserFromToken(token);
  assert.ok(retrieved);
  assert.equal(retrieved.id, user.id);
  assert.equal(retrieved.name, 'Raghav');

  revokeSession(token);
  const afterRevoke = getUserFromToken(token);
  assert.equal(afterRevoke, null, 'Revoked token must yield null');
});

test('company research returns sourced facts with citations and practice questions', async () => {
  const result = await researchCompany('Stripe', 'Senior Full-Stack Engineer');
  assert.equal(result.company, 'Stripe');
  assert.ok(result.overview.length > 20);
  assert.ok(result.sourcedFacts.length > 0);
  assert.ok(result.sourcedFacts[0].sourceUrl.startsWith('http'));
  assert.ok(result.practiceQuestions.length >= 3);
  assert.equal(result.practiceQuestions[0].isVerifiedHistoricalQuestion, false);
});

test('PDF study pack generation produces valid PDF buffer', async () => {
  const research = await researchCompany('Stripe', 'Senior Full-Stack Engineer');
  const buffer = generateStudyPackPdf({
    userName: 'Raghav',
    targetRole: 'Senior Full-Stack Engineer',
    targetCompany: 'Stripe',
    generationDate: '2026-10-26',
    analysis: {
      overallMatchScore: 92,
      profileSummary: 'Strong match for Stripe Billing infrastructure.',
      requirementsMatch: [
        { requirement: 'TypeScript & React', status: 'matched', evidence: '6 years experience', importance: 'high' }
      ],
      strengths: ['Deep PostgreSQL knowledge'],
      gaps: ['Elaborate Kafka consumer scaling'],
      truthfulKeywordSuggestions: ['Idempotency Keys'],
      likelyTopics: ['System Design'],
      studyPlan: [{ day: 1, focus: 'Idempotency', task: 'Revise SETNX' }],
      uncertaintyNotes: []
    },
    companyResearch: research
  });

  assert.ok(Buffer.isBuffer(buffer), 'Should be a Node Buffer');
  assert.ok(buffer.length > 1000, 'PDF buffer should contain valid PDF data');
  // Check PDF header signature: %PDF-
  const header = buffer.subarray(0, 5).toString('ascii');
  assert.equal(header, '%PDF-');
});
