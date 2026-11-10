import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { RoleLabels, type UserRole } from '@rumbo/shared/contracts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Feedback';
import { Field, Input, Select } from '@/components/ui/Input';
import { Badge, Modal, PageHeader, Segmented, Toggle } from '@/components/ui/Misc';
import { api, errorMessage } from '@/lib/apiClient';
import { dateTime } from '@/lib/format';
import type { User } from '@/types/api';

const ROLE_COLOR: Record<UserRole, string> = { ADMIN: '#FF5A1F', REPARTIDOR: '#6366F1', CLIENTE: '#10B981' };

const createSchema = z.object({
  name: z.string().min(2, 'Nombre'),
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8').regex(/[A-Z]/, 'Una mayúscula').regex(/[a-z]/, 'Una minúscula').regex(/\d/, 'Un número'),
  role: z.enum(['CLIENTE', 'REPARTIDOR', 'ADMIN']),
});

export function UsuariosPage() {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<'' | UserRole>('');
  const [open, setOpen] = useState(false);
  const users = useQuery({ queryKey: ['usuarios', role], queryFn: () => api.get<User[]>('/usuarios', { params: { role: role || undefined } }).then((r) => r.data) });
  const form = useForm<z.infer<typeof createSchema>>({ resolver: zodResolver(createSchema), defaultValues: { role: 'REPARTIDOR' } });

  const create = useMutation({
    mutationFn: (body: z.infer<typeof createSchema>) => api.post<User>('/usuarios', body).then((r) => r.data),
    onSuccess: (user) => {
      toast.success(user.role === 'REPARTIDOR' ? `${user.name} se agregó a la flota (vía evento)` : 'Usuario creado');
      setOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['asignacion', 'flota'] }), 1500);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.patch(`/usuarios/${id}`, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Usuarios"
        subtitle="Al crear un repartidor, el servicio de identidad publica un evento y el de despacho lo da de alta en la flota."
        actions={
          <Button onClick={() => setOpen(true)}>
            <UserPlus className="h-4 w-4" /> Nuevo usuario
          </Button>
        }
      />
      <div className="mb-4">
        <Segmented
          value={role}
          onChange={setRole}
          options={[
            { value: '', label: 'Todos' },
            { value: 'CLIENTE', label: 'Clientes' },
            { value: 'REPARTIDOR', label: 'Repartidores' },
            { value: 'ADMIN', label: 'Admins' },
          ]}
        />
      </div>
      {users.isLoading ? (
        <PageLoader />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-900 text-[11px] font-bold uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Verificado</th>
                <th className="px-4 py-3">Último acceso</th>
                <th className="px-4 py-3">Activo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {users.data?.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-semibold text-slate-100">{user.name}</td>
                  <td className="px-4 py-3 text-slate-400">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge color={ROLE_COLOR[user.role]}>{RoleLabels[user.role]}</Badge>
                  </td>
                  <td className="px-4 py-3">{user.emailVerified ? '✓' : '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{dateTime(user.lastLoginAt)}</td>
                  <td className="px-4 py-3">
                    <Toggle checked={user.active} onChange={(active) => toggle.mutate({ id: user.id, active })} label="Activo" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo usuario">
        <form className="space-y-4" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
          <Field label="Nombre" error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} />
          </Field>
          <Field label="Correo" error={form.formState.errors.email?.message} hint="Tip: appprueba695+nombre@gmail.com llega a la misma bandeja">
            <Input type="email" {...form.register('email')} />
          </Field>
          <Field label="Contraseña" error={form.formState.errors.password?.message}>
            <Input type="password" {...form.register('password')} />
          </Field>
          <Field label="Rol">
            <Select {...form.register('role')}>
              <option value="REPARTIDOR">Repartidor</option>
              <option value="CLIENTE">Cliente</option>
              <option value="ADMIN">Administrador</option>
            </Select>
          </Field>
          <Button type="submit" className="w-full" loading={create.isPending}>
            Crear
          </Button>
        </form>
      </Modal>
    </div>
  );
}
