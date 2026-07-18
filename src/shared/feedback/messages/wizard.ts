export const wizard = {
  asistente: "Asistente de configuracion inicial",
  passwordRequisitosTitle: "Requisitos:",
  passwordRequisitos: {
    longitud: "Al menos 8 caracteres",
    mayuscula: "Al menos una mayuscula",
    minuscula: "Al menos una minuscula",
    digito: "Al menos un digito",
    especial: "Al menos un caracter especial",
  } as const,
  passwordNoCoinciden: "Las contraseñas no coinciden",
  uriMongoInvalida: "La URI debe comenzar con mongodb:// o mongodb+srv://",
  noConfigurado: "(no configurado)",
  noRegistrado: "(no registrado)",
  porDefecto: "Por defecto",
  stepMeta: {
    seguridad: "Seguridad",
    servicios: "Servicios",
    conexion: "Conexion",
    usuario: "Usuario",
    resumen: "Resumen",
  } as const,
  probando: "Probando...",
  sinTokenConfigurado: "Sin token configurado (opcional)",
  sinUrlConfigurada: "Sin URL configurada (opcional)",
  sinApiKeyConfigurada: "Sin API key configurada (opcional)",
  atras: "Atras",
  continuar: "Continuar",
  reniecNoConfiguradoInfo:
    "RENIEC no esta configurado. El DNI queda registrado para trazabilidad. Configure el token RENIEC despues desde Configuracion si requiere verificar identidades automaticamente.",
  validarDniInfo: "Valide el DNI con RENIEC para autocompletar los datos y poder continuar.",
  rolSuperuserInfo:
    "Rol superuser — unico en el sistema, no eliminable. Identidad registrada por DNI.",
  creando: "Creando...",
  crearSuperuser: "Crear superuser",
  guardando: "Guardando...",
  guardarConfiguracion: "Guardar configuracion e iniciar",
  configGuardadaExito: "Configuracion guardada correctamente",
  helpIdentidad: {
    reniec: "Datos autocompletados desde RENIEC. Para modificar, reingrese el DNI.",
    sinReniec:
      "RENIEC no esta disponible. Ingrese los nombres manualmente; el DNI garantiza trazabilidad.",
  } as const,
  helpDniField: {
    reniecDisponible:
      "Ingrese el DNI del superuser. Se validara contra RENIEC para autocompletar nombres y apellidos.",
    sinReniec:
      "Ingrese el DNI del superuser. RENIEC no esta configurado: el nombre se ingresara manualmente.",
  } as const,
  formHelp: {
    mongoUri: "URI de conexion a su cluster MongoDB. Debe comenzar con mongodb:// o mongodb+srv://",
    reniecToken:
      "Token para consulta de DNI via RENIEC. Si no lo tiene, deje vacio. Las consultas DNI se realizaran manualmente.",
    renacytUrl: "API de RENACYT para consulta de investigadores.",
    pureKey: "API key de Pure (Elsevier) para sincronizacion de publicaciones.",
  } as const,
  summaryLabels: {
    mongoUri: "MongoDB URI",
    baseDatos: "Base de datos",
    reniec: "RENIEC",
    renacyt: "RENACYT",
    pureApiKey: "Pure API Key",
    username: "Username",
    dni: "DNI",
    nombre: "Nombre",
    rol: "Rol",
    seccionBaseDatos: "Base de datos",
    seccionServicios: "Servicios externos",
    seccionSuperuser: "Usuario superuser",
  } as const,
  help: {
    password: {
      label: "Informacion sobre contraseña maestra",
      content:
        "Clave de proteccion de credenciales. Se valida como requisito de seguridad y se usara para cifrar la configuracion en disco en una version futura.",
    },
    credenciales: {
      label: "Informacion sobre credenciales",
      content:
        "Configure los servicios que PJVPI necesita para funcionar. Los servicios marcados con * son obligatorios.",
    },
    serviciosOpcionales: {
      label: "Informacion sobre servicios opcionales",
      content:
        "Solo MongoDB es obligatorio. RENIEC, RENACYT y Pure son opcionales: puede continuar aunque fallen y configurarlos despues desde Configuracion.",
    },
    superuser: {
      label: "Informacion sobre superuser",
      content:
        "Primer usuario del sistema con maximo nivel de acceso. Podra gestionar usuarios, configurar servicios externos y administrar el sistema completo. Unico en el sistema: no se puede eliminar desde la interfaz.",
    },
    guardado: {
      label: "Informacion sobre guardado",
      content:
        "Revise los datos antes de guardar. La configuracion se guardara en disco. Proteja el archivo con permisos de usuario.",
    },
    acceso: {
      label: "Informacion de acceso",
      content: "Ingrese sus credenciales para utilizar el sistema.",
    },
  } as const,
} as const;

export type WizardMessageKey = keyof typeof wizard;
