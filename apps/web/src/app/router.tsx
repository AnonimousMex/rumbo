import { createBrowserRouter } from 'react-router-dom';
import { MobileLayout, PanelLayout, RequireRole, RootRedirect } from '@/components/layout/RoleLayouts';
import { AsignacionPage } from '@/features/asignacion/pages/AsignacionPage';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage, VerifyEmailPage } from '@/features/auth/pages/AuthPages';
import { FlotaPage } from '@/features/configuracion/pages/FlotaPage';
import { MediosPage } from '@/features/configuracion/pages/MediosPage';
import { SistemaPage } from '@/features/configuracion/pages/SistemaPage';
import { UsuariosPage } from '@/features/configuracion/pages/UsuariosPage';
import { DashboardPage } from '@/features/estadisticas/pages/DashboardPage';
import { ClienteInicioPage } from '@/features/pedidos/pages/ClienteInicioPage';
import { MisPedidosPage } from '@/features/pedidos/pages/MisPedidosPage';
import { NuevoPedidoPage } from '@/features/pedidos/pages/NuevoPedidoPage';
import { PanelPedidosPage } from '@/features/pedidos/pages/PanelPedidosPage';
import { PedidoDetallePage } from '@/features/pedidos/pages/PedidoDetallePage';
import { RepartidorHistorialPage, RepartidorInicioPage } from '@/features/repartidor/pages/RepartidorPages';
import { MapaEnVivoPage } from '@/features/seguimiento/pages/MapaEnVivoPage';
import { MisTarjetasPage } from '@/features/pagos/pages/MisTarjetasPage';
import { SimulacionPage } from '@/features/simulacion/pages/SimulacionPage';
import { ExplicacionCromosomaPage } from '@/features/simulacion/pages/ExplicacionCromosomaPage';

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/registro', element: <RegisterPage /> },
  { path: '/verificar', element: <VerifyEmailPage /> },
  { path: '/olvide', element: <ForgotPasswordPage /> },
  { path: '/restablecer', element: <ResetPasswordPage /> },
  {
    element: <RequireRole role="CLIENTE" />,
    children: [
      {
        path: '/app',
        element: <MobileLayout variant="cliente" />,
        children: [
          { index: true, element: <ClienteInicioPage /> },
          { path: 'nuevo', element: <NuevoPedidoPage /> },
          { path: 'pedidos', element: <MisPedidosPage /> },
          { path: 'pedidos/:folio', element: <PedidoDetallePage backTo="/app/pedidos" /> },
          { path: 'tarjetas', element: <MisTarjetasPage /> },
        ],
      },
    ],
  },
  {
    element: <RequireRole role="REPARTIDOR" />,
    children: [
      {
        path: '/repartidor',
        element: <MobileLayout variant="repartidor" />,
        children: [
          { index: true, element: <RepartidorInicioPage /> },
          { path: 'historial', element: <RepartidorHistorialPage /> },
          { path: 'entregas/:folio', element: <PedidoDetallePage backTo="/repartidor" /> },
        ],
      },
    ],
  },
  {
    element: <RequireRole role="ADMIN" />,
    children: [
      {
        path: '/panel',
        element: <PanelLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'pedidos', element: <PanelPedidosPage /> },
          { path: 'pedidos/:folio', element: <PedidoDetallePage backTo="/panel/pedidos" /> },
          { path: 'asignacion', element: <AsignacionPage /> },
          { path: 'mapa', element: <MapaEnVivoPage /> },
          { path: 'simulacion', element: <SimulacionPage /> },
          { path: 'simulacion/explicacion', element: <ExplicacionCromosomaPage /> },
          { path: 'flota', element: <FlotaPage /> },
          { path: 'medios', element: <MediosPage /> },
          { path: 'usuarios', element: <UsuariosPage /> },
          { path: 'sistema', element: <SistemaPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <RootRedirect /> },
]);
