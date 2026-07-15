import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/auth.decorator';

@Controller()
export class AppController {
  @Public()
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'UstaTop API',
      timestamp: new Date().toISOString(),
    };
  }
}
