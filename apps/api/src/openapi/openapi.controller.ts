import { Controller, Get } from '@nestjs/common';
import { buildOpenApiDocument } from '@toma/contract';

/** Serves the API's own contract so clients/tools can fetch the live spec. */
@Controller('openapi.json')
export class OpenApiController {
  @Get()
  spec() {
    return buildOpenApiDocument();
  }
}
