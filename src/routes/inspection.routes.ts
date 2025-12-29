import { FastifyInstance } from 'fastify';
import { InspectionController } from '../controllers/inspection.controller';
import { authenticate } from '../middleware/auth.middleware';

export async function inspectionRoutes(server: FastifyInstance) {
  const controller = new InspectionController(server);

  // List inspections with filters
  server.get('/', {
    onRequest: [authenticate],
  }, controller.listInspections.bind(controller));

  // Get inspection by ID
  server.get('/:id', {
    onRequest: [authenticate],
  }, controller.getInspection.bind(controller));

  // Create new inspection
  server.post('/', {
    onRequest: [authenticate],
  }, controller.createInspection.bind(controller));

  // Update inspection
  server.put('/:id', {
    onRequest: [authenticate],
  }, controller.updateInspection.bind(controller));

  // Start inspection
  server.post('/:id/start', {
    onRequest: [authenticate],
  }, controller.startInspection.bind(controller));

  // Complete inspection
  server.post('/:id/complete', {
    onRequest: [authenticate],
  }, controller.completeInspection.bind(controller));

  // Upload photo to inspection
  server.post('/:id/photos', {
    onRequest: [authenticate],
  }, controller.uploadPhoto.bind(controller));

  // Generate inspection report
  server.post('/:id/report', {
    onRequest: [authenticate],
  }, controller.generateReport.bind(controller));

  // Delete inspection
  server.delete('/:id', {
    onRequest: [authenticate],
  }, controller.deleteInspection.bind(controller));
}
