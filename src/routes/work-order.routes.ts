import { FastifyInstance } from 'fastify';
import { WorkOrderController } from '../controllers/work-order.controller';
import { authenticate } from '../middleware/auth.middleware';

export async function workOrderRoutes(server: FastifyInstance) {
  const controller = new WorkOrderController(server);

  // List work orders with filters
  server.get('/', {
    onRequest: [authenticate],
  }, controller.listWorkOrders.bind(controller));

  // Get work order by ID
  server.get('/:id', {
    onRequest: [authenticate],
  }, controller.getWorkOrder.bind(controller));

  // Create new work order
  server.post('/', {
    onRequest: [authenticate],
  }, controller.createWorkOrder.bind(controller));

  // Update work order
  server.put('/:id', {
    onRequest: [authenticate],
  }, controller.updateWorkOrder.bind(controller));

  // Assign work order to vendor
  server.post('/:id/assign', {
    onRequest: [authenticate],
  }, controller.assignToVendor.bind(controller));

  // Schedule work order
  server.post('/:id/schedule', {
    onRequest: [authenticate],
  }, controller.scheduleWorkOrder.bind(controller));

  // Start work order
  server.post('/:id/start', {
    onRequest: [authenticate],
  }, controller.startWorkOrder.bind(controller));

  // Complete work order
  server.post('/:id/complete', {
    onRequest: [authenticate],
  }, controller.completeWorkOrder.bind(controller));

  // Verify completed work order
  server.post('/:id/verify', {
    onRequest: [authenticate],
  }, controller.verifyWorkOrder.bind(controller));

  // Upload before photo
  server.post('/:id/photos/before', {
    onRequest: [authenticate],
  }, controller.uploadPhotoBefore.bind(controller));

  // Upload after photo
  server.post('/:id/photos/after', {
    onRequest: [authenticate],
  }, controller.uploadPhotoAfter.bind(controller));

  // Cancel work order
  server.post('/:id/cancel', {
    onRequest: [authenticate],
  }, controller.cancelWorkOrder.bind(controller));

  // Delete work order
  server.delete('/:id', {
    onRequest: [authenticate],
  }, controller.deleteWorkOrder.bind(controller));
}
