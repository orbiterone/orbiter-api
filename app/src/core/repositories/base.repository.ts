import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';

import { PaginatedDto } from '../interface/response';

interface IKeyable {
  [key: string]: any;
}

@Injectable()
export class BaseRepository {
  async pagination(
    model: Model<any>,
    project: object,
    find?: IKeyable,
    options?: IKeyable,
  ): Promise<PaginatedDto<any>> {
    const perPage = +options.limit || 10;
    const page = +options.page || 1;
    let sort = options.sort || 'createdAt';
    let order = 1;
    if (options.order?.toLowerCase() !== 'asc') order = -1;
    sort = { [`${sort}`]: order };
    const skip = (page - 1) * perPage;

    return new Promise(async (resolve, reject) => {
      model
        .aggregate([
          { $match: find || {} },
          { $sort: sort },
          {
            $facet: {
              total: [
                {
                  $count: 'count',
                },
              ],
              items: [
                { $skip: skip },
                { $limit: perPage },
                {
                  $project: {
                    ...project,
                  },
                },
              ],
            },
          },
          { $unwind: '$total' },
          {
            $project: {
              page: page.toString(),
              pages: {
                $ceil: { $divide: ['$total.count', perPage] },
              },
              countItems: '$total.count',
              entities: '$items',
            },
          },
        ])
        .exec(async (err, pagination) => {
          if (err) {
            return reject(err);
          }
          return pagination.length
            ? resolve(pagination.pop())
            : resolve({ page, pages: 0, countItems: 0, entities: [] });
        });
    });
  }
}
