import { createResourceService } from './resourceService.js'

const usersResource = createResourceService('users')

/* Rol requerido: Admin para crear, actualizar y desactivar cuentas. */
export const usersApi = {
  list: usersResource.list,
  create: (data) => usersResource.create(data),
  update: (id, data) => usersResource.update(id, data),
  remove: (id) => usersResource.remove(id),
}
