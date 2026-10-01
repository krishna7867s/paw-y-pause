# Paws & Pause — C&R International

Aplicación web de bienestar corporativo: cada dos horas el empleado recibe una
actividad corta (estiramientos, sentadillas, círculos de hombros, inclinación
lateral, marcha y estiramiento de espalda), la verifica con la cámara de su
propio dispositivo tomando una foto de prueba, y con esa prueba su mascota se
alimenta o se duerme, sube de nivel y aprende su nombre.

## Cómo se ejecuta

```bash
npm install
npm run dev        # API (3001) + Vite (5173) a la vez
npm run verify     # pruebas de los puntos críticos
npm run lint       # ESLint
npm run build      # build de producción
```

Cuentas de demostración (contraseña `PawsPause2026!`):

| Rol | Correo |
| --- | --- |
| Empleado | `usuario@pawsypause.local` |
| Administrador | `admin@pawsypause.local` |

## Rutas

| Ruta | Pantalla |
| --- | --- |
| `/` | **Página principal**: información de C&R International (quiénes somos, proyectos, contacto y acceso). Se puede ver con sesión abierta o sin ella. |
| `/login`, `/register` | Acceso y alta de cuenta. Ambas tienen arriba el enlace de vuelta a la portada. |
| `/inicio` | Módulo del empleado: mascota, niveles, alertas y cámara. |
| `/pomodoro`, `/minijuego` | Pausas con música y minijuego. |
| `/admin` | Panel de administración. |
| `*` | Cualquier ruta desconocida vuelve a la portada. |

## Estructura del proyecto

```
paws-y-pause/
├── public/                  recursos estáticos (fotos de la empresa, del juego, vídeos)
├── scripts/verify.mjs       pruebas sin dependencias: rutas, roles y aislamiento
├── server/index.js          API Express: sesión, MFA, roles, consentimiento,
│                            alertas, estado de la mascota, niveles y recompensas
└── src/
    ├── main.jsx             punto de entrada: estilos globales y providers
    ├── app/                 núcleo de la aplicación
    │   ├── App.jsx          mapa de rutas
    │   └── routes/          guards por rol y destino según el rol
    ├── pages/               una carpeta por pantalla (páginas completas)
    ├── features/            la aplicación agrupada por funcionalidad
    │   ├── game/            la mascota: escenario, HUD, niveles, nombre
    │   ├── pauses/          ciclo de 2 h, alertas, verificación con cámara,
    │   │                    consentimiento y reproducción lo-fi
    │   ├── pets/            gestión de mascotas del panel
    │   ├── corporate/       login y lector de voz de la página institucional
    │   ├── dashboard/       panel de administración
    │   ├── layout/          carcasa: header, menú lateral y botón de volver
    │   └── voice/           asistente de voz
    ├── shared/ui/           componentes genéricos (Button, FormField, Icon)
    ├── context/             contextos de React (auth, tema, fuente, lo-fi)
    ├── services/            toda la comunicación con el servidor
    │   ├── exercises.js     catálogo de actividades y sus evaluadores
    │   ├── poseService.js   detección de pose local (TensorFlow.js + MoveNet)
    │   ├── reminderService.js  ciclo de 2 h, rotación y cuenta regresiva
    │   ├── levels.js        barra de progreso por niveles
    │   └── gameService.js   estado de la mascota, recompensas y nombre
    └── styles/              estilos globales (tema, base y carcasa)
```

## Cómo funciona el ciclo de pausa

1. `ActivityReminder` programa el siguiente aviso (cada 2 h; el primero llega
   pronto para poder probarlo) y guarda la hora en `localStorage`, de modo que
   recargar no reinicia el reloj.
2. La actividad se elige por turnos: siempre es distinta a la anterior.
3. Se enciende la cámara con consentimiento. La IA (MoveNet, en el navegador)
   detecta la postura y, cuando la reconoce, **la persona toma la foto**.
4. La foto se queda en el dispositivo: al servidor solo llega el método
   (`camera` o `manual`) y el efecto sobre la mascota.
5. El servidor suma XP (+20 con cámara, +10 a mano) y devuelve la barra de
   nivel. La mascota se alimenta de día y se duerme de noche.

Siempre están disponibles el registro manual y el aplazamiento sin castigo.
