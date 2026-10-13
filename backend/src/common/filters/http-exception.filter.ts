import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        if (exception instanceof HttpException) {
            // Already-handled exceptions (BadRequestException, ConflictException,
            // etc.) respond exactly as Nest's own default filter would — this
            // filter adds nothing here, only the logging below for the case
            // that previously had none.
            response.status(exception.getStatus()).json(exception.getResponse());
            return;
        }

        // Errores no controlados (bugs, fallos de DB, etc.): se loguean
        // completos con stack trace para diagnóstico, pero no se exponen al
        // cliente — solo un mensaje genérico.
        this.logger.error(
            `Unhandled exception on ${request.method} ${request.url}`,
            exception instanceof Error ? exception.stack : String(exception),
        );

        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: "Ha ocurrido un error inesperado",
        });
    }
}