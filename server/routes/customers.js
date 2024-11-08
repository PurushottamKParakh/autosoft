import express from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = express.Router();
const prisma = new PrismaClient();

const customerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
});

// Get all customers for the company
router.get('/', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { companyId: req.user.companyId },
      include: {
        vehicles: true,
        workOrders: {
          include: {
            vehicle: true,
            tasks: true,
            invoice: true
          }
        }
      }
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single customer
router.get('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user.companyId
      },
      include: {
        vehicles: true,
        workOrders: {
          include: {
            vehicle: true,
            tasks: true,
            invoice: true
          }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create customer
router.post('/', async (req, res) => {
  try {
    const data = customerSchema.parse(req.body);
    
    const customer = await prisma.customer.create({
      data: {
        ...data,
        companyId: req.user.companyId
      },
      include: { vehicles: true }
    });

    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const data = customerSchema.parse(req.body);
    
    const customer = await prisma.customer.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user.companyId
      }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: req.params.id },
      data,
      include: { vehicles: true }
    });

    res.json(updatedCustomer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: {
        id: req.params.id,
        companyId: req.user.companyId
      }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await prisma.customer.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;