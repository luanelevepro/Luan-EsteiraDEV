import { getEmpresaSessao, getUsuarioSessao } from './session';

function responderNaoAutorizado(res) {
  res.status(401).json({ mensagem: 'Usuário ou empresa não encontrados.' });
}

function extrairDadosAutenticacao(req) {
  const cabecalhoAutorizacao = req.headers['authorization'];
  if (!cabecalhoAutorizacao) return null;
  const [_, usuarioId, empresaId] = cabecalhoAutorizacao.split(' ');
  return { usuarioId, empresaId };
}

export const acessoToken = async (req, res, next) => {
  try {
    const publicPaths = [
      '/api/transporte/webhooks/webhook',
      '/transporte/webhooks/webhook',
      '/webhooks/webhook',
    ];

    if (publicPaths.some((path) => req.path === path)) {
      console.log(`🔓 Public endpoint accessed: ${req.path}`);
      return next();
    }

    const dataFormatada = new Date().toISOString().slice(0, 19);
    const dadosAutenticacao = extrairDadosAutenticacao(req);
    console.log(dadosAutenticacao);

    if (!dadosAutenticacao || !dadosAutenticacao.usuarioId) {
      return responderNaoAutorizado(res);
    }

    const dadoUsuario = await getUsuarioSessao(dadosAutenticacao.usuarioId);
    req['usuarioId'] = dadoUsuario.id;
    req['usuarioNome'] = dadoUsuario.ds_name;

    if (
      dadosAutenticacao &&
      dadosAutenticacao.empresaId &&
      dadosAutenticacao.empresaId !== 'undefined'
    ) {
      req['empresaId'] = await getEmpresaSessao(dadosAutenticacao.empresaId);
    }

    console.log(
      `${dataFormatada} | ${dadoUsuario.ds_name} | ${req.originalUrl}`
    );
    next();
  } catch (error) {
    console.log(error);
    responderNaoAutorizado(res);
  }
};
