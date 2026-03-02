import * as crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const secretKey = crypto
  .createHash('sha256')
  .update(process.env.NODE_SECRET)
  .digest();

if (!secretKey || secretKey.length !== 32) {
  throw new Error('A chave NODE_SECRET precisa ter exatamente 32 caracteres.');
}

export const encryptPassword = (password) => {
  const iv = crypto.randomBytes(16); // Gera um IV aleatório para cada operação
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  let encrypted = cipher.update(password, 'utf-8', 'base64');
  encrypted += cipher.final('base64');
  return `${iv.toString('base64')}:${encrypted}`; // Retorna IV + senha criptografada
};

export const decryptPassword = (encryptedPassword) => {
  if (typeof encryptedPassword !== 'string') {
    throw new Error('A senha criptografada deve ser uma string.');
  }

  const [ivString, encrypted] = encryptedPassword.split(':');

  if (!ivString || !encrypted) {
    throw new Error('A senha criptografada não está no formato correto.');
  }

  const ivBuffer = Buffer.from(ivString, 'base64'); // Converte o IV de volta para um Buffer
  const decipher = crypto.createDecipheriv(algorithm, secretKey, ivBuffer);
  let decrypted = decipher.update(encrypted, 'base64', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
};
