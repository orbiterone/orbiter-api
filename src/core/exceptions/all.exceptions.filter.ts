import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import jsend from 'jsend';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown | any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any;
    if (exception.response && exception.response.message) {
      message = exception.response.message;
    } else if (exception.response && exception.response.length) {
      message = exception.response;
    } else {
      message = exception.message;
    }

    return response
      .status(status)
      .json(status == 200 ? exception.response : jsend.fail({ message }));
  }
}
