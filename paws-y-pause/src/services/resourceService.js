import { httpClient } from './httpClient.js'

export function createResourceService(resource) {
  return {
    list: () => httpClient.get(`/${resource}`),
    getById: (id) => httpClient.get(`/${resource}/${id}`),
    create: (data) => httpClient.post(`/${resource}`, data),
    update: (id, data) => httpClient.put(`/${resource}/${id}`, data),
    remove: (id) => httpClient.delete(`/${resource}/${id}`),
  }
}
