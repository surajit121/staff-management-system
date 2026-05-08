import dns from 'node:dns/promises';

async function testDns() {
  try {
    const srv = await dns.resolveSrv('_mongodb._tcp.cluster0.75ezpdo.mongodb.net');
    console.log('✅ SRV resolved:', srv);
  } catch (error) {
    console.error('❌ SRV resolution failed:', error);
  }
}

testDns();
