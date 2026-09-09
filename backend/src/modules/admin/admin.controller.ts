import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles, CurrentUser } from '../../common/decorators/auth.decorators';
import { AdminService } from './admin.service';
import {
  UserListQueryDto,
  UpdateUserStatusDto,
  UpdateNetworkDiscountDto,
  UpdateDataPlanPriceDto,
  ProcessRefundDto,
  RefundQueryDto,
  AdminTransactionQueryDto,
  UpsertSystemSettingDto,
} from './dto/admin.dto';

@ApiTags('Admin Console & Operations')
@ApiBearerAuth()
@Roles('SUPER_ADMIN', 'FINANCE_ADMIN', 'SUPPORT')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ──────────────────────────── DASHBOARD OVERVIEW ─────────────────────────

  @Get('dashboard/overview')
  @ApiOperation({ summary: 'Admin revenue, transaction volumes, user counts, and wallet aggregates' })
  @ApiResponse({ status: 200, description: 'Admin metrics retrieved successfully' })
  async getOverview() {
    return this.adminService.getDashboardOverview();
  }

  // ──────────────────────────── USER MANAGEMENT ────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'Search and paginate all registered users with wallet and transaction counts' })
  @ApiResponse({ status: 200, description: 'Users list retrieved successfully' })
  async listUsers(@Query() query: UserListQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get full details of a specific user including recent transactions and tickets' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserDetails(@Param('id') id: string) {
    return this.adminService.getUserDetails(id);
  }

  @Put('users/:id/status')
  @Roles('SUPER_ADMIN', 'SUPPORT')
  @ApiOperation({ summary: 'Suspend or activate a user account (with audit log)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User status updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot change own status' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserStatus(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(admin.id, id, dto);
  }

  // ──────────────────────────── TRANSACTIONS ────────────────────────────────

  @Get('transactions')
  @ApiOperation({ summary: 'Search, filter, and paginate all system transactions' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async listTransactions(@Query() query: AdminTransactionQueryDto) {
    return this.adminService.listTransactions(query);
  }

  // ──────────────────────────── REFUNDS ─────────────────────────────────────

  @Get('refunds')
  @ApiOperation({ summary: 'List and paginate all processed refunds' })
  @ApiResponse({ status: 200, description: 'Refunds retrieved successfully' })
  async listRefunds(@Query() query: RefundQueryDto) {
    return this.adminService.listRefunds(query);
  }

  @Post('refunds/process')
  @HttpCode(HttpStatus.OK)
  @Roles('SUPER_ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Manually review and process transaction refund (credits user wallet)' })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiResponse({ status: 409, description: 'Transaction already refunded' })
  async processRefund(
    @CurrentUser() admin: any,
    @Body() dto: ProcessRefundDto,
  ) {
    return this.adminService.processRefund(admin.id, dto);
  }

  // ──────────────────────────── PRICING MANAGEMENT ──────────────────────────

  @Get('pricing')
  @ApiOperation({ summary: 'Get service pricing overview and network discounts' })
  @ApiResponse({ status: 200, description: 'Pricing retrieved successfully' })
  async getPricing() {
    return this.adminService.listNetworks();
  }

  @Get('pricing/networks')
  @ApiOperation({ summary: 'List all telecom networks with airtime discounts' })
  @ApiResponse({ status: 200, description: 'Networks list retrieved successfully' })
  async listNetworks() {
    return this.adminService.listNetworks();
  }

  @Patch('pricing/networks/:id')
  @Roles('SUPER_ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Update network airtime discount (in basis points, e.g. 300 = 3%)' })
  @ApiParam({ name: 'id', description: 'Network ID' })
  @ApiResponse({ status: 200, description: 'Network discount updated successfully' })
  @ApiResponse({ status: 404, description: 'Network not found' })
  async updateNetworkDiscount(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: UpdateNetworkDiscountDto,
  ) {
    return this.adminService.updateNetworkDiscount(admin.id, id, dto);
  }

  @Get('pricing/data-plans')
  @ApiOperation({ summary: 'List all data plans with cost price, selling price, and margins' })
  @ApiQuery({ name: 'networkId', required: false, description: 'Filter by Network ID' })
  @ApiResponse({ status: 200, description: 'Data plans retrieved successfully' })
  async listDataPlans(@Query('networkId') networkId?: string) {
    return this.adminService.listDataPlans(networkId);
  }

  @Patch('pricing/data-plans/:id')
  @Roles('SUPER_ADMIN', 'FINANCE_ADMIN')
  @ApiOperation({ summary: 'Update data plan selling price (in Kobo) and active status' })
  @ApiParam({ name: 'id', description: 'Data plan ID' })
  @ApiResponse({ status: 200, description: 'Data plan price updated successfully' })
  @ApiResponse({ status: 404, description: 'Data plan not found' })
  async updateDataPlanPrice(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: UpdateDataPlanPriceDto,
  ) {
    return this.adminService.updateDataPlanPrice(admin.id, id, dto);
  }

  // ──────────────────────────── SYSTEM SETTINGS ─────────────────────────────

  @Get('system-settings')
  @ApiOperation({ summary: 'Get all system-wide configuration flags and settings' })
  @ApiResponse({ status: 200, description: 'System settings retrieved successfully' })
  async getSystemSettings() {
    return this.adminService.getSystemSettings();
  }

  @Put('system-settings')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create or update a system setting key-value pair' })
  @ApiResponse({ status: 200, description: 'System setting updated successfully' })
  async upsertSystemSetting(
    @CurrentUser() admin: any,
    @Body() dto: UpsertSystemSettingDto,
  ) {
    return this.adminService.upsertSystemSetting(admin.id, dto);
  }

  @Put('system-settings/:key')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Update a specific system setting by key' })
  @ApiParam({ name: 'key', description: 'Setting key name (e.g. MAINTENANCE_MODE)' })
  @ApiResponse({ status: 200, description: 'System setting updated successfully' })
  async updateSystemSettingByKey(
    @CurrentUser() admin: any,
    @Param('key') key: string,
    @Body() dto: UpsertSystemSettingDto,
  ) {
    dto.key = key;
    return this.adminService.upsertSystemSetting(admin.id, dto);
  }
}
