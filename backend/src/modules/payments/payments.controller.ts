import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Public } from '../../common/decorators/auth.decorators';
import { PaymentsService } from './payments.service';
import { VerifyPaymentParamDto, MockWebhookTriggerDto } from './dto/payment.dto';

@ApiTags('Payment Gateways & Webhooks')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post('webhooks/paystack')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook receiver for Paystack (HMAC-SHA512 verified)' })
  @ApiResponse({ status: 200, description: 'Paystack webhook processed and wallet credited' })
  @ApiResponse({ status: 401, description: 'Invalid HMAC-SHA512 webhook signature' })
  async handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: any,
    @Body() body: Record<string, any>,
  ) {
    const rawBody = req.rawBody || JSON.stringify(body);
    return this.paymentsService.handlePaystackWebhook(signature, rawBody, body);
  }

  @Public()
  @Post('webhooks/flutterwave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook receiver for Flutterwave (verif-hash verified)' })
  @ApiResponse({ status: 200, description: 'Flutterwave webhook processed and wallet credited' })
  @ApiResponse({ status: 401, description: 'Invalid secret hash' })
  async handleFlutterwaveWebhook(
    @Headers('verif-hash') signature: string,
    @Req() req: any,
    @Body() body: Record<string, any>,
  ) {
    const rawBody = req.rawBody || JSON.stringify(body);
    return this.paymentsService.handleFlutterwaveWebhook(signature, rawBody, body);
  }

  @Public()
  @Post('webhooks/mock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sandbox mock webhook trigger for local development and testing' })
  @ApiResponse({ status: 200, description: 'Mock funding transaction fulfilled' })
  async handleMockWebhook(@Body() dto: MockWebhookTriggerDto) {
    return this.paymentsService.handleMockWebhook(dto);
  }

  @Public()
  @Get('verify/:reference')
  @ApiOperation({ summary: 'Verify checkout payment status and ensure wallet is credited' })
  @ApiParam({ name: 'reference', description: 'Transaction reference (e.g. SP_FUND_...)' })
  @ApiResponse({ status: 200, description: 'Payment status verified and receipt returned' })
  @ApiResponse({ status: 404, description: 'Transaction reference not found' })
  async verifyPayment(@Param() params: VerifyPaymentParamDto) {
    return this.paymentsService.verifyPayment(params.reference);
  }
}
