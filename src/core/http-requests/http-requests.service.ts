import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { map } from 'rxjs/operators';

@Injectable()
export class HttpRequestsService {
  constructor(private readonly httpService: HttpService) {}

  async requestPost(url: string, data: any, config?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      return this.httpService
        .post(url, data, config)
        .pipe(map((response) => response.data))
        .subscribe({
          next: (v) => resolve(v),
          error: (e) => reject(e),
        });
    });
  }

  async requestGet(url: string, config?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.httpService
        .get(url, config)
        .pipe(map((response) => response.data))
        .subscribe({
          next: (v) => resolve(v),
          error: (e) => reject(e),
        });
    });
  }
}
