import { FastifyInstance } from 'fastify';
import { DamageController } from '../controllers/damage.controller';
import { authenticate } from '../middleware/auth.middleware';

export async function damageRoutes(server: FastifyInstance) {
  const controller = new DamageController(server);

  // List damages with filters
  server.get('/', {
    onRequest: [authenticate],
  }, controller.listDamages.bind(controller));

  // Get damage by ID
  server.get('/:id', {
    onRequest: [authenticate],
  }, controller.getDamage.bind(controller));

  // Create new damage (manual)
  server.post('/', {
    onRequest: [authenticate],
  }, controller.createDamage.bind(controller));

  // Update damage
  server.put('/:id', {
    onRequest: [authenticate],
  }, controller.updateDamage.bind(controller));

  // AI damage detection from image
  server.post('/detect', {
    onRequest: [authenticate],
  }, controller.detectDamageFromImage.bind(controller));

  // Compare before/after images
  server.post('/compare', {
    onRequest: [authenticate],
  }, controller.compareBeforeAfter.bind(controller));

  // Add photo to damage
  server.post('/:id/photos', {
    onRequest: [authenticate],
  }, controller.addPhoto.bind(controller));

  // Dispute damage
  server.post('/:id/dispute', {
    onRequest: [authenticate],
  }, controller.disputeDamage.bind(controller));

  // Resolve dispute
  server.post('/:id/dispute/resolve', {
    onRequest: [authenticate],
  }, controller.resolveDispute.bind(controller));

  // Delete damage
  server.delete('/:id', {
    onRequest: [authenticate],
  }, controller.deleteDamage.bind(controller));
}
