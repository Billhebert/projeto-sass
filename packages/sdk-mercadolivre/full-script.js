/**
 * Script de Coleta COMPLETA do Mercado Livre
 * Busca TUDO de TUDO - Sem limites
 */

const fs = require('fs');
const path = require('path');
const MercadoLivre = require('./index.js');

// Configuração
const config = {
  accessToken: 'APP_USR-1706187223829083-020921-982e473aaaed02d9cabe549b8fa60a02-1033763524',
  clientId: '1706187223829083',
  userId: 1033763524,
  siteId: 'MLB',
  timeout: 60000,
  requestDelay: 50,
};

const ml = new MercadoLivre(config);

// Função para salvar dados
function saveToJson(filename, data) {
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  const size = (fs.statSync(filepath).size / 1024 / 1024).toFixed(2);
  console.log(`💾 Salvo: ${filename} (${size} MB)`);
  return filepath;
}

// ========== SCRIPT PRINCIPAL ==========
async function runFullCollection() {
  console.log('='.repeat(70));
  console.log('🔎 COLETA COMPLETA DO MERCADO LIVRE - TUDO DE TUDO');
  console.log('='.repeat(70));
  console.log(`⏰ Início: ${new Date().toISOString()}`);
  console.log(`👤 Usuário: ${config.userId}`);
  console.log(`🌐 Site: ${config.siteId}`);
  console.log('='.repeat(70));

  try {
    // Coletar TODOS os dados usando o método collectAllData
    console.log('\n🚀 INICIANDO COLETA COMPLETA...\n');
    
    const allData = await ml.collectAllData({
      userId: config.userId,
      siteId: config.siteId,
    });

    // ========== SALVAR ARQUIVOS ==========
    console.log('\n' + '='.repeat(70));
    console.log('💾 SALVANDO DADOS');
    console.log('='.repeat(70));

    // 1. Arquivo COMPLETO (RELATIONAL_DATA.json)
    saveToJson('RELATIONAL_DATA.json', allData);

    // 2. Arquivo simples com todos os itens
    if (allData.items && allData.items.items) {
      saveToJson('all_items.json', {
        total: allData.items.items.length,
        items: allData.items.items,
      });
    }

    // 3. Resumo
    const summary = {
      timestamp: new Date().toISOString(),
      userId: config.userId,
      siteId: config.siteId,
      statistics: {
        totalItems: allData.items?.total || 0,
        totalAddresses: allData.addresses?.length || 0,
        totalOrders: allData.orders?.data?.length || 0,
        totalQuestions: allData.questions?.data?.length || 0,
        totalCategories: allData.categories?.length || 0,
        totalSites: allData.sites?.length || 0,
        totalCountries: allData.locations?.length || 0,
        totalCurrencies: allData.currencies?.length || 0,
        totalTrends: Object.keys(allData.trends || {}).length,
      },
    };
    saveToJson('00_summary.json', summary);

    // ========== RELATÓRIO FINAL ==========
    console.log('\n' + '='.repeat(70));
    console.log('📊 RELATÓRIO FINAL');
    console.log('='.repeat(70));
    
    console.log('\n📦 ITENS:');
    console.log(`   Total de itens publicados: ${allData.items?.total || 0}`);
    console.log(`   IDs coletados: ${allData.items?.ids?.length || 0}`);
    console.log(`   Detalhes obtidos: ${allData.items?.items?.length || 0}`);

    console.log('\n👤 PERFIL:');
    console.log(`   Nickname: ${allData.user?.nickname || 'N/A'}`);
    console.log(`   Empresa: ${allData.user?.company?.brand_name || 'N/A'}`);
    console.log(`   Email: ${allData.user?.email || 'N/A'}`);

    console.log('\n📍 ENDEREÇOS:');
    console.log(`   Total de endereços: ${allData.addresses?.length || 0}`);

    console.log('\n🛒 PEDIDOS:');
    console.log(`   Total de pedidos: ${allData.orders?.data?.length || 0}`);

    console.log('\n💬 PERGUNTAS:');
    console.log(`   Total de perguntas: ${allData.questions?.data?.length || 0}`);

    console.log('\n📁 CATEGORIAS:');
    console.log(`   Total de categorias: ${allData.categories?.length || 0}`);

    console.log('\n🌐 SITES:');
    console.log(`   Total de sites ML: ${allData.sites?.length || 0}`);

    console.log('\n💰 MOEDAS:');
    console.log(`   Total de moedas: ${allData.currencies?.length || 0}`);

    console.log('\n📈 TENDÊNCIAS:');
    console.log(`   Sites com tendências: ${Object.keys(allData.trends || {}).length}`);

    console.log('\n' + '='.repeat(70));
    console.log('🎉 COLETA COMPLETA FINALIZADA!');
    console.log('='.repeat(70));
    console.log(`⏰ Fim: ${new Date().toISOString()}`);
    console.log(`📁 Arquivos salvos em: ./output/`);
    console.log('   • RELATIONAL_DATA.json - Todos os dados cruzados');
    console.log('   • all_items.json - Todos os itens');
    console.log('   • 00_summary.json - Resumo');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ ERRO NA COLETA:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar
runFullCollection();
