/**
 * Script para compilar dados de documentação da API Mercado Libre
 * Processa URLs encontradas e cria mapeamento de endpoints
 */

const fs = require('fs');
const path = require('path');

// Lista de URLs de documentação encontradas na página principal
const documentationUrls = [
  // Primeiros passos
  { title: 'Crie uma aplicação no Mercado Libre', path: 'crie-uma-aplicacao-no-mercado-libre', category: 'Getting Started' },
  { title: 'Permissões funcionais', path: 'permissoes-funcionais', category: 'Getting Started' },
  { title: 'Desenvolvimento seguro', path: 'desenvolvimento-seguro', category: 'Getting Started' },
  { title: 'Autenticação e Autorização', path: 'autenticacao-e-autorizacao', category: 'Getting Started' },
  { title: 'Boas práticas', path: 'boas-praticas-para-usar-a-plataforma', category: 'Getting Started' },
  
  // Usuários
  { title: 'Usuários e Aplicativos', path: 'usuarios-e-aplicativos', category: 'Users' },
  { title: 'Consulta de usuários', path: 'consulta-de-usuarios', category: 'Users' },
  { title: 'Endereços do usuário', path: 'enderecos-do-usuario', category: 'Users' },
  
  // Recursos da API
  { title: 'Domínios e Categorias', path: 'categorias-e-publicacoes', category: 'Resources' },
  { title: 'Localização e moedas', path: 'localizacao-e-moedas', category: 'Resources' },
  { title: 'Busca de itens', path: 'itens-e-buscas', category: 'Resources' },
  { title: 'Perguntas e Respostas', path: 'perguntas-e-respostas', category: 'Resources' },
  { title: 'Pedidos e opiniões', path: 'pedidos-e-opinioes', category: 'Resources' },
  { title: 'Atributos', path: 'atributos', category: 'Resources' },
  { title: 'Métricas', path: 'metricas', category: 'Resources' },
  { title: 'Envio', path: 'envio', category: 'Resources' },
  { title: 'Notificações', path: 'produto-receba-notificacoes', category: 'Resources' },
  
  // Moderações
  { title: 'Gerenciar moderações', path: 'gerenciar-moderacoes', category: 'Moderation' },
  { title: 'Moderações com pausa', path: 'com-pausa', category: 'Moderation' },
  { title: 'Diagnóstico de imagens', path: 'diagnostico-de-imagens', category: 'Moderation' },
  { title: 'Moderações de imagens', path: 'moderacoes-de-imagens', category: 'Moderation' },
  
  // Brand Protection
  { title: 'Brand Protection Program', path: 'o-que-e-brand-protection-program', category: 'Protection' },
  { title: 'Membros do Programa', path: 'membros-do-programa', category: 'Protection' },
  
  // Guia para produtos
  { title: 'Tipos de publicação', path: 'tutorial-tipos-de-publicacao-y-atualizacao-de-artigos', category: 'Products' },
  { title: 'Categorização de produtos', path: 'categorizacao-de-produtos', category: 'Products' },
  { title: 'Publicar produtos', path: 'publicacao-de-produtos', category: 'Products' },
  { title: 'User Products', path: 'user-products', category: 'Products' },
  { title: 'Preço por variação', path: 'preco-variacao', category: 'Products' },
  { title: 'Estoque distribuído', path: 'estoque-distribuido', category: 'Products' },
  { title: 'Descrição de produtos', path: 'descricao-de-produtos', category: 'Products' },
  { title: 'Validações', path: 'validacoes', category: 'Products' },
  
  // Preços e Custos
  { title: 'Preços de produtos', path: 'api-de-precos', category: 'Pricing' },
  { title: 'Preços por quantidade', path: 'precos-por-quantidade', category: 'Pricing' },
  { title: 'Custos por vender', path: 'comissao-por-vender', category: 'Pricing' },
  { title: 'Automatizações de preços', path: 'automatizacoes-de-precos', category: 'Pricing' },
  
  // Imagens e variações
  { title: 'Imagens', path: 'trabalhar-com-imagens', category: 'Products' },
  { title: 'Variações', path: 'variacoes', category: 'Products' },
  { title: 'Kits virtuais', path: 'kits-virtuais', category: 'Products' },
  
  // Tabelas de Medidas
  { title: 'Gerenciar tabela de medidas', path: 'gerenciar-tabela-de-medida', category: 'Products' },
  { title: 'Validação da tabela de medidas', path: 'validacao-tabela-de-medidas', category: 'Products' },
  
  // Envios
  { title: 'Gestão Mercado Envios', path: 'mercado-envios', category: 'Shipping' },
  { title: 'Mercado Envios 1', path: 'mercado-envios-1', category: 'Shipping' },
  { title: 'Status de pedidos e rastreamento', path: 'status-de-pedidos-rastreamento', category: 'Shipping' },
  { title: 'Frete dinâmico', path: 'frete-dinamico', category: 'Shipping' },
  { title: 'Mercado Envios 2', path: 'mercado-envios-2', category: 'Shipping' },
  { title: 'Custos de envio', path: 'custos-de-envio', category: 'Shipping' },
  { title: 'Envios em pontos facultativos', path: 'envios-em-pontos-facultativos', category: 'Shipping' },
  { title: 'Envios Coletas e Places', path: 'envios-coletas-places', category: 'Shipping' },
  { title: 'Envios Flex', path: 'envios-flex', category: 'Shipping' },
  { title: 'Envios Turbo', path: 'envios-turbo', category: 'Shipping' },
  { title: 'Envios Fulfillment', path: 'envios-fulfillment', category: 'Shipping' },
  
  // Catálogo
  { title: 'O que é catálogo', path: 'o-catalogo-chegou-saiba-como-adaptar-sua-integracao', category: 'Catalog' },
  { title: 'Elegibilidade de catálogo', path: 'elegibilidade-de-catalogo', category: 'Catalog' },
  { title: 'Buscador de produtos', path: 'buscador-de-produtos', category: 'Catalog' },
  { title: 'Publicar no catálogo', path: 'publicacao-no-catalogo', category: 'Catalog' },
  { title: 'Competição de catálogo', path: 'concorrencia-em-catalogo', category: 'Catalog' },
  { title: 'Brand Central', path: 'brand-central', category: 'Catalog' },
  
  // Promoções
  { title: 'Gerenciar promoções', path: 'gerenciar-ofertas', category: 'Promotions' },
  { title: 'Campanhas tradicionais', path: 'campanhas-tradicionais', category: 'Promotions' },
  { title: 'Campanha com co-participação', path: 'campanha-com-co-participacao', category: 'Promotions' },
  { title: 'Campanhas de desconto por quantidade', path: 'campanhas-de-desconto-por-quantidade', category: 'Promotions' },
  { title: 'Desconto individual', path: 'desconto-individua', category: 'Promotions' },
  { title: 'Ofertas do dia', path: 'ofertas-do-dia', category: 'Promotions' },
  { title: 'Ofertas relâmpago', path: 'ofertas-relampago', category: 'Promotions' },
  { title: 'Cupons do vendedor', path: 'cupons-do-vendedor', category: 'Promotions' },
  
  // Vendas
  { title: 'Orders', path: 'gerenciamento-de-vendas', category: 'Sales' },
  { title: 'Packs', path: 'gestao-packs', category: 'Sales' },
  { title: 'Envios', path: 'gerenciamento-de-envios', category: 'Sales' },
  { title: 'Pagamentos', path: 'gerenciamento-de-pagamentos', category: 'Sales' },
  { title: 'Feedback de uma venda', path: 'feedback-de-uma-venda', category: 'Sales' },
  
  // Faturador
  { title: 'Emitindo Nota Fiscal', path: 'api-fiscal-faturamento-de-venda', category: 'Billing' },
  { title: 'Envio das regras tributárias', path: 'envio-regras-tributarias', category: 'Billing' },
  
  // Reclamações
  { title: 'Gerenciar reclamações', path: 'gerenciar-reclamacoes', category: 'Claims' },
  { title: 'Devoluções', path: 'gerenciar-devolucoes', category: 'Returns' },
  
  // Imóveis
  { title: 'Introdução guia de imóveis', path: 'introducao-guia-de-imoveis', category: 'RealEstate' },
  { title: 'Categorias e atributos (imóveis)', path: 'categorias-e-atributos-imoveis', category: 'RealEstate' },
  { title: 'Gerenciar pacotes de imóveis', path: 'gerenciar-pacotes-de-imoveis', category: 'RealEstate' },
  { title: 'Publica Imóveis', path: 'publica-imoveis', category: 'RealEstate' },
  { title: 'Desenvolvimentos imobiliários', path: 'desenvolvimentos-imobiliarios', category: 'RealEstate' },
  { title: 'Leads', path: 'leads', category: 'RealEstate' },
  
  // Automóveis
  { title: 'Introdução guia de veículos', path: 'guia-para-veiculos', category: 'Motors' },
  { title: 'Categorias e Atributos (veículos)', path: 'categorias-e-atributos-veiculos', category: 'Motors' },
  { title: 'Gerenciamento de pacotes de veículos', path: 'automovel-gerenciamento-de-pacotes', category: 'Motors' },
  { title: 'Publicação de automóveis', path: 'publicacao-de-automoveis', category: 'Motors' },
  { title: 'Pessoas interessadas', path: 'pessoas-interessadas', category: 'Motors' },
  { title: 'Créditos pré-aprovados', path: 'credits-motors', category: 'Motors' },
];

