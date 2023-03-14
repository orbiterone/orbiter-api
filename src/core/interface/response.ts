import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional } from 'class-validator';

export class BasePagination {
  @ApiProperty({ required: false, default: 'ASC', enum: ['ASC', 'DESC'] })
  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  order = 'DESC';

  @ApiProperty({ required: false, default: '1' })
  @IsOptional()
  @IsNumberString()
  page = '1';

  @ApiProperty({ required: false, default: '10' })
  @IsOptional()
  @IsNumberString()
  limit = '10';
}

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
