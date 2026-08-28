import { Module, Provider } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongoClient, Db } from "mongodb";
import { MONGO_APP_NAME } from "../../config/defaults";

export const MONGO_DB = Symbol("MONGO_DB");

const mongoProvider: Provider = {
  provide: MONGO_DB,
  inject: [ConfigService],
  useFactory: async (config: ConfigService): Promise<Db> => {
    const uri = config.getOrThrow<string>("PJVPIN_MONGODB_URI");
    const dbName = config.getOrThrow<string>("PJVPIN_MONGODB_DB");
    const client = new MongoClient(uri, { appName: MONGO_APP_NAME });
    await client.connect();
    return client.db(dbName);
  },
};

@Module({
  imports: [ConfigModule],
  providers: [mongoProvider],
  exports: [MONGO_DB],
})
export class MongoModule {}