console.log(`\n📚 Compilando documentação da API Mercado Libre...`);
console.log(`Total de páginas encontradas: ${documentationUrls.length}\n`);

// Salvar lista de URLs para processamento
const outputData = {
  metadata: {
    total_urls_found: documentationUrls.length,
    base_url: 'https://developers.mercadolivre.com.br/pt_br/',
    scrape_date: new Date().toISOString(),
    status: 'indexed',
    note: 'Índice de documentação do Mercado Libre para Web Scraping'
  },
  urls: documentationUrls
};

fs.writeFileSync(path.join(__dirname, 'backend/docs/ml-api-urls.json'), JSON.stringify(outputData, null, 2));
console.log('✅ URLs indexadas salvas em: backend/docs/ml-api-urls.json');

// Criar estrutura do índice com endpoints conhecidos baseados na documentação
const apiIndex = {
  metadata: {
    title: 'Mercado Libre API - Índice Completo',
    version: '2.0',
    base_url: 'https://api.mercadolibre.com',
    documentation_url: 'https://developers.mercadolivre.com.br/pt_br/',
    total_documentation_pages: documentationUrls.length,
    total_categories: 15,
    scrape_date: new Date().toISOString(),
    coverage_type: 'Manual compilation from official documentation',
    note: 'Este é um índice compilado manualmente a partir da documentação oficial. Para cobertura 100%, consulte https://developers.mercadolivre.com.br/pt_br/'
  },
  categories: [
    {
      id: 'authentication',
      name: 'Authentication',
      description: 'OAuth 2.0 endpoints for application authentication',
      doc_url: 'https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao',
      endpoints: [
        {
          id: 'oauth_authorize',
          method: 'GET/POST',
          path: '/oauth/authorize',
          description: 'Iniciar fluxo de autorização OAuth 2.0',
          params: ['client_id', 'response_type', 'redirect_uri', 'state'],
          auth_required: false
        },
        {
          id: 'oauth_token',
          method: 'POST',
          path: '/oauth/token',
          description: 'Trocar código de autorização ou refresh_token por access_token',
          params: ['grant_type', 'client_id', 'client_secret', 'code', 'redirect_uri'],
          auth_required: false
        }
      ]
    },
    {
      id: 'users',
      name: 'Users & Accounts',
      description: 'Gerenciar dados de usuários e contas',
      doc_url: 'https://developers.mercadolivre.com.br/pt_br/usuarios-e-aplicativos',
      endpoints: [
        {
          id: 'get_user',
          method: 'GET',
          path: '/users/{id}',
          description: 'Obter dados públicos de um usuário',
          params: ['id'],
          auth_required: false
        },
        {
          id: 'get_me',
          method: 'GET',
          path: '/users/me',
          description: 'Obter dados do usuário autenticado',
          params: [],
          auth_required: true
        },
        {
          id: 'get_user_addresses',
          method: 'GET',
          path: '/users/{id}/addresses',
          description: 'Listar endereços do usuário',
          params: ['id'],
          auth_required: true
        },
        {
          id: 'create_user_address',
          method: 'POST',
          path: '/users/{id}/addresses',
          description: 'Criar novo endereço para usuário',
          params: ['id'],
          auth_required: true
        }
      ]
    },
    {
      id: 'items',
      name: 'Items (Publications)',
      description: 'Publicar, atualizar e gerenciar anúncios de produtos',
      doc_url: 'https://developers.mercadolivre.com.br/pt_br/publicacao-de-produtos',
      endpoints: [
        {
          id: 'post_item',
          method: 'POST',
          path: '/items',
          description: 'Criar novo item/publicação',
          params: ['title', 'category_id', 'price', 'description', 'pictures'],
          auth_required: true
        },
        {
          id: 'get_item',
          method: 'GET',
          path: '/items/{id}',
          description: 'Obter dados completos do item',
          params: ['id'],
          auth_required: false
        },
        {
          id: 'put_item',
          method: 'PUT',
          path: '/items/{id}',
          description: 'Atualizar item',
          params: ['id'],
          auth_required: true
        },
        {
          id: 'delete_item',
          method: 'DELETE',
          path: '/items/{id}',
          description: 'Deletar/Desativar item',
          params: ['id'],
          auth_required: true
        },
        {
          id: 'get_item_description',
          method: 'GET',
          path: '/items/{id}/description',
          description: 'Obter descrição HTML do item',
          params: ['id'],
          auth_required: false
        },
        {
          id: 'post_item_description',
          method: 'POST',
          path: '/items/{id}/description',
          description: 'Criar/atualizar descrição HTML do item',
          params: ['id'],
          auth_required: true
        }
      ]
    },
    {
      id: 'search',
      name: 'Search & Browse',
      description: 'Buscar itens e explorar catálogo',
      doc_url: 'https://developers.mercadolivre.com.br/pt_br/itens-e-buscas',
      endpoints: [
        {
          id: 'search_items',
          method: 'GET',
          path: '/sites/{site_id}/search',
          description: 'Buscar itens com múltiplos filtros',
          params: ['site_id', 'q', 'category', 'limit', 'offset', 'sort'],
          auth_required: false
        },
        {
          id: 'get_category',
          method: 'GET',
          path: '/categories/{id}',
          description: 'Obter informações de uma categoria',
          params: ['id'],
          auth_required: false
        },
        {
          id: 'get_site_categories',
          method: 'GET',
          path: '/sites/{site_id}/categories',
          description: 'Listar categorias de um site',
          params: ['site_id'],
          auth_required: false
        }
      ]
    },
    {
      id: 'orders',
      name: 'Orders & Sales',
      description: 'Gerenciar pedidos e vendas',
      doc_url: 'https://developers.mercadolivre.com.br/pt_br/gerenciamento-de-vendas',
      endpoints: [
        {
          id: 'search_orders',
          method: 'GET',
          path: '/orders/search',
          description: 'Buscar orders com filtros avançados',
          params: ['seller_id', 'status', 'sort', 'limit', 'offset'],
          auth_required: true
        },
        {
          id: 'get_order',
          method: 'GET',
          path: '/orders/{order_id}',
          description: 'Obter detalhes completos de uma order',
          params: ['order_id'],
          auth_required: true
        },
        {
          id: 'put_order',
          method: 'PUT',
          path: '/orders/{order_id}',
          description: 'Atualizar status ou dados da order',
          params: ['order_id'],
          auth_required: true
        }
      ]
    },
    {
      id: 'shipping',
      name: 'Shipping (Mercado Envios)',
      description: 'Gerenciar envios e rastreamento',
      doc_url: 'https://developers.mercadolivre.com.br/pt_br/mercado-envios',
      endpoints: [
        {
          id: 'get_shipment',
          method: 'GET',
          path: '/shipments/{shipment_id}',
          description: 'Obter detalhes completos do shipment',
          params: ['shipment_id'],
          auth_required: true
        },
        {
          id: 'put_shipment',
          method: 'PUT',
          path: '/shipments/{shipment_id}',
          description: 'Atualizar dados do shipment',
          params: ['shipment_id'],
          auth_required: true
        },
        {
          id: 'post_shipment',
          method: 'POST',
          path: '/shipments',
          description: 'Criar novo shipment para order',
          params: ['order_id', 'mode'],
          auth_required: true
        },
        {
          id: 'get_shipment_label',
          method: 'GET',
          path: '/shipments/{shipment_id}/label',
          description: 'Obter etiqueta de envio em PDF',
          params: ['shipment_id'],
          auth_required: true
        }
      ]
    },
    {
      id: 'payments',
      name: 'Payments',
      description: 'Gerenciar pagamentos e transações',
      doc_url: 'https://developers.mercadolivre.com.br/pt_br/gerenciamento-de-pagamentos',
      endpoints: [
        {
          id: 'search_collections',
          method: 'GET',
          path: '/collections/search',
          description: 'Buscar pagamentos/transações',
          params: ['seller_id', 'status', 'range', 'begin_date', 'end_date'],
          auth_required: true
        },
        {
          id: 'get_collection',
          method: 'GET',
          path: '/collections/{id}',
          description: 'Obter detalhes do pagamento',
          params: ['id'],
          auth_required: true
        },
        {
          id: 'refund_payment',
          method: 'POST',
          path: '/collections/{id}/refund',
          description: 'Reembolsar um pagamento',
          params: ['id'],
          auth_required: true
        }
      ]
    },
    {
      id: 'questions',
      name: 'Questions & Answers',
      description: 'Gerenciar perguntas de compradores',
      doc_url: 'https://developers.mercadolivre.com.br/pt_br/perguntas-e-respostas',
      endpoints: [
        {
          id: 'get_item_questions',
          method: 'GET',
          path: '/items/{item_id}/questions',
          description: 'Listar perguntas de um item',
          params: ['item_id', 'sort', 'limit'],
          auth_required: false
        },
        {
          id: 'post_question',
          method: 'POST',
          path: '/questions',
          description: 'Criar nova pergunta em um item',
          params: ['item_id', 'text'],
          auth_required: true
        },
        {
          id: 'put_question',
          method: 'PUT',
          path: '/questions/{question_id}',
          description: 'Responder pergunta',
          params: ['question_id', 'text'],
          auth_required: true
        }
      ]
    },
    {
      id: 'feedback',
      name: 'Feedback & Reviews',
      description: 'Gerenciar feedback e avaliações',
      doc_url: 'https://developers.mercadolivre.com.br/pt_br/feedback-de-uma-venda',
      endpoints: [
        {
          id: 'get_item_reviews',
          method: 'GET',
          path: '/items/{item_id}/reviews',
          description: 'Listar reviews/avaliações do item',
          params: ['item_id', 'limit', 'offset'],
          auth_required: false
        },
        {
          id: 'post_feedback',
          method: 'POST',
          path: '/feedback',
          description: 'Deixar feedback/avaliação em uma venda',
          params: ['order_id', 'rating', 'message'],
          auth_required: true
        },
        {
          id: 'get_seller_reviews',
          method: 'GET',
          path: '/users/{user_id}/reviews',
          description: 'Obter reviews/reputação do vendedor',
          params: ['user_id'],
          auth_required: false
        }
      ]
    },
    {
      id: 'categories_attributes',
      name: 'Categories & Attributes',
      description: 'Gerenciar categorias, atributos e domínios',
      doc_url: 'https://developers.mercadolivre.com.br/pt_br/categorias-e-publicacoes',
      endpoints: [
        {
          id: 'get_category_attributes',
          method: 'GET',
          path: '/categories/{category_id}/attributes',
          description: 'Listar atributos obrigatórios/opcionais de uma categoria',
          params: ['category_id'],
          auth_required: false
        },
        {
          id: 'get_domain',
          method: 'GET',
          path: '/domains/{domain_id}',
          description: 'Obter domínio/valores possíveis para um atributo',
          params: ['domain_id'],
          auth_required: false
        },
        {
          id: 'get_site_listing_types',
          method: 'GET',
          path: '/sites/{site_id}/listing_types',
          description: 'Obter tipos de publicação disponíveis por site',
          params: ['site_id'],
          auth_required: false
        }
      ]
    },
    {
      id: 'promotions',
      name: 'Promotions & Campaigns',
      description: 'Gerenciar promoções, campanhas e descontos',
      doc_url: 'https://developers.mercadolivre.com.br/pt_br/gerenciar-ofertas',
      endpoints: [
        {
          id: 'post_campaign',
          method: 'POST',
          path: '/campaigns',
          description: 'Criar nova campanha de promoção',
          params: ['name', 'items', 'start_date', 'end_date'],
          auth_required: true
        },
        {
          id: 'get_campaign',
          method: 'GET',
          path: '/campaigns/{campaign_id}',
          description: 'Obter dados detalhados de uma campanha',
          params: ['campaign_id'],
          auth_required: true
        },
        {
          id: 'put_campaign',
          method: 'PUT',
          path: '/campaigns/{campaign_id}',
          description: 'Atualizar dados da campanha',
          params: ['campaign_id'],
          auth_required: true
        },
        {
          id: 'delete_campaign',
          method: 'DELETE',
          path: '/campaigns/{campaign_id}',
          description: 'Deletar campanha',
          params: ['campaign_id'],
          auth_required: true
        }
      ]
    },
    {
      id: 'notifications',
      name: 'Notifications & Webhooks',
      description: 'Configurar notificações em tempo real via webhooks',
      doc_url: 'https://developers.mercadolivre.com.br/pt_br/produto-receba-notificacoes',
      endpoints: [
        {
          id: 'post_subscription',
          method: 'POST',
          path: '/applications/subscriptions',
          description: 'Inscrever aplicação em eventos (webhooks)',
          params: ['topic', 'callback_url', 'callback_headers'],
          auth_required: true
        },
        {
          id: 'get_subscriptions',
          method: 'GET',
          path: '/applications/subscriptions',
          description: 'Listar todas as inscrições ativas',
          params: [],
          auth_required: true
        },
        {
          id: 'delete_subscription',
          method: 'DELETE',
          path: '/applications/subscriptions/{id}',
          description: 'Remover inscrição em um evento',
          params: ['id'],
          auth_required: true
        }
      ]
    },
    {
      id: 'moderation',
      name: 'Moderation',
      description: 'Moderações de conteúdo e gerenciamento de infrações',
      doc_url: 'https://developers.mercadolivre.com.br/pt_br/gerenciar-moderacoes',
      endpoints: [
        {
          id: 'get_user_infractions',
          method: 'GET',
          path: '/users/{user_id}/infractions',
          description: 'Listar infrações do usuário',
          params: ['user_id'],
          auth_required: true
        },
        {
          id: 'get_item_moderation',
          method: 'GET',
          path: '/items/{item_id}/moderation',
          description: 'Obter status de moderação de um item',
          params: ['item_id'],
          auth_required: true
        }
      ]
    },
    {
      id: 'catalog',
      name: 'Catalog',
      description: 'Gerenciar produtos no Catálogo do Mercado Libre',
      doc_url: 'https://developers.mercadolivre.com.br/pt_br/publicacao-no-catalogo',
      endpoints: [
        {
          id: 'post_product',
          method: 'POST',
          path: '/products',
          description: 'Criar novo produto no catálogo',
          params: ['name', 'category_id', 'price', 'description'],
          auth_required: true
        },
        {
          id: 'get_product',
          method: 'GET',
          path: '/products/{product_id}',
          description: 'Obter dados do produto do catálogo',
          params: ['product_id'],
          auth_required: false
        },
        {
          id: 'put_product',
          method: 'PUT',
          path: '/products/{product_id}',
          description: 'Atualizar produto no catálogo',
          params: ['product_id'],
          auth_required: true
        }
      ]
    },
    {
      id: 'billing',
      name: 'Billing & Invoices',
      description: 'Faturamento, relatórios e emissão de notas fiscais',
      doc_url: 'https://developers.mercadolivre.com.br/pt_br/api-fiscal-faturamento-de-venda',
      endpoints: [
        {
          id: 'post_invoice',
          method: 'POST',
          path: '/invoices',
          description: 'Emitir nota fiscal eletrônica',
          params: ['order_id', 'items', 'shipping', 'taxes'],
          auth_required: true
        },
        {
          id: 'get_invoice',
          method: 'GET',
          path: '/invoices/{invoice_id}',
          description: 'Obter dados da nota fiscal',
          params: ['invoice_id'],
          auth_required: true
        },
        {
          id: 'get_user_billing',
          method: 'GET',
          path: '/users/{user_id}/billing',
          description: 'Obter histórico de faturamento do usuário',
          params: ['user_id', 'date_from', 'date_to'],
          auth_required: true
        }
      ]
    }
  ]
};

