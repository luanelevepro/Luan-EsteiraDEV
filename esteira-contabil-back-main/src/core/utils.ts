import type { Request } from 'express';

export function validatePagination(req: Request): ESTEIRA.PAYLOAD.Paginacao {
  const {
    page = 1,
    pageSize = 10,
    orderBy = 'asc',
    orderColumn = '',
    search = '',
  } = req.query;

  if (orderBy !== 'asc' && orderBy !== 'desc') {
    throw new Error('Order must be one of: "asc" or "desc".');
  }

  if (!Number(page) || Number(page) < 0) {
    throw new Error('Page must be a positive number.');
  }

  if (!Number(pageSize) || Number(pageSize) < 0) {
    throw new Error('Page size must be a positive number.');
  }
  return {
    page: Number(page),
    orderBy: orderBy as 'asc' | 'desc',
    orderColumn: orderColumn as string,
    search: search as string,
    pageSize: Number(pageSize),
  };
}

// Edge-case:

/* Em algumas engines (ao menos no linux) o Date Object força uma conversão de timezone UTC -> GMT-3. Deduzindo 3 horas do horário original.

Em datas de vigência, por exemplo, a data é convertida no front para o dia anterior (00h 00m -3h = 21h 00m do dia anterior).

Adicionamos 3 horas ao horário. Este utilitário não deve ser utilizado para datas dinâmicas, apenas para datas estáticas inseridas por um usuário via Front-End
*/

export function adjustToGMT3(date: Date) {
  const utcDate = new Date(date);
  utcDate.setUTCHours(utcDate.getUTCHours() + 3);
  return utcDate;
}
