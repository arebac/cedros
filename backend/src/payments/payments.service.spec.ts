import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { Payment, PaymentMethod, PaymentStatus } from './payment.entity';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { QuickbooksService } from '../quickbooks/quickbooks.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentsRepository: { create: jest.Mock; findOne: jest.Mock; save: jest.Mock };
  let usersRepository: { findOne: jest.Mock; update: jest.Mock };
  let notifications: { sendPaymentReceipt: jest.Mock };
  let quickbooks: { syncPayment: jest.Mock };

  beforeEach(async () => {
    paymentsRepository = {
      create: jest.fn((payment) => ({ id: 'payment-new', ...payment })),
      findOne: jest.fn(),
      save: jest.fn((payment) => Promise.resolve(payment)),
    };
    usersRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };
    notifications = {
      sendPaymentReceipt: jest.fn().mockResolvedValue(undefined),
    };
    quickbooks = {
      syncPayment: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: paymentsRepository },
        { provide: getRepositoryToken(User), useValue: usersRepository },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('sk_test_unit') },
        },
        { provide: NotificationsService, useValue: notifications },
        { provide: QuickbooksService, useValue: quickbooks },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('getStatus', () => {
    it('counts a current-month manual payment as paid with zero balance', async () => {
      usersRepository.findOne.mockResolvedValue({ id: 'user-1', monthlyFee: 250 });
      paymentsRepository.findOne.mockResolvedValue({
        id: 'payment-1',
        userId: 'user-1',
        method: PaymentMethod.MANUAL,
        status: PaymentStatus.MANUAL,
      });

      const status = await service.getStatus('user-1');

      expect(status.paid).toBe(true);
      expect(status.balance).toBe(0);
      expect(paymentsRepository.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({
          userId: 'user-1',
          status: expect.objectContaining({
            _value: [PaymentStatus.COMPLETED, PaymentStatus.MANUAL],
          }),
        }),
      });
    });

    it('returns the monthly fee balance when no current-month paid payment exists', async () => {
      usersRepository.findOne.mockResolvedValue({ id: 'user-1', monthlyFee: '250.00' });
      paymentsRepository.findOne.mockResolvedValue(null);

      const status = await service.getStatus('user-1');

      expect(status.paid).toBe(false);
      expect(status.balance).toBe(250);
    });

    it('throws when the user cannot be found', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      paymentsRepository.findOne.mockResolvedValue(null);

      await expect(service.getStatus('missing-user')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('handlePaymentSuccess', () => {
    const intent = {
      id: 'pi_existing',
      latest_charge: 'ch_existing',
      metadata: {
        userId: 'user-1',
        billingMonth: '6',
        billingYear: '2026',
        processingFee: '5.00',
        method: PaymentMethod.CARD,
      },
    };

    it('does not create a duplicate payment for an already processed Stripe payment intent', async () => {
      paymentsRepository.findOne.mockResolvedValue({ id: 'payment-existing', stripePaymentIntentId: intent.id });

      await (service as any).handlePaymentSuccess(intent);

      expect(usersRepository.findOne).not.toHaveBeenCalled();
      expect(paymentsRepository.create).not.toHaveBeenCalled();
      expect(paymentsRepository.save).not.toHaveBeenCalled();
      expect(notifications.sendPaymentReceipt).not.toHaveBeenCalled();
      expect(quickbooks.syncPayment).not.toHaveBeenCalled();
    });

    it('creates one payment when the Stripe payment intent has not been processed', async () => {
      paymentsRepository.findOne.mockResolvedValue(null);
      usersRepository.findOne.mockResolvedValue({ id: 'user-1', monthlyFee: '162.03' });

      await (service as any).handlePaymentSuccess(intent);

      expect(paymentsRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-1',
        amount: 162.03,
        status: PaymentStatus.COMPLETED,
        stripePaymentIntentId: intent.id,
      }));
      expect(paymentsRepository.save).toHaveBeenCalledTimes(1);
      expect(notifications.sendPaymentReceipt).toHaveBeenCalledTimes(1);
      expect(quickbooks.syncPayment).toHaveBeenCalledTimes(1);
    });
  });
});
