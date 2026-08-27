// Mirror de UbigeoDto (geo/dto.rs). Snake case porque el DTO de salida
// usa snake_case consistente con el resto de features.
export interface Ubigeo {
  codigo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  updated_at?: number | null;
}
