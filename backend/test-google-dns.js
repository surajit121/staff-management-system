import { Resolver } from 'node:dns/promises';

async function testGoogleDns() {
  const resolver = new Resolver();
  resolver.setServers(['8.8.8.8', '8.8.4.4']);
  
  try {
    const srv = await resolver.resolveSrv('_mongodb._tcp.cluster0.75ezpdo.mongodb.net');
    console.log('✅ Google SRV resolved:', srv);
  } catch (error) {
    console.error('❌ Google SRV resolution failed:', error);
  }
}

testGoogleDns();