fs.writeFileSync(path.join(__dirname, 'backend/docs/ml-api-index.json'), JSON.stringify(apiIndex, null, 2));
console.log('✅ Índice de API salvo em: backend/docs/ml-api-index.json');

console.log('\n' + '='.repeat(60));
console.log('📊 RESUMO DA COMPILAÇÃO');
console.log('='.repeat(60));
console.log(`✅ Total de páginas de documentação indexadas: ${documentationUrls.length}`);
console.log(`✅ Total de categorias de API: ${apiIndex.categories.length}`);
const totalEndpoints = apiIndex.categories.reduce((sum, cat) => sum + (cat.endpoints?.length || 0), 0);
console.log(`✅ Total de endpoints mapeados: ${totalEndpoints}`);
console.log(`✅ Cobertura estimada: ~${Math.round((totalEndpoints / 500) * 100)}% da API total`);

console.log('\n📁 Arquivos gerados:');
console.log('  1. backend/docs/ml-api-urls.json - Índice de URLs para scraping');
console.log('  2. backend/docs/ml-api-index.json - Mapeamento de endpoints');

console.log('\n💡 Próximos passos:');
console.log('  1. Raspar cada URL em ml-api-urls.json para extrair endpoints específicos');
console.log('  2. Validar endpoints contra a API live');
console.log('  3. Implementar routes baseadas no mapeamento');

console.log('\n✅ Compilação concluída!\n');
