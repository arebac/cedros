import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import OAuthClient from 'intuit-oauth';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Payment } from '../payments/payment.entity';
import { QuickbooksConnection } from './quickbooks-connection.entity';

export type QuickBooksCustomer = {
  id: string;
  displayName: string;
  email?: string;
  active?: boolean;
};

type QuickBooksToken = {
  realmId?: string;
  token_type?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number | string;
  x_refresh_token_expires_in?: number | string;
  x_refresh_token_lifetime_expires_in?: number | string;
  id_token?: string;
  createdAt?: number | string;
};

@Injectable()
export class QuickbooksService implements OnModuleInit {
  private readonly logger = new Logger(QuickbooksService.name);
  private oauthClient: InstanceType<typeof OAuthClient>;
  private connection: QuickbooksConnection | null = null;
  private pendingStates = new Set<string>();

  constructor(
    private config: ConfigService,
    @InjectRepository(QuickbooksConnection)
    private connections: Repository<QuickbooksConnection>,
  ) {
    this.oauthClient = new OAuthClient({
      clientId: config.get<string>('QB_CLIENT_ID', ''),
      clientSecret: config.get<string>('QB_CLIENT_SECRET', ''),
      environment: (config.get<string>('QB_ENVIRONMENT', 'sandbox')) as 'sandbox' | 'production',
      redirectUri: config.get<string>('QB_REDIRECT_URI', ''),
    });
  }

  async onModuleInit() {
    await this.loadSavedConnection();
  }

