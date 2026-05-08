import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI;

async function run() {
  const client = new MongoClient(uri);
  try {
    console.log("Attempting to connect to:", uri.replace(/:[^@]+@/, ':****@'));
    await client.connect();
    console.log("✅ Successfully connected to MongoDB");
    const databasesList = await client.db().admin().listDatabases();
    console.log("Databases:");
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));
  } catch (e) {
    console.error("❌ Connection failed!");
    console.error(e);
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
