import { FastifyInstance } from 'fastify';
import { VendorController } from '../controllers/vendor.controller';
import { authenticate } from '../middleware/auth.middleware';

export async function vendorRoutes(server: FastifyInstance) {
  const controller = new VendorController(server);

  // List vendors with filters
  server.get('/', {
    onRequest: [authenticate],
  }, controller.listVendors.bind(controller));

  // Search vendors by specialty
  server.get('/search', {
    onRequest: [authenticate],
  }, controller.searchBySpecialty.bind(controller));

  // Get vendor by ID
  server.get('/:id', {
    onRequest: [authenticate],
  }, controller.getVendor.bind(controller));

  // Create new vendor
  server.post('/', {
    onRequest: [authenticate],
  }, controller.createVendor.bind(controller));

  // Update vendor
  server.put('/:id', {
    onRequest: [authenticate],
  }, controller.updateVendor.bind(controller));

  // Activate vendor
  server.post('/:id/activate', {
    onRequest: [authenticate],
  }, controller.activateVendor.bind(controller));

  // Suspend vendor
  server.post('/:id/suspend', {
    onRequest: [authenticate],
  }, controller.suspendVendor.bind(controller));

  // Get vendor performance metrics
  server.get('/:id/metrics', {
    onRequest: [authenticate],
  }, controller.getPerformanceMetrics.bind(controller));

  // Add vendor review
  server.post('/:id/reviews', {
    onRequest: [authenticate],
  }, controller.addReview.bind(controller));

  // Get vendor reviews
  server.get('/:id/reviews', {
    onRequest: [authenticate],
  }, controller.getReviews.bind(controller));

  // Delete vendor
  server.delete('/:id', {
    onRequest: [authenticate],
  }, controller.deleteVendor.bind(controller));
}
