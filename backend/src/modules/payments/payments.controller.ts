import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/auth.decorators';

@ApiTags('Payment Gateways & Webhooks')
@Controller('payments')
export class PaymentsController {
  @Public()
  @Post('webhooks/paystack')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook endpoint for Paystack payment notifications' })
  async handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() body: Record<string, any>,
  ) {
    return {
      message: 'Paystack webhook received and queued for processing',
    };
  }

  @Public()
  @Post('webhooks/flutterwave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook endpoint for Flutterwave payment notifications' })
  async handleFlutterwaveWebhook(
    @Headers('verif-hash') signature: string,
    @Body() body: Record<string, any>,
  ) {
    return {
      message: 'Flutterwave webhook received and queued for processing',
    };
  }
}
