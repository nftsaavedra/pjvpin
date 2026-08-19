export const wizard = {
  asistente: "Asistente de configuración inicial",
  bienvenida: {
    titulo: "Configura tu instalación de PJVPI",
    subtitulo:
      "En cinco pasos conectarás la base de datos y crearás el primer usuario del sistema.",
    comenzar: "Comenzar",
    tiempoEstimado: "Tiempo estimado: 3 minutos",
  },
  passwordRequisitosTitle: "Requisitos",
  passwordRequisitos: {
    longitud: "Al menos 8 caracteres",
    mayuscula: "Una mayúscula",
    minuscula: "Una minúscula",
    digito: "Un dígito",
    especial: "Un carácter especial",
  } as const,
  passwordNoCoinciden: "Las contraseñas no coinciden",
  uriMongoInvalida: "La URI debe comenzar con mongodb:// o mongodb+srv://",
  noConfigurado: "No configurado",
  noRegistrado: "No registrado",
  porDefecto: "Por defecto",
  stepMeta: {
    seguridad: "Seguridad",
    servicios: "Servicios",
    conexion: "Conexión",
    usuario: "Usuario",
    resumen: "Resumen",
  } as const,
  stepTitle: {
    password: "Define la contraseña maestra",
    credentials: "Conecta los servicios",
    connectivity: "Verifica la conectividad",
    admin: "Crea el primer usuario",
    summary: "Revisa y guarda",
  } as const,
  stepDesc: {
    password:
      "Esta clave protege las credenciales del sistema. Se pedirá cada vez que cambies la configuración.",
    credentials:
      "MongoDB es obligatorio. RENIEC, RENACYT y Pure son opcionales: puedes configurarlos después.",
    connectivity:
      "Probamos cada servicio configurado. Los opcionales omitidos no bloquean el avance.",
    admin:
      "El superuser es el único administrador inicial del sistema. Su identidad queda registrada por DNI.",
    summary:
      "Última vista antes de guardar la configuración. Los datos sensibles se muestran enmascarados.",
  } as const,
  labelPasswordMaestra: "Contraseña maestra",
  placeholderPasswordMaestra: "Mínimo 8 caracteres",
  labelConfirmarPasswordMaestra: "Confirmar contraseña maestra",
  placeholderConfirmarPasswordMaestra: "Repite la contraseña",
  probando: "Probando…",
  reintentando: "Reintentando…",
  sinTokenConfigurado: "Sin token. Puedes configurarlo después.",
  sinUrlConfigurada: "Sin URL. Puedes configurarla después.",
  sinApiKeyConfigurada: "Sin API key. Puedes configurarla después.",
  atras: "Atrás",
  continuar: "Continuar",
  reniecNoConfiguradoInfo:
    "RENIEC no está configurado. El DNI queda registrado para trazabilidad. Configura el token después desde Configuración si necesitas verificar identidades automáticamente.",
  validarDniInfo: "Valida el DNI con RENIEC para autocompletar los datos.",
  rolSuperuserInfo:
    "Rol superuser — único en el sistema, no eliminable. La identidad queda registrada por DNI.",
  creando: "Creando…",
  crearSuperuser: "Crear superuser",
  guardando: "Guardando…",
  guardarConfiguracion: "Guardar configuración e iniciar",
  configGuardadaExito: "Configuración guardada correctamente",
  helpIdentidad: {
    reniec: "Datos autocompletados desde RENIEC. Para modificar, reingresa el DNI.",
    sinReniec:
      "RENIEC no está disponible. Ingresa los nombres manualmente. El DNI garantiza trazabilidad.",
  } as const,
  helpDniField: {
    reniecDisponible:
      "Ingresa el DNI del superuser. Se validará contra RENIEC para autocompletar nombres y apellidos.",
    sinReniec:
      "Ingresa el DNI del superuser. RENIEC no está configurado: el nombre se ingresa manualmente.",
  } as const,
  formHelp: {
    mongoUri: "URI de conexión a tu cluster MongoDB. Debe comenzar con mongodb:// o mongodb+srv://",
    reniecToken:
      "Token para consulta de DNI vía RENIEC. Si no lo tienes, déjalo vacío. Las consultas se harán manualmente.",
    renacytUrl: "API de RENACYT para consulta de investigadores.",
    pureKey: "API key de Pure (Elsevier) para sincronización de publicaciones.",
    pureUrl: "URL base de la API de Pure (Elsevier).",
  } as const,
  optionalSection: {
    title: "Servicios opcionales",
    descripcion:
      "Puedes dejarlos vacíos y configurarlos después desde Configuración. No bloquean el asistente.",
  },
  requiredSection: {
    title: "Obligatorio",
    descripcion: "Necesario para iniciar la aplicación.",
  },
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
      label: "Información sobre contraseña maestra",
      content:
        "Clave de protección de credenciales. Se validará como requisito de seguridad y se usará para cifrar la configuración en disco en una versión futura.",
    },
    credenciales: {
      label: "Información sobre credenciales",
      content:
        "Configura los servicios que PJVPI necesita para funcionar. Los servicios marcados como obligatorios no pueden quedar vacíos.",
    },
    serviciosOpcionales: {
      label: "Información sobre servicios opcionales",
      content:
        "Solo MongoDB es obligatorio. RENIEC, RENACYT y Pure son opcionales: puedes continuar aunque fallen y configurarlos después.",
    },
    superuser: {
      label: "Información sobre superuser",
      content:
        "Primer usuario del sistema con máximo nivel de acceso. Podrá gestionar usuarios, configurar servicios externos y administrar el sistema completo. Único en el sistema: no se puede eliminar desde la interfaz.",
    },
    guardado: {
      label: "Información sobre guardado",
      content:
        "Revisa los datos antes de guardar. La configuración se guardará en disco. Protege el archivo con permisos de usuario.",
    },
    acceso: {
      label: "Información de acceso",
      content: "Ingresa tus credenciales para utilizar el sistema.",
    },
  } as const,
} as const;

export type WizardMessageKey = keyof typeof wizard;
