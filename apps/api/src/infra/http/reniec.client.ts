import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppError } from "../errors/app-error";
import { sanitizeExternalDetail } from "../utils/sanitize";
import { DEFAULT_RENIEC_API_BASE_URL } from "../../config/defaults";

export interface ReniecDniLookupResult {
  firstName: string;
  firstLastName: string;
  secondLastName: string;
  fullName: string;
  documentNumber: string;
}

interface DecolectaDniResponse {
  first_name?: string;
  first_last_name?: string;
  second_last_name?: string;
  full_name?: string;
  document_number?: string;
}

@Injectable()
export class ReniecClient {
  private readonly logger = new Logger(ReniecClient.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get<string>("PJVPIN_RENIEC_API_BASE_URL") ?? DEFAULT_RENIEC_API_BASE_URL;
  }

  /**
   * Consulta DNI en el servicio RENIEC del servidor. Usado por
   * `POST /auth/bootstrap/reniec-dni` (solo en contexto de bootstrap, mientras
   * la coleccion `usuarios` este vacia). En fases siguientes se usara desde
   * el modulo investigadores para renovacion masiva.
   */
  async consultar(numero: string): Promise<ReniecDniLookupResult> {
    const token = this.config.get<string>("PJVPIN_RENIEC_TOKEN");
    if (!token) {
      throw AppError.config("Falta configurar PJVPIN_RENIEC_TOKEN en el servidor.");
    }
    if (!/^\d{8}$/.test(numero)) {
      throw AppError.validation("DNI invalido: debe tener 8 digitos.");
    }
    const url = `${this.baseUrl}/reniec/dni?numero=${encodeURIComponent(numero)}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
    } catch (err) {
      this.logger.error(
        `Error RENIEC: ${sanitizeExternalDetail(err instanceof Error ? err.message : String(err))}`,
      );
      throw AppError.external("No se pudo consultar RENIEC. Verifique conectividad del servidor.");
    }
    if (res.status === 404) {
      throw AppError.notFound("No se encontraron datos para el DNI proporcionado.");
    }
    if (!res.ok) {
      throw AppError.external(`RENIEC respondio ${res.status}. Reintente en unos segundos.`);
    }
    const raw = (await res.json()) as DecolectaDniResponse;
    const firstName = (raw.first_name ?? "").trim();
    const firstLastName = (raw.first_last_name ?? "").trim();
    const secondLastName = (raw.second_last_name ?? "").trim();
    const fullName = (raw.full_name ?? `${firstName} ${firstLastName} ${secondLastName}`).trim();
    const documentNumber = (raw.document_number ?? numero).trim();
    return {
      firstName,
      firstLastName,
      secondLastName,
      fullName,
      documentNumber,
    };
  }
}
