// src/api/pedidos.ts
//
// Funciones relacionadas con la gestión de pedidos de Pedidos360.
// La comunicación se realiza mediante ApiClient, que automáticamente
// obtiene el access token y agrega:
// Authorization: Bearer <token>

import type { ApiClient } from './client';

export type EstadoPedido =
  | 'CREADO'
  | 'ACEPTADO'
  | 'EN_PREPARACION'
  | 'DESPACHADO'
  | 'ENTREGADO'
  | 'CANCELADO';

export interface Pedido {
  id: string | number;
  clienteId: string;
  clienteNombre: string;
  estado: EstadoPedido;
  fechaCreacion: string;
  fechaActualizacion: string;
  total: number;
  productos: ProductoPedido[];
}

export interface ProductoPedido {
  productoId: string | number;
  nombre?: string;
  cantidad: number;
  precio?: number;
}

export interface CrearPedidoRequest {
  productos: {
    productoId: string | number;
    cantidad: number;
  }[];
}

export interface ActualizarEstadoPedidoRequest {
  estado: EstadoPedido;
}

interface PedidosResponse {
  items?: Pedido[];
  pedidos?: Pedido[];
  data?: Pedido[];
}

export function transicionesPermitidas(estado: EstadoPedido): EstadoPedido[] {
  switch (estado) {
    case 'CREADO':
      return ['ACEPTADO', 'CANCELADO'];
    case 'ACEPTADO':
      return ['EN_PREPARACION', 'CANCELADO'];
    case 'EN_PREPARACION':
      return ['DESPACHADO', 'CANCELADO'];
    case 'DESPACHADO':
      return ['ENTREGADO'];
    case 'ENTREGADO':
    case 'CANCELADO':
      return [];
  }
}

// -----------------------------------------------------
// LISTAR PEDIDOS
// -----------------------------------------------------

export async function listarPedidos(
  api: ApiClient,
): Promise<Pedido[]> {
  const response = await api.get<
    Pedido[] | PedidosResponse
  >('/pedidos');

  if (Array.isArray(response)) {
    return response;
  }

  if (response.items) {
    return response.items;
  }

  if (response.pedidos) {
    return response.pedidos;
  }

  if (response.data) {
    return response.data;
  }

  return [];
}

// -----------------------------------------------------
// OBTENER PEDIDO
// -----------------------------------------------------

export async function obtenerPedido(
  api: ApiClient,
  id: string | number,
): Promise<Pedido> {
  return api.get<Pedido>(
    `/pedidos/${encodeURIComponent(id)}`,
  );
}

// -----------------------------------------------------
// CREAR PEDIDO
// -----------------------------------------------------

export async function crearPedido(
  api: ApiClient,
  pedido: CrearPedidoRequest,
): Promise<Pedido> {
  return api.post<Pedido>(
    '/pedidos',
    pedido,
  );
}

// -----------------------------------------------------
// CAMBIAR ESTADO
// -----------------------------------------------------

export async function actualizarEstadoPedido(
  api: ApiClient,
  id: string | number,
  estado: EstadoPedido,
): Promise<Pedido> {
  const body: ActualizarEstadoPedidoRequest = {
    estado,
  };

  return api.put<Pedido>(
    `/pedidos/${encodeURIComponent(id)}/estado`,
    body,
  );
}

// -----------------------------------------------------
// CANCELAR PEDIDO
// -----------------------------------------------------

export async function cancelarPedido(
  api: ApiClient,
  id: string | number,
): Promise<Pedido> {
  return actualizarEstadoPedido(api, id, 'CANCELADO');
}