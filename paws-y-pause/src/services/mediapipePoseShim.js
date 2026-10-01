/* El paquete @mediapipe/pose se distribuye como script UMD y el bundler no logra
   resolverlo como módulo ESM. Solo lo usa el runtime BlazePose de MediaPipe;
   nuestra verificación se apoya en MoveNet, así que este reemplazo nunca se
   instancia. Existe únicamente para que el bundle se construya correctamente. */
export class Pose {
  constructor() {
    throw new Error('El detector de MediaPipe no está disponible en esta compilación.')
  }
}

export default { Pose }
