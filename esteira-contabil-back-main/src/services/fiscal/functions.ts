export const loadPkcs12 = (base64File, password) => {
  const forge = require('node-forge');
  console.log('Carregando PKCS#12...');
  // const base64Data = base64File.replace(
  //   /^data:application\/x-pkcs12;base64,/,
  //   ''
  // ); // Ajuste de prefixo, pois antigo funcionava apenas com específico
  const base64Data = base64File.replace(/^data:.*;base64,/, '');

  const pfxBinary = forge.util.decode64(base64Data);
  const pkcs12Asn1 = forge.asn1.fromDer(pfxBinary);
  const pkcs12 = forge.pkcs12.pkcs12FromAsn1(pkcs12Asn1, false, password);

  const map = {};
  for (const safeContents of pkcs12.safeContents) {
    for (const safeBag of safeContents.safeBags) {
      let localKeyId = null;
      if (safeBag.attributes.localKeyId) {
        localKeyId = forge.util.bytesToHex(safeBag.attributes.localKeyId[0]);
        if (!(localKeyId in map)) {
          map[localKeyId] = {
            privateKey: null,
            certChain: [],
          };
        }
      } else {
        continue;
      }

      if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
        map[localKeyId].privateKey = safeBag.key;
      } else if (safeBag.type === forge.pki.oids.certBag) {
        map[localKeyId].certChain.push({
          cert: safeBag.cert,
          notAfter: safeBag.cert.validity.notAfter,
        });
      }
    }
  }

  const result = {
    privateKey: null,
    publicCert: [],
  };

  for (const localKeyId in map) {
    const entry = map[localKeyId];

    if (entry.privateKey) {
      result.privateKey = forge.pki.privateKeyToPem(entry.privateKey);
    }

    if (entry.certChain.length > 0) {
      for (const { cert, notAfter } of entry.certChain) {
        try {
          const certP12Pem = forge.pki.certificateToPem(cert);

          // Extraindo os dados do certificado
          const subject = cert.subject.attributes.reduce((acc, attr) => {
            acc[attr.shortName] = attr.value;
            return acc;
          }, {});

          let nome = '';
          let cnpj = '';

          if (subject.CN) {
            const parts = subject.CN.split(':');
            if (parts.length === 2) {
              nome = parts[0].trim();
              cnpj = parts[1].trim();
            }
          }

          console.log('Nome: ', nome);
          console.log('CNPJ: ', cnpj);
          console.log('Organização: ', subject.O);
          console.log('Unidade Organizacional: ', subject.OU);
          console.log('País: ', subject.C);
          console.log('Válido até: ', notAfter.toLocaleString());
          console.log('-----------------------------------');

          result.publicCert.push({ certP12Pem, nome, cnpj, subject, notAfter });
        } catch (error) {
          console.log(error.message);
        }
      }
    }
  }

  return result;
};
