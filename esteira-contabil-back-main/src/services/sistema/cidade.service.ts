import { prisma } from '@/services/prisma';
import { contains } from 'cheerio';

export const getCities = async ({
  pageSize,
  page,
  orderBy,
  orderColumn,
  search,
}: {
  pageSize: number;
  page: number;
  orderBy: string;
  orderColumn: string;
  search: string;
}) => {
  let whereCondition = {};

  if (search) {
    const normalizedSearch = normalizeSearch(search);

    if (/^\d+$/.test(normalizedSearch)) {
      const numericSearch = parseInt(normalizedSearch, 10);
      const digitCount = normalizedSearch.length;
      const minValue = numericSearch * Math.pow(10, 7 - digitCount);
      const maxValue = (numericSearch + 1) * Math.pow(10, 7 - digitCount) - 1;

      whereCondition = {
        id: {
          gte: minValue,
          lte: maxValue,
        },
      };
    } else {
      whereCondition = {
        ds_city_clean: {
          contains: normalizedSearch,
        },
      };
    }
  }

  const orderByClause =
    orderColumn && orderColumn.trim() !== '' && orderColumn !== 'undefined'
      ? orderColumn
          .split('.')
          .reduceRight(
            (accumulator: any, key: string) => ({ [key]: accumulator }),
            orderBy
          )
      : { id: orderBy };

  const [cities, count] = await prisma.$transaction([
    prisma.sis_igbe_city.findMany({
      where: whereCondition,
      orderBy: orderByClause,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        js_uf: true,
      },
    }),
    prisma.sis_igbe_city.count({ where: whereCondition }),
  ]);

  return {
    total: count,
    totalPages: Math.ceil(count / pageSize),
    page,
    cities,
  };
};

export const normalizeSearch = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .toLowerCase();
};

export const getCityById = async (id: string) => {
  const city = await prisma.sis_igbe_city.findUnique({
    where: { id: Number(id) },
    include: {
      js_uf: true,
    },
  });

  return city;
};
