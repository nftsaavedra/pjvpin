export const auth = {
  ingreseCredenciales: "Ingrese usuario y contraseña",
  bienvenido: (nombre: string) => `Bienvenido ${nombre}`,
  fallbackUsuario: "usuario",
} as const;

export type AuthMessageKey = keyof typeof auth;
