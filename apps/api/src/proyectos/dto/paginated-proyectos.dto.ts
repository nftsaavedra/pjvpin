import type { ProyectoDto } from "./proyecto.dto";

export interface PaginatedProyectos {
  items: ProyectoDto[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
