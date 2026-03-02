import * as cheerio from 'cheerio';

async function parseFIP({ placa }: { placa: string }) {
  const url = `https://fipepelaplaca.com.br/placa/${placa.replace(
    /[-_]/g,
    ''
  )}`;
  const request = await fetch(url, {
    method: 'GET',
  });

  const response = await request.text();

  const $ = cheerio.load(response);

  const vehicleInfo: Record<string, string> = {};

  $('.fipeTablePriceDetail tr').each((_, row) => {
    const label = $(row).find('td:first-child b').text().replace(':', '');
    const value = $(row).find('td:last-child').text().trim();
    if (label && value) {
      vehicleInfo[label] = value;
    }
  });

  let codigoFipe = '';

  $('.fipe-desktop tr').each((index, row) => {
    if (index > 0) {
      codigoFipe = $(row).find('td:first-child').text().trim();
      return false;
    }
  });

  if (!codigoFipe) {
    $('.fipe-mobile tr').each((_, row) => {
      const text = $(row).find('td').text().trim();
      if (text.includes('FIPE:')) {
        codigoFipe = text.replace('FIPE:', '').trim();
        return false;
      }
    });
  }

  const result = {
    marca: vehicleInfo['Marca'] || '',
    modelo: vehicleInfo['Modelo'] || '',
    cor: vehicleInfo['Cor'] || '',
    ano: vehicleInfo['Ano'] || '',
    anoModelo: vehicleInfo['Ano Modelo'] || '',
    combustivel: vehicleInfo['Combustível'] || '',
    uf: vehicleInfo['UF'] || '',
    municipio: vehicleInfo['Município'] || '',
    tipoVeiculo: vehicleInfo['Tipo Veiculo'] || '',
    segmento: vehicleInfo['Segmento'] || '',
    codigoFipe: codigoFipe,
  };

  console.log(result);
  return result;
}