  getAuthUrl(): string {
    const state = randomBytes(24).toString('hex');
    this.pendingStates.add(state);

    return this.oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state,
    });
  }

  async handleCallback(url: string): Promise<void> {
    const parsedUrl = new URL(url);
    const returnedState = parsedUrl.searchParams.get('state');
    if (!returnedState || !this.pendingStates.delete(returnedState)) {
      throw new BadRequestException('Invalid QuickBooks authorization state');
    }

    const authResponse = await this.oauthClient.createToken(url);
    await this.saveConnection(authResponse.getToken() as QuickBooksToken);
    this.logger.log(`QuickBooks accounting sync connected. RealmId: ${this.connection?.realmId}`);
  }

  getStatus() {
    return {
      connected: this.isConnected(),
      environment: this.getEnvironment(),
      realmId: this.connection?.realmId ?? null,
    };
  }

  private getEnvironment(): string {
    return this.config.get<string>('QB_ENVIRONMENT', 'sandbox');
  }

  private getBaseUrl(): string {
    return this.getEnvironment() === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';
  }

  private getEncryptionKey(): Buffer {
    const secret = this.config.get<string>('QB_TOKEN_ENCRYPTION_KEY') || this.config.get<string>('JWT_SECRET');
    if (!secret || secret === 'your-super-secret-jwt-key-change-this' || secret === 'fallback-secret') {
      throw new Error('QB_TOKEN_ENCRYPTION_KEY is required before saving QuickBooks tokens');
    }

    return createHash('sha256').update(secret).digest();
  }

  private encryptToken(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.getEncryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, ciphertext].map((part) => part.toString('base64url')).join('.');
  }

  private decryptToken(value: string): string {
    const [ivText, tagText, ciphertextText] = value.split('.');
    if (!ivText || !tagText || !ciphertextText) {
      throw new Error('Invalid encrypted QuickBooks token');
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.getEncryptionKey(),
      Buffer.from(ivText, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextText, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  private async loadSavedConnection() {
    const connection = await this.connections.findOne({
      where: { environment: this.getEnvironment(), active: true },
      order: { updatedAt: 'DESC' },
    });

    if (!connection) return;
    this.connection = connection;
    this.applyConnectionToken(connection);
  }

  private applyConnectionToken(connection: QuickbooksConnection) {
    this.oauthClient.setToken({
      realmId: connection.realmId,
      token_type: connection.tokenType,
      access_token: this.decryptToken(connection.accessTokenCiphertext),
      refresh_token: this.decryptToken(connection.refreshTokenCiphertext),
      expires_in: connection.expiresIn,
      x_refresh_token_expires_in: connection.refreshTokenExpiresIn,
      id_token: connection.idTokenCiphertext ? this.decryptToken(connection.idTokenCiphertext) : '',
      createdAt: Number(connection.tokenCreatedAt),
    });
  }

  private toNumber(value: number | string | undefined, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private async saveConnection(token: QuickBooksToken) {
    const realmId = token.realmId || this.oauthClient.getToken().realmId;
    if (!realmId || !token.access_token || !token.refresh_token) {
      throw new Error('QuickBooks did not return a complete token response');
    }

    const existing = await this.connections.findOne({
      where: { environment: this.getEnvironment(), active: true },
      order: { updatedAt: 'DESC' },
    });

    const connection = existing ?? this.connections.create();
    connection.environment = this.getEnvironment();
    connection.realmId = realmId;
    connection.accessTokenCiphertext = this.encryptToken(token.access_token);
    connection.refreshTokenCiphertext = this.encryptToken(token.refresh_token);
    connection.tokenType = token.token_type || 'bearer';
    connection.expiresIn = this.toNumber(token.expires_in);
    connection.refreshTokenExpiresIn = this.toNumber(token.x_refresh_token_expires_in);
    connection.refreshTokenLifetimeExpiresIn = this.toNumber(token.x_refresh_token_lifetime_expires_in);
    connection.idTokenCiphertext = token.id_token ? this.encryptToken(token.id_token) : null;
    connection.tokenCreatedAt = this.toNumber(token.createdAt, Date.now());
    connection.active = true;

    this.connection = await this.connections.save(connection);
    this.applyConnectionToken(this.connection);
  }

  private async requireConnection() {
    if (!this.connection) {
      await this.loadSavedConnection();
    }

    if (!this.connection) {
      throw new Error('QuickBooks accounting sync is not connected');
    }

    if (!this.oauthClient.isAccessTokenValid()) {
      const refreshed = await this.oauthClient.refreshUsingToken(
        this.decryptToken(this.connection.refreshTokenCiphertext),
      );
      await this.saveConnection(refreshed.getToken() as QuickBooksToken);
    }

    return { realmId: this.connection.realmId, baseUrl: this.getBaseUrl() };
  }

  async listCustomers(): Promise<QuickBooksCustomer[]> {
    const { realmId, baseUrl } = await this.requireConnection();
    const query = encodeURIComponent('select Id, DisplayName, PrimaryEmailAddr, Active from Customer maxresults 1000');
    const response = await this.oauthClient.makeApiCall({
      url: `${baseUrl}/v3/company/${realmId}/query?query=${query}`,
      method: 'GET',
    });

    const customers = response.json?.QueryResponse?.Customer ?? [];
    return customers.map((customer: any) => ({
      id: customer.Id,
      displayName: customer.DisplayName,
      email: customer.PrimaryEmailAddr?.Address,
      active: customer.Active,
    }));
  }

  async syncPayment(user: User, payment: Payment): Promise<string | null> {
    if (!user.quickbooksCustomerId) {
      this.logger.warn(`Resident ${user.id} has no QuickBooks customer mapping - skipping sync`);
      return null;
    }

    const connection = await this.requireConnection().catch((err) => {
      this.logger.warn(`${err.message} - skipping sync`);
      return null;
    });

    if (!connection) return null;

    const { realmId, baseUrl } = connection;

    const payload = {
      TotalAmt: Number(payment.amount),
      CustomerRef: {
        value: user.quickbooksCustomerId,
        name: user.quickbooksCustomerName || user.fullName,
      },
      PaymentMethodRef: { name: payment.method },
      PrivateNote: `Apto: ${user.apartmentNumber} | ${user.firstName} ${user.lastName} | Ref: ${payment.stripeChargeId || payment.id} | Mes: ${payment.billingMonth}/${payment.billingYear}`,
    };

    const response = await this.oauthClient.makeApiCall({
      url: `${baseUrl}/v3/company/${realmId}/payment`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Payment: payload }),
    });

    const quickbooksPaymentId = response.json?.Payment?.Id ?? null;
    this.logger.log(`Payment synced to QuickBooks for ${user.apartmentNumber}`);
    return quickbooksPaymentId;
  }

  isConnected(): boolean {
    return !!this.connection?.accessTokenCiphertext && !!this.connection?.refreshTokenCiphertext && !!this.connection?.realmId;
  }
}
