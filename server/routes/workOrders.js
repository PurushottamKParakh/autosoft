import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

const workOrderSchema = z.object({
  description: z.string(),
  customerId: z.string(),
  vehicleId: z.string(),
  technicianId: z.string(),
  tasks: z.array(z.object({
    title: z.string(),
    description: z.string()
  })).optional(),
  parts: z.array(z.object({
    inventoryItemId: z.string(),
    quantity: z.number().int().positive()
  })).optional()
});

// Get all work orders for the company
router.get('/', async (req, res) => {
  try {
    const workOrders = await prisma.workOrder.findMany({
      where: { companyId: req.user.companyId },
      include: {
        customer: true,
        vehicle: true,
        technician: true,
        tasks: true,
        parts: {
          include: { inventoryItem: true }
        },
        invoice: true
      }
    });
    res.json(workOrders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single work order
router.get('/:id', async (req, res) => {
  try {
    const workOrder = await prisma.workOrder.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user.companyId
      },
      include: {
        customer: true,
        vehicle: true,
        technician: true,
        tasks: true,
        parts: {
          include: { inventoryItem: true }
        },
        invoice: true
      }
    });

    if (!workOrder) {
      return res.status(404).json({ message: 'Work order not found' });
    }

    res.json(workOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create work order
router.post('/', async (req, res) => {
  try {
    const data = workOrderSchema.parse(req.body);
    
    const workOrder = await prisma.workOrder.create({
      data: {
        description: data.description,
        companyId: req.user.companyId,
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        technicianId: data.technicianId,
        tasks: {
          create: data.tasks || []
        },
        parts: {
          create: data.parts || []
        }
      },
      include: {
        customer: true,
        vehicle: true,
        technician: true,
        tasks: true,
        parts: {
          include: { inventoryItem: true }
        }
      }
    });

    res.status(201).json(workOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update work order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = z.object({
      status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    }).parse(req.body);

    const workOrder = await prisma.workOrder.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user.companyId
      }
    });

    if (!workOrder) {
      return res.status(404).json({ message: 'Work order not found' });
    }

    const updatedWorkOrder = await prisma.workOrder.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        customer: true,
        vehicle: true,
        technician: true,
        tasks: true,
        parts: {
          include: { inventoryItem: true }
        }
      }
    });

    res.json(updatedWorkOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add task to work order
router.post('/:id/tasks', async (req, res) => {
  try {
    const { title, description } = z.object({
      title: z.string(),
      description: z.string()
    }).parse(req.body);

    const workOrder = await prisma.workOrder.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user.companyId
      }
    });

    if (!workOrder) {
      return res.status(404).json({ message: 'Work order not found' });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        workOrderId: req.params.id
      }
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add parts to work order
router.post('/:id/parts', async (req, res) => {
  try {
    const { parts } = z.object({
      parts: z.array(z.object({
        inventoryItemId: z.string(),
        quantity: z.number().int().positive()
      }))
    }).parse(req.body);

    const workOrder = await prisma.workOrder.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user.companyId
      }
    });

    if (!workOrder) {
      return res.status(404).json({ message: 'Work order not found' });
    }

    const createdParts = await prisma.$transaction(
      parts.map(part => 
        prisma.workOrderPart.create({
          data: {
            ...part,
            workOrderId: req.params.id
          }
        })
      )
    );

    res.status(201).json(createdParts);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;