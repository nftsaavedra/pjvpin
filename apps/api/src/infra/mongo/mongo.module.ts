import { Module, Provider } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongoClient, Db } from "mongodb";
import { MONGO_APP_NAME } from "../../config/defaults";

export const MONGO_CLIENT = Symbol("MONGO_CLIENT");
export const MONGO_DB = Symbol("MONGO_DB");

const mongoClientProvider: Provider = {
  provide: MONGO_CLIENT,
  inject: [ConfigService],
  useFactory: async (config: ConfigService): Promise<MongoClient> => {
    const uri = config.getOrThrow<string>("PJVPIN_MONGODB_URI");
    const client = new MongoClient(uri, { appName: MONGO_APP_NAME });
    await client.connect();
    return client;
  },
};

const mongoDbProvider: Provider = {
  provide: MONGO_DB,
  inject: [MONGO_CLIENT, ConfigService],
  useFactory: async (client: MongoClient, config: ConfigService): Promise<Db> => {
    const dbName = config.getOrThrow<string>("PJVPIN_MONGODB_DB");
    return client.db(dbName);
  },
};

@Module({
  imports: [ConfigModule],
  providers: [mongoClientProvider, mongoDbProvider],
  exports: [MONGO_CLIENT, MONGO_DB],
})
export class MongoModule {}
