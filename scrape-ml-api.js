/**
 * Script para raspar documentação da API Mercado Livre
 * Usa base URL e faz requests para cada página de documentação
 */

const https = require('https');
const http = require('http');

// Lista de URLs de documentação encontradas na página principal
const documentationUrls = [
  // Primeiros passos
  { title: 'Crie uma aplicação no Mercado Livre', path: 'crie-uma-aplicacao-no-mercado-livre' },
  { title: 'Permissões funcionais', path: 'permissoes-funcionais' },
  { title: 'Desenvolvimento seguro', path: 'desenvolvimento-seguro' },
  { title: 'Autenticação e Autorização', path: 'autenticacao-e-autorizacao' },
  { title: 'Boas práticas', path: 'boas-praticas-para-usar-a-plataforma' },
  
  // Usuários
  { title: 'Usuários e Aplicativos', path: 'usuarios-e-aplicativos' },
  { title: 'Consulta de usuários', path: 'consulta-de-usuarios' },
  { title: 'Endereços do usuário', path: 'enderecos-do-usuario' },
  
  // Recursos da API
  { title: 'Domínios e Categorias', path: 'categorias-e-publicacoes' },
  { title: 'Localização e moedas', path: 'localizacao-e-moedas' },
  { title: 'Busca de itens', path: 'itens-e-buscas' },
  { title: 'Perguntas e Respostas', path: 'perguntas-e-respostas' },
  { title: 'Pedidos e opiniões', path: 'pedidos-e-opinioes' },
  { title: 'Atributos', path: 'atributos' },
  { title: 'Métricas', path: 'metricas' },
  { title: 'Envio', path: 'envio' },
  { title: 'Notificações', path: 'produto-receba-notificacoes' },
  
  // Moderações
  { title: 'Gerenciar moderações', path: 'gerenciar-moderacoes' },
  { title: 'Moderações com pausa', path: 'com-pausa' },
  { title: 'Diagnóstico de imagens', path: 'diagnostico-de-imagens' },
  { title: 'Moderações de imagens', path: 'moderacoes-de-imagens' },
  
  // Brand Protection
  { title: 'Brand Protection Program', path: 'o-que-e-brand-protection-program' },
  { title: 'Membros do Programa', path: 'membros-do-programa' },
  
  // Guia para produtos - Publicações
  { title: 'Tipos de publicação', path: 'tutorial-tipos-de-publicacao-y-atualizacao-de-artigos' },
  { title: 'Categorização de produtos', path: 'categorizacao-de-produtos' },
  { title: 'Publicar produtos', path: 'publicacao-de-produtos' },
  { title: 'User Products', path: 'user-products' },
  { title: 'Preço por variação', path: 'preco-variacao' },
  { title: 'Estoque distribuído', path: 'estoque-distribuido' },
  { title: 'Descrição de produtos', path: 'descricao-de-produtos' },
  { title: 'Validações', path: 'validacoes' },
  
  // Preços e Custos
  { title: 'Preços de produtos', path: 'api-de-precos' },
  { title: 'Preços por quantidade', path: 'precos-por-quantidade' },
  { title: 'Custos por vender', path: 'comissao-por-vender' },
  { title: 'Automatizações de preços', path: 'automatizacoes-de-precos' },
  
  // Imagens e variações
  { title: 'Imagens', path: 'trabalhar-com-imagens' },
  { title: 'Variações', path: 'variacoes' },
  { title: 'Kits virtuais', path: 'kits-virtuais' },
  
  // Tabelas de Medidas
  { title: 'Gerenciar tabela de medidas', path: 'gerenciar-tabela-de-medida' },
  { title: 'Validação da tabela de medidas', path: 'validacao-tabela-de-medidas' },
  
  // Envios
  { title: 'Gestão Mercado Envios', path: 'mercado-envios' },
  { title: 'Mercado Envios 1', path: 'mercado-envios-1' },
  { title: 'Status de pedidos e rastreamento', path: 'status-de-pedidos-rastreamento' },
  { title: 'Frete dinâmico', path: 'frete-dinamico' },
  { title: 'Mercado Envios 2', path: 'mercado-envios-2' },
  { title: 'Custos de envio', path: 'custos-de-envio' },
  { title: 'Envios em pontos facultativos', path: 'envios-em-pontos-facultativos' },
  { title: 'Envios Coletas e Places', path: 'envios-coletas-places' },
  { title: 'Envios Flex', path: 'envios-flex' },
  { title: 'Envios Turbo', path: 'envios-turbo' },
  { title: 'Envios Fulfillment', path: 'envios-fulfillment' },
  
  // Catálogo
  { title: 'O que é catálogo', path: 'o-catalogo-chegou-saiba-como-adaptar-sua-integracao' },
  { title: 'Elegibilidade de catálogo', path: 'elegibilidade-de-catalogo' },
  { title: 'Buscador de produtos', path: 'buscador-de-produtos' },
  { title: 'Publicar no catálogo', path: 'publicacao-no-catalogo' },
  { title: 'Competição de catálogo', path: 'concorrencia-em-catalogo' },
  { title: 'Brand Central', path: 'brand-central' },
  
  // Promoções
  { title: 'Gerenciar promoções', path: 'gerenciar-ofertas' },
  { title: 'Campanhas tradicionais', path: 'campanhas-tradicionais' },
  { title: 'Campanha com co-participação', path: 'campanha-com-co-participacao' },
  { title: 'Campanhas de desconto por quantidade', path: 'campanhas-de-desconto-por-quantidade' },
  { title: 'Desconto individual', path: 'desconto-individua' },
  { title: 'Ofertas do dia', path: 'ofertas-do-dia' },
  { title: 'Ofertas relâmpago', path: 'ofertas-relampago' },
  { title: 'Cupons do vendedor', path: 'cupons-do-vendedor' },
  
  // Vendas
  { title: 'Orders', path: 'gerenciamento-de-vendas' },
  { title: 'Packs', path: 'gestao-packs' },
  { title: 'Envios', path: 'gerenciamento-de-envios' },
  { title: 'Pagamentos', path: 'gerenciamento-de-pagamentos' },
  { title: 'Feedback de uma venda', path: 'feedback-de-uma-venda' },
  
  // Faturador
  { title: 'Emitindo Nota Fiscal', path: 'api-fiscal-faturamento-de-venda' },
  { title: 'Envio das regras tributárias', path: 'envio-regras-tributarias' },
  
  // Reclamações
  { title: 'Gerenciar reclamações', path: 'gerenciar-reclamacoes' },
  { title: 'Devoluções', path: 'gerenciar-devolucoes' },
  
  // Imóveis
  { title: 'Introdução guia de imóveis', path: 'introducao-guia-de-imoveis' },
  { title: 'Categorias e atributos (imóveis)', path: 'categorias-e-atributos-imoveis' },
  { title: 'Gerenciar pacotes de imóveis', path: 'gerenciar-pacotes-de-imoveis' },
  { title: 'Publica Imóveis', path: 'publica-imoveis' },
  { title: 'Desenvolvimentos imobiliários', path: 'desenvolvimentos-imobiliarios' },
  { title: 'Leads', path: 'leads' },
  
  // Automóveis
  { title: 'Introdução guia de veículos', path: 'guia-para-veiculos' },
  { title: 'Categorias e Atributos (veículos)', path: 'categorias-e-atributos-veiculos' },
  { title: 'Gerenciamento de pacotes de veículos', path: 'automovel-gerenciamento-de-pacotes' },
  { title: 'Publicação de automóveis', path: 'publicacao-de-automoveis' },
  { title: 'Pessoas interessadas', path: 'pessoas-interessadas' },
  { title: 'Créditos pré-aprovados', path: 'credits-motors' },
];

