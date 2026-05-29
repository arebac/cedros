import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OAuthClient from 'intuit-oauth';
import { User } from '../users/user.entity';
import { Payment } from '../payments/payment.entity';

@Injectable()
export class QuickbooksService {
  private readonly logger = new Logger(QuickbooksService.name);
  private oauthClient: InstanceType<typeof OAuthClient>;
  private accessToken: string | null = null;
  private realmId: string | null = null;

  constructor(private config: ConfigService) {
    this.oauthClient = new OAuthClient({
      clientId: config.get<string>('QB_CLIENT_ID', ''),
      clientSecret: config.get<string>('QB_CLIENT_SECRET', ''),
      environment: (config.get<string>('QB_ENVIRONMENT', 'sandbox')) as 'sandbox' | 'production',
      redirectUri: config.get<string>('QB_REDIRECT_URI', ''),
    });
  }

  getAuthUrl(): string {
    return this.oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state: 'cedros-qb-auth',
    });
  }

  async handleCallback(url: string): Promise<void> {
    const authResponse = await this.oauthClient.createToken(url);
    const json = authResponse.getJson();
    this.accessToken = json.access_token;
    this.realmId = json.realmId;
    this.logger.log(`QuickBooks connected. RealmId: ${this.realmId}`);
  }

  async syncPayment(user: User, payment: Payment): Promise<void> {
    if (!this.accessToken || !this.realmId) {
      this.logger.warn('QuickBooks not connected — skipping sync');
      return;
    }

    const baseUrl = this.config.get('QB_ENVIRONMENT') === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';

    const payload = {
      TotalAmt: Number(payment.amount),
      CustomerRef: { name: `${user.firstName} ${user.lastName} - Apto ${user.apartmentNumber}` },
      PaymentMethodRef: { name: payment.method },
      PrivateNote: `Apto: ${user.apartmentNumber} | ${user.firstName} ${user.lastName} | Ref: ${payment.stripeChargeId || payment.id} | Mes: ${payment.billingMonth}/${payment.billingYear}`,
    };

    await this.oauthClient.makeApiCall({
      url: `${baseUrl}/v3/company/${this.realmId}/payment`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Payment: payload }),
    });

    this.logger.log(`Payment synced to QuickBooks for ${user.apartmentNumber}`);
  }

  isConnected(): boolean {
    return !!this.accessToken && !!this.realmId;
  }
}
