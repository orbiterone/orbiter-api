import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, getSchemaPath } from '@nestjs/swagger';

export class PaginatedDto<TModel> {
  @ApiProperty({ type: 'number' })
  page: number;

  @ApiProperty({ type: 'number' })
  pages: number;

  @ApiProperty({ type: 'number' })
  countItems: number;

  entities: TModel[];
}

export const ApiDataResponse = <TModel extends Type<any>>(
  model: TModel,
  typeData = 'object',
) => {
  const data = {
    schema: {
      properties: {
        data: {
          type: typeData,
          $ref: getSchemaPath(model),
          items: {},
        },
      },
    },
  };
  if (typeData === 'array') {
    const ref = data.schema.properties.data.$ref;
    delete data.schema.properties.data.$ref;
    data.schema.properties.data.items = { $ref: ref };
  }
  return applyDecorators(ApiOkResponse(data));
};

export const ApiPaginatedResponse = <TModel extends Type<any>>(
  property: string,
  model: TModel,
) => {
  return applyDecorators(
    ApiOkResponse({
      schema: {
        properties: {
          data: {
            allOf: [
              { $ref: getSchemaPath(PaginatedDto) },
              {
                properties: {
                  [`${property}`]: {
                    type: 'array',
                    items: { $ref: getSchemaPath(model) },
                  },
                },
              },
            ],
          },
        },
      },
    }),
  );
};
