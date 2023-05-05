import { Injectable } from '@nestjs/common';

import { HttpRequestsService } from '../http-requests/http-requests.service';

@Injectable()
export class DiscordService {
  constructor(private readonly httpRequestService: HttpRequestsService) {}

  async sendNotification(url: string, content: string) {
    try {
      await this.httpRequestService.requestPost(url, {
        username: 'Orbiter App',
        content,
      });
    } catch (error) {
      console.error(error);
    }
  }
}