// Total de URLs
console.log(`Total de URLs documentação encontradas: ${documentationUrls.length}`);

// Salvar lista de URLs para processamento
const fs = require('fs');
const outputData = {
  metadata: {
    total_urls_found: documentationUrls.length,
    base_url: 'https://developers.mercadolivre.com.br/pt_br/',
    scrape_date: new Date().toISOString(),
    status: 'pending',
    note: 'Lista de URLs de documentação do Mercado Livre para scraping'
  },
  urls: documentationUrls
};

fs.writeFileSync('E:\Paulo ML\projeto-sass\backend\docs\ml-api-urls.json', JSON.stringify(outputData, null, 2));
console.log('URLs salvas em: backend/docs/ml-api-urls.json');

// Criando estrutura do índice
const indexData = {
  categories: [
    {
      name: "Primeiros Passos",
      count: 5,
      endpoints: [
        { method: "POST", path: "/oauth/authorize", description: "Autorizar aplicação OAuth 2.0" },
        { method: "POST", path: "/oauth/token", description: "Obter token de acesso" },
        { method: "GET", path: "/users/{user_id}", description: "Consultar dados do usuário" }
      ]
    },
    {
      name: "Publicações",
      count: 25,
      endpoints: [
        { method: "POST", path: "/items", description: "Criar novo item" },
        { method: "GET", path: "/items/{item_id}", description: "Obter dados do item" },
        { method: "PUT", path: "/items/{item_id}", description: "Atualizar item" },
        { method: "DELETE", path: "/items/{item_id}", description: "Deletar item" }
      ]
    },
    {
      name: "Vendas",
      count: 20,
      endpoints: [
        { method: "GET", path: "/orders/search", description: "Buscar orders" },
     
