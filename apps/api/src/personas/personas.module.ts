import { Module } from "@nestjs/common";
import { PersonasController } from "./personas.controller";
import { PersonasService } from "./personas.service";
import { PersonasRepository } from "./personas.repository";

@Module({
  controllers: [PersonasController],
  providers: [PersonasService, PersonasRepository],
  exports: [PersonasRepository, PersonasService],
})
export class PersonasModule {}
