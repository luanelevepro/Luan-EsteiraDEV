import axios from 'axios';
import crypto from 'crypto';

interface Subscription {
  id: string;
  resource: string;
  changeType: string;
  clientState: string;
  notificationUrl: string;
  expirationDateTime: string;
  creatorId: string;
}

interface SubscriptionResponse {
  '@odata.context': string;
  value: Subscription[];
}

interface CreateSubscriptionPayload {
  changeType: string;
  notificationUrl: string;
  resource: string;
  expirationDateTime: string;
  clientState: string;
}

class WebhookService {
  private readonly mailboxEmail = process.env.MICROSOFT_USER;
  private readonly defaultWebhookUrl = process.env.WEBHOOK_URL;
  private readonly clientState =
    process.env.WEBHOOK_CLIENT_STATE || crypto.randomBytes(16).toString('hex');

  async getAccessToken(): Promise<string> {
    try {
      const response = await axios.post(
        `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: process.env.CLIENT_ID!,
          client_secret: process.env.CLIENT_SECRET!,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      return response.data.access_token;
    } catch (error: any) {
      throw new Error('Failed to get access token');
    }
  }

  async createSubscription(notificationUrl?: string): Promise<Subscription> {
    try {
      const accessToken = await this.getAccessToken();

      const expirationDateTime = new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000
      ).toISOString();

      // Use provided URL or fall back to default
      const webhookUrl = notificationUrl || this.defaultWebhookUrl;

      if (!webhookUrl) {
        throw new Error('Notification URL is required');
      }

      const subscriptionPayload: CreateSubscriptionPayload = {
        changeType: 'created',
        notificationUrl: webhookUrl,
        resource: `/users/${this.mailboxEmail}/messages`,
        expirationDateTime: expirationDateTime,
        clientState: this.clientState,
      };

      console.log('Creating subscription with URL:', webhookUrl);

      const response = await axios.post(
        `${process.env.MICROSOFT_GRAPH_URL}/subscriptions`,
        subscriptionPayload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error(
        `Failed to create subscription: ${JSON.stringify(error.response?.data)}`
      );
    }
  }

  async listSubscriptions(): Promise<Subscription[]> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get<SubscriptionResponse>(
        `${process.env.MICROSOFT_GRAPH_URL}/subscriptions`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`Found ${response.data.value.length} active subscriptions`);
      return response.data.value;
    } catch (error: any) {
      throw new Error('Failed to list subscriptions');
    }
  }

  async renewSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const accessToken = await this.getAccessToken();

      const expirationDateTime = new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000
      ).toISOString();

      const response = await axios.patch(
        `${process.env.MICROSOFT_GRAPH_URL}/subscriptions/${subscriptionId}`,
        { expirationDateTime },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error('Failed to renew subscription');
    }
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();

      await axios.delete(
        `${process.env.MICROSOFT_GRAPH_URL}/subscriptions/${subscriptionId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } catch (error: any) {
      throw new Error('Failed to delete subscription');
    }
  }

  validateNotification(clientState: string): boolean {
    return clientState === this.clientState;
  }

  async getSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `${process.env.MICROSOFT_GRAPH_URL}/subscriptions/${subscriptionId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      throw new Error('Failed to get subscription');
    }
  }
}

export default new WebhookService();
