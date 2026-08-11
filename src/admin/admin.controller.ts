import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('save-paper')
  @HttpCode(200)
  async savePaper(@Body() payload: any) {
    return this.adminService.savePaper(payload);
  }
}
