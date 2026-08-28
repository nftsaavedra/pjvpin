import { Body, Controller, Get, HttpCode, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginRequest } from "./dto/login.request";
import type { AuthResponse, AuthStatusDto, UsuarioDto } from "./dto/auth.response";
import { BootstrapUsuarioRequest, BootstrapReniecDniRequest } from "./dto/bootstrap.request";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../rbac/current-user.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get("status")
  async status(): Promise<AuthStatusDto> {
    return this.auth.getAuthStatus();
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  async login(@Body() body: LoginRequest): Promise<AuthResponse> {
    return this.auth.login(body.username, body.password);
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Body() body: { refreshToken: string },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.auth.refresh(body.refreshToken);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(): Promise<{ ok: true }> {
    return this.auth.logout();
  }

  @Get("session")
  @UseGuards(JwtAuthGuard)
  async session(@CurrentUser() user: AuthenticatedUser): Promise<UsuarioDto | null> {
    return this.auth.session(user);
  }

  @Post("bootstrap")
  @HttpCode(201)
  async bootstrap(@Body() body: BootstrapUsuarioRequest): Promise<UsuarioDto> {
    return this.auth.bootstrap(
      body.username,
      body.password,
      body.dni,
      body.nombres,
      body.apellidoPaterno,
      body.apellidoMaterno,
    );
  }

  @Post("bootstrap/reniec-dni")
  @HttpCode(200)
  async bootstrapReniecDni(@Body() body: BootstrapReniecDniRequest) {
    return this.auth.bootstrapReniecDni(body.numero);
  }
}
